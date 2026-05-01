import React, { useCallback, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	KeyboardAvoidingView,
	Platform,
	SafeAreaView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CameraScreen from './Camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { API_BASE_URL } from './config';
import { COLORS, SHADOW, SHADOW_SM, SHADOW_LG } from './utils/platformStyles';

const C = COLORS;

// ─── Pure logic (unchanged) ──────────────────────────────────────────────────

const toNumber = (value, fallback = 0) => {
	if (value === null || value === undefined) return fallback;
	const parsed = Number(String(value).replace(',', '.').trim());
	return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const LITER_AMOUNT_REGEX = /(\d+(?:[.,]\d+)?)\s*(l|lt|ltr|litre|litres)\b/i;
const LITER_UNITS = new Set(['l', 'lt', 'ltr', 'litre', 'litres', 'liter', 'liters']);
const normalizeUnit = (value) => String(value || '').trim().toLowerCase();

const extractLiterAmount = (text) => {
	const match = String(text || '').match(LITER_AMOUNT_REGEX);
	if (!match) return null;
	return toNumber(match[1], 0);
};

const parseRawQuantity = (value) => {
	if (value === null || value === undefined) return 1;
	const raw = String(value).trim();
	if (!raw) return 1;
	const direct = toNumber(raw, Number.NaN);
	if (Number.isFinite(direct)) return direct;
	const liters = extractLiterAmount(raw);
	if (Number.isFinite(liters) && liters > 0) return liters;
	const anyNumber = raw.match(/(\d+(?:[.,]\d+)?)/);
	if (anyNumber?.[1]) return toNumber(anyNumber[1], 1);
	return 1;
};

const TRAILING_QUANTITY_REGEX = /^(.*?)\s+(\d+(?:[.,]\d+)?(?:\s*(?:l|lt|ltr|litre|litres))?)\s*$/i;

const extractQuantityFromDesignation = (designation) => {
	const rawDesignation = String(designation || '').trim();
	if (!rawDesignation) return null;
	const match = rawDesignation.match(TRAILING_QUANTITY_REGEX);
	if (!match) return null;
	const normalizedDesignation = String(match[1] || '').trim();
	const quantityText = String(match[2] || '').trim();
	if (!normalizedDesignation || !quantityText) return null;
	return { designation: normalizedDesignation, quantityText };
};

const extractLineLiters = (line) => {
	const literFromQuantityField = extractLiterAmount(line?.quantite);
	const literFromDesignation = extractLiterAmount(line?.designation);
	const literFromRemarque = extractLiterAmount(line?.remarque);
	const parsedQuantity = parseRawQuantity(line?.quantite);
	const unit = normalizeUnit(line?.unite || line?.unit || line?.uom || line?.unite_mesure);
	const hasLiterUnit = LITER_UNITS.has(unit);
	const liters = literFromQuantityField ?? literFromDesignation ?? literFromRemarque ?? (hasLiterUnit ? parsedQuantity : null);
	if (!Number.isFinite(liters) || liters <= 0) return null;
	return liters;
};

const convertLitersToCans = (liters, canSize) => {
	if (!Number.isFinite(liters) || liters <= 0) return null;
	if (!Number.isFinite(canSize) || canSize <= 0) return null;
	return Math.max(1, Math.ceil(liters / canSize));
};

const sanitizeLine = (line) => {
	const rawDesignation = String(line?.designation || '').trim();
	const rawQuantityText = String(line?.quantite ?? '').trim();
	const extractedFromDesignation = extractQuantityFromDesignation(rawDesignation);
	const shouldUseExtractedQuantity = Boolean(
		extractedFromDesignation && (!rawQuantityText || parseRawQuantity(rawQuantityText) === 1)
	);
	const normalizedDesignation = shouldUseExtractedQuantity
		? extractedFromDesignation.designation
		: rawDesignation;
	const quantitySource = shouldUseExtractedQuantity
		? extractedFromDesignation.quantityText
		: line?.quantite;
	const parsedQuantity = parseRawQuantity(quantitySource);
	const quantite = clamp(parsedQuantity, 0, 10000);
	const prix = clamp(toNumber(line?.prix_unitaire_ht, 0), 0, 1000000);
	const total = Number((quantite * prix).toFixed(2));
	const confiance = Math.max(0, Math.min(1, toNumber(line?.confiance, 0.7)));
	return {
		produit_id: line?.produit_id ? String(line.produit_id) : '',
		designation: normalizedDesignation,
		quantite,
		prix_unitaire_ht: Number(prix.toFixed(2)),
		total_ht: total,
		confiance: Number(confiance.toFixed(2)),
		remarque: line?.remarque ? String(line.remarque) : null,
	};
};

const recalcLine = (line) => {
	const quantite = clamp(toNumber(line.quantite, 0), 0, 10000);
	const prix = clamp(toNumber(line.prix_unitaire_ht, 0), 0, 1000000);
	return { ...line, quantite, prix_unitaire_ht: Number(prix.toFixed(2)), total_ht: Number((quantite * prix).toFixed(2)) };
};

// ─── UI Components ────────────────────────────────────────────────────────────

const MODES = [
	{ key: 'text', label: 'Texte', icon: 'clipboard-outline' },
	{ key: 'pdf', label: 'Document', icon: 'document-outline' },
	{ key: 'camera', label: 'Photo', icon: 'camera-outline' },
];

function ConfidenceBadge({ confiance }) {
	const isHigh = confiance >= 0.7;
	return (
		<View style={[cb.wrap, isHigh ? cb.wrapOk : cb.wrapWarn]}>
			<Ionicons
				name={isHigh ? 'checkmark-circle' : 'help-circle'}
				size={13}
				color={isHigh ? C.success : C.warning}
			/>
			<Text style={[cb.txt, isHigh ? cb.txtOk : cb.txtWarn]}>
				{Math.round(confiance * 100)}%
			</Text>
		</View>
	);
}

const cb = StyleSheet.create({
	wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
	wrapOk: { backgroundColor: C.successLight },
	wrapWarn: { backgroundColor: C.warningLight },
	txt: { fontSize: 11, fontWeight: '700' },
	txtOk: { color: C.success },
	txtWarn: { color: C.warning },
});

function FieldLabel({ children }) {
	return <Text style={fl.txt}>{children}</Text>;
}
const fl = StyleSheet.create({ txt: { color: C.textMid, fontSize: 12, fontWeight: '600', marginBottom: 5 } });

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SmartPasteScreen({ onInsert, onClose }) {
	const [mode, setMode] = useState('text');
	const [rawText, setRawText] = useState('');
	const [pickedFile, setPickedFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [inserting, setInserting] = useState(false);
	const [error, setError] = useState(null);
	const [pendingLines, setPendingLines] = useState([]);
	const [lines, setLines] = useState([]);
	const insets = useSafeAreaInsets();

	const totalHT = useMemo(() => lines.reduce((sum, l) => sum + toNumber(l.total_ht, 0), 0), [lines]);
	const totalTTC = totalHT * 1.2;
	const totalDetectedCount = pendingLines.length + lines.length;
	const acceptedCount = lines.length;
	const pendingCount = pendingLines.length;

	const parseApiData = useCallback((data) => {
		if (Array.isArray(data)) return data;
		if (typeof data === 'string') {
			try { const parsed = JSON.parse(data); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
		}
		return [];
	}, []);

	const callParseApi = useCallback(async (payload) => {
		const token = await AsyncStorage.getItem('token');
		const response = await axios.post(`${API_BASE_URL}/parse-devis`, payload, {
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		});

		const parsed = parseApiData(response?.data);
		const sanitized = [];
		const sourceLines = [];

		parsed.forEach((rawLine) => {
			const cleanLine = sanitizeLine(rawLine);
			if (cleanLine.designation.length > 0 || cleanLine.remarque) {
				sanitized.push(cleanLine);
				sourceLines.push(rawLine);
			}
		});

		const hasLiterLines = sourceLines.some((line) => Number.isFinite(extractLineLiters(line)));
		let finalLines = sanitized;

		if (hasLiterLines) {
			const canSize = await new Promise((resolve) => {
				Alert.alert(
					'Conversion des litres',
					'Des lignes en litres ont été détectées. Choisissez la taille du bidon.',
					[
						{ text: '5L', onPress: () => resolve(5) },
						{ text: '1L', onPress: () => resolve(1) },
					],
					{ cancelable: false }
				);
			});

			finalLines = sanitized.map((line, index) => {
				const liters = extractLineLiters(sourceLines[index]);
				if (!Number.isFinite(liters)) return line;
				const quantite = clamp(convertLitersToCans(liters, canSize), 0, 10000);
				return recalcLine({ ...line, quantite });
			});
		}

		if (mode === 'text') {
			setLines(finalLines);
			setPendingLines([]);
		} else {
			setPendingLines(finalLines);
		}

		if (finalLines.length === 0) {
			setError('Aucune ligne exploitable détectée. Vérifiez le contenu ou le document.');
		}
	}, [mode, parseApiData]);

	const handleParseText = useCallback(async () => {
		const text = rawText.trim();
		if (!text) { setError('Collez un texte avant de lancer l\'analyse.'); return; }
		setLoading(true);
		setError(null);
		try { await callParseApi({ text }); }
		catch { setError('Échec de l\'analyse. Vérifiez votre connexion et réessayez.'); }
		finally { setLoading(false); }
	}, [rawText, callParseApi]);

	const normalizePickedMimeType = (asset) => {
		const directMime = String(asset?.mimeType || '').toLowerCase();
		if (directMime) {
			if (directMime === 'image/jpg') return 'image/jpeg';
			return directMime;
		}
		const fileName = String(asset?.name || '').toLowerCase();
		if (fileName.endsWith('.pdf')) return 'application/pdf';
		if (fileName.endsWith('.png')) return 'image/png';
		if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
		return '';
	};

	const prepareImageBase64 = useCallback(async (asset) => {
		const manipulated = await manipulateAsync(
			asset.uri,
			[{ resize: { width: 1600 } }],
			{ compress: 0.75, format: SaveFormat.JPEG, base64: true }
		);
		if (!manipulated?.base64) throw new Error('IMAGE_CONVERSION_FAILED');
		return { base64: manipulated.base64, mimeType: 'image/jpeg' };
	}, []);

	const handlePickDocument = useCallback(async () => {
		setError(null);
		const result = await DocumentPicker.getDocumentAsync({
			type: ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'],
			copyToCacheDirectory: true,
			multiple: false,
		});
		if (result.canceled || !result.assets?.length) return;
		setPickedFile(result.assets[0]);
	}, []);

	const handlePickFromGallery = useCallback(async () => {
		setError(null);
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permission.granted) { setError('Autorisez l\'accès à la galerie.'); return; }
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: false,
			quality: 1,
			base64: false,
		});
		if (result.canceled || !result.assets?.length) return;
		const asset = result.assets[0];
		setPickedFile({ uri: asset.uri, name: asset.fileName || 'image.jpg', mimeType: asset.mimeType || 'image/jpeg' });
	}, []);

	const handleChooseSource = useCallback(() => {
		Alert.alert('Source du document', 'Choisissez d\'où importer', [
			{ text: 'Annuler', style: 'cancel' },
			{ text: 'Galerie photos', onPress: handlePickFromGallery },
			{ text: 'Fichiers (PDF/image)', onPress: handlePickDocument },
		]);
	}, [handlePickFromGallery, handlePickDocument]);

	const handleParseDocument = useCallback(async () => {
		if (!pickedFile?.uri) { setError('Sélectionnez un fichier avant de lancer l\'analyse.'); return; }
		setLoading(true);
		setError(null);
		try {
			const mimeType = normalizePickedMimeType(pickedFile);
			if (!mimeType) { setError('Type de fichier non supporté. Utilisez PDF, JPG ou PNG.'); return; }
			if (mimeType === 'application/pdf') {
				const base64Content = await FileSystem.readAsStringAsync(pickedFile.uri, { encoding: FileSystem.EncodingType.Base64 });
				await callParseApi({ pdf_base64: base64Content, mime_type: mimeType });
			} else {
				const preparedImage = await prepareImageBase64(pickedFile);
				await callParseApi({ image_base64: preparedImage.base64, mime_type: preparedImage.mimeType });
			}
		} catch (e) {
			const message = e?.response?.data?.detail || e?.response?.data?.message || 'Impossible de traiter ce fichier.';
			setError(message);
		} finally {
			setLoading(false);
		}
	}, [pickedFile, callParseApi, prepareImageBase64]);

	const updateLine = useCallback((index, key, value) => {
		setLines((prev) => prev.map((line, i) => {
			if (i !== index) return line;
			if (key === 'designation') return { ...line, designation: value };
			if (key === 'quantite' || key === 'prix_unitaire_ht') {
				const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
				return recalcLine({ ...line, [key]: toNumber(normalized, 0) });
			}
			return line;
		}));
	}, []);

	const removeLine = useCallback((index) => {
		setLines((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const acceptPendingLine = useCallback((index) => {
		setPendingLines((prev) => {
			const next = [...prev];
			const [accepted] = next.splice(index, 1);
			if (accepted) setLines((current) => [...current, accepted]);
			return next;
		});
	}, []);

	const rejectPendingLine = useCallback((index) => {
		setPendingLines((prev) => prev.filter((_, i) => i !== index));
	}, []);

	const acceptAllPendingLines = useCallback(() => {
		setLines((current) => [...current, ...pendingLines]);
		setPendingLines([]);
	}, [pendingLines]);

	const normalizeLabel = useCallback((value) => String(value || '').trim().toLowerCase(), []);

	const upsertProductsFromLines = useCallback(async (finalLines) => {
		const token = await AsyncStorage.getItem('token');
		if (!token) throw new Error('NO_TOKEN');
		const headers = { Authorization: `Bearer ${token}` };
		const existingResponse = await axios.get(`${API_BASE_URL}/produits`, { headers });
		const existingProducts = Array.isArray(existingResponse?.data) ? existingResponse.data : [];
		const productsByLabel = new Map();
		existingProducts.forEach((product) => {
			const key = normalizeLabel(product?.libelle);
			if (key) productsByLabel.set(key, product);
		});
		for (const line of finalLines) {
			if (line?.produit_id) continue;
			const libelle = String(line.designation || '').trim();
			if (!libelle) continue;
			const key = normalizeLabel(libelle);
			if (productsByLabel.has(key)) continue;
			const payload = {
				libelle,
				description: line?.remarque ? String(line.remarque) : null,
				prix_unitaire: Number(toNumber(line.prix_unitaire_ht, 0).toFixed(2)),
				unite: 'unite',
			};
			const createdResponse = await axios.post(`${API_BASE_URL}/produits`, payload, { headers });
			const createdProduct = createdResponse?.data;
			if (createdProduct?.id) productsByLabel.set(key, createdProduct);
		}
		return finalLines.map((line) => {
			if (line?.produit_id) return { ...line, produit_id: String(line.produit_id) };
			const key = normalizeLabel(line.designation);
			const matched = productsByLabel.get(key);
			return { ...line, produit_id: matched?.id ? String(matched.id) : '' };
		});
	}, [normalizeLabel]);

	const handleInsert = useCallback(async () => {
		const finalLines = lines
			.map((line) => recalcLine({ ...line, designation: String(line.designation || '').trim() }))
			.filter((line) => line.designation.length > 0);
		if (finalLines.length === 0) { setError('Aucune ligne valide à insérer.'); return; }
		setInserting(true);
		setError(null);
		try {
			const linesWithProducts = await upsertProductsFromLines(finalLines);
			onInsert(linesWithProducts);
		} catch (e) {
			if (e?.message === 'NO_TOKEN' || e?.response?.status === 401) {
				Alert.alert('Session expirée', 'Reconnectez-vous et réessayez.');
				return;
			}
			Alert.alert('Erreur', e?.response?.data?.message || e?.message || 'Impossible d\'insérer les produits.');
		} finally {
			setInserting(false);
		}
	}, [lines, onInsert, upsertProductsFromLines]);

	const renderDeleteAction = useCallback((index) => (
		<TouchableOpacity style={s.swipeDelete} onPress={() => removeLine(index)}>
			<Ionicons name="trash-outline" size={20} color={C.white} />
			<Text style={s.swipeDeleteTxt}>Retirer</Text>
		</TouchableOpacity>
	), [removeLine]);

	const renderPendingItem = useCallback(({ item, index }) => (
		<View style={s.pendingCard}>
			<View style={s.pendingCardHeader}>
				<View style={s.pendingIndex}>
					<Text style={s.pendingIndexTxt}>{index + 1}</Text>
				</View>
				<Text style={s.pendingTitle} numberOfLines={2}>{item.designation}</Text>
				<ConfidenceBadge confiance={item.confiance} />
			</View>

			<View style={s.pendingMeta}>
				<View style={s.pendingMetaItem}>
					<Text style={s.pendingMetaLabel}>Qté</Text>
					<Text style={s.pendingMetaValue}>{item.quantite}</Text>
				</View>
				<View style={s.pendingMetaDivider} />
				<View style={s.pendingMetaItem}>
					<Text style={s.pendingMetaLabel}>Prix HT</Text>
					<Text style={s.pendingMetaValue}>{item.prix_unitaire_ht} MAD</Text>
				</View>
				<View style={s.pendingMetaDivider} />
				<View style={s.pendingMetaItem}>
					<Text style={s.pendingMetaLabel}>Total HT</Text>
					<Text style={[s.pendingMetaValue, { color: C.accent }]}>{item.total_ht.toFixed(2)}</Text>
				</View>
			</View>

			{!!item.remarque && (
				<View style={s.remarqueRow}>
					<Ionicons name="information-circle-outline" size={13} color={C.sub} />
					<Text style={s.remarqueTxt} numberOfLines={2}>{item.remarque}</Text>
				</View>
			)}

			<View style={s.pendingActions}>
				<TouchableOpacity style={s.rejectBtn} onPress={() => rejectPendingLine(index)}>
					<Ionicons name="close" size={16} color={C.danger} />
					<Text style={s.rejectBtnTxt}>Ignorer</Text>
				</TouchableOpacity>
				<TouchableOpacity style={s.acceptBtn} onPress={() => acceptPendingLine(index)}>
					<Ionicons name="checkmark" size={16} color={C.white} />
					<Text style={s.acceptBtnTxt}>Accepter</Text>
				</TouchableOpacity>
			</View>
		</View>
	), [acceptPendingLine, rejectPendingLine]);

	const renderItem = useCallback(({ item, index }) => (
		<Swipeable overshootRight={false} renderRightActions={() => renderDeleteAction(index)}>
			<View style={s.lineCard}>
				<View style={s.lineCardHeader}>
					<View style={s.lineIndex}>
						<Text style={s.lineIndexTxt}>{index + 1}</Text>
					</View>
					<ConfidenceBadge confiance={item.confiance} />
				</View>

				<View style={s.lineFieldWrap}>
					<FieldLabel>Désignation</FieldLabel>
					<TextInput
						style={s.input}
						value={item.designation}
						onChangeText={(value) => updateLine(index, 'designation', value)}
						placeholder="Nom du produit"
						placeholderTextColor={C.sub}
					/>
				</View>

				<View style={s.lineRow}>
					<View style={{ flex: 1 }}>
						<FieldLabel>Quantité</FieldLabel>
						<TextInput
							style={s.inputCompact}
							value={String(item.quantite)}
							onChangeText={(value) => updateLine(index, 'quantite', value)}
							keyboardType="decimal-pad"
							placeholder="0"
							placeholderTextColor={C.sub}
						/>
					</View>
					<View style={{ flex: 1.4 }}>
						<FieldLabel>Prix unitaire HT (MAD)</FieldLabel>
						<TextInput
							style={s.inputCompact}
							value={String(item.prix_unitaire_ht)}
							onChangeText={(value) => updateLine(index, 'prix_unitaire_ht', value)}
							keyboardType="decimal-pad"
							placeholder="0.00"
							placeholderTextColor={C.sub}
						/>
					</View>
				</View>

				<View style={s.lineTotalRow}>
					<Text style={s.lineTotalTxt}>Sous-total HT</Text>
					<Text style={s.lineTotalAmt}>{Number(item.total_ht || 0).toFixed(2)} MAD</Text>
				</View>

				{!!item.remarque && (
					<View style={s.remarqueRow}>
						<Ionicons name="information-circle-outline" size={13} color={C.sub} />
						<Text style={s.remarqueTxt} numberOfLines={2}>{item.remarque}</Text>
					</View>
				)}
			</View>
		</Swipeable>
	), [renderDeleteAction, updateLine]);

	return (
		<SafeAreaView style={s.safe}>
			<KeyboardAvoidingView
				style={s.flex}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
			>
				{/* ─── Header ─── */}
				<View style={[s.header, { paddingTop: Math.max(insets.top, 10) }]}>
					<View style={s.headerLeft}>
						<View style={s.headerIcon}>
							<Ionicons name="scan" size={20} color={C.accent} />
						</View>
						<View>
							<Text style={s.title}>Smart Paste</Text>
							<Text style={s.subtitle}>Importez des lignes automatiquement</Text>
						</View>
					</View>
					<TouchableOpacity style={s.closeBtn} onPress={onClose}>
						<Ionicons name="close" size={20} color={C.textMid} />
					</TouchableOpacity>
				</View>

				{/* ─── Mode tabs ─── */}
				<View style={s.tabsWrap}>
					{MODES.map((m) => {
						const isActive = mode === m.key;
						return (
							<TouchableOpacity
								key={m.key}
								style={[s.tab, isActive && s.tabActive]}
								onPress={() => setMode(m.key)}
								activeOpacity={0.8}
							>
								<Ionicons
									name={m.icon}
									size={16}
									color={isActive ? C.accent : C.sub}
								/>
								<Text style={[s.tabTxt, isActive && s.tabTxtActive]}>
									{m.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>

				{/* ─── Main content list ─── */}
				<FlatList
					data={lines}
					keyExtractor={(item, index) => `${item.designation}-${index}`}
					renderItem={renderItem}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={[s.listContent, { paddingBottom: 180 + insets.bottom }]}
					showsVerticalScrollIndicator={false}
					ListHeaderComponent={(
						<>
							{/* Pending lines review */}
							{pendingLines.length > 0 && (
								<View style={s.card}>
									<View style={s.cardHeaderRow}>
										<View style={s.cardHeaderLeft}>
											<Ionicons name="eye-outline" size={18} color={C.accent} />
											<Text style={s.cardTitle}>Vérifiez les lignes détectées</Text>
										</View>
										<TouchableOpacity style={s.acceptAllBtn} onPress={acceptAllPendingLines}>
											<Ionicons name="checkmark-done" size={14} color={C.accent} />
											<Text style={s.acceptAllBtnTxt}>Tout accepter</Text>
										</TouchableOpacity>
									</View>

									<View style={s.statsRow}>
										<View style={s.statPill}>
											<Text style={s.statPillLabel}>Détectés</Text>
											<Text style={s.statPillValue}>{totalDetectedCount}</Text>
										</View>
										<View style={[s.statPill, { borderColor: C.successLight }]}>
											<Text style={s.statPillLabel}>Acceptés</Text>
											<Text style={[s.statPillValue, { color: C.success }]}>{acceptedCount}</Text>
										</View>
										<View style={[s.statPill, { borderColor: C.accentMid }]}>
											<Text style={s.statPillLabel}>En attente</Text>
											<Text style={[s.statPillValue, { color: C.accent }]}>{pendingCount}</Text>
										</View>
									</View>

									<FlatList
										data={pendingLines}
										keyExtractor={(item, index) => `pending-${item.designation}-${index}`}
										renderItem={renderPendingItem}
										scrollEnabled={false}
										ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
									/>
								</View>
							)}

							{/* Input section */}
							<View style={s.card}>
								{mode === 'text' && (
									<>
										<View style={s.cardHeaderRow}>
											<View style={s.cardHeaderLeft}>
												<Ionicons name="clipboard-outline" size={18} color={C.accent} />
												<Text style={s.cardTitle}>Coller le texte</Text>
											</View>
										</View>
										<Text style={s.cardHint}>
											Collez un email, un tableau ou le contenu d'un PDF copié.
										</Text>
										<TextInput
											style={s.textArea}
											placeholder="Collez ici le texte à analyser…"
											placeholderTextColor={C.sub}
											multiline
											textAlignVertical="top"
											value={rawText}
											onChangeText={setRawText}
										/>
										<TouchableOpacity
											style={[s.mainBtn, loading && s.btnDisabled]}
											onPress={handleParseText}
											disabled={loading}
										>
											{loading ? (
												<ActivityIndicator color="#fff" />
											) : (
												<>
													<Ionicons name="sparkles" size={18} color={C.white} />
													<Text style={s.mainBtnTxt}>Analyser le texte</Text>
												</>
											)}
										</TouchableOpacity>
									</>
								)}

								{mode === 'camera' && (
									<>
										<View style={s.cardHeaderRow}>
											<View style={s.cardHeaderLeft}>
												<Ionicons name="camera-outline" size={18} color={C.accent} />
												<Text style={s.cardTitle}>Prendre une photo</Text>
											</View>
										</View>
										<Text style={s.cardHint}>Photographiez un bon de commande ou une facture.</Text>
										<CameraScreen
											onCaptured={(asset) => {
												setPickedFile(asset);
												setError(null);
												setMode('pdf');
											}}
											onCancel={() => setMode('pdf')}
										/>
									</>
								)}

								{mode === 'pdf' && (
									<>
										<View style={s.cardHeaderRow}>
											<View style={s.cardHeaderLeft}>
												<Ionicons name="document-outline" size={18} color={C.accent} />
												<Text style={s.cardTitle}>Importer un document</Text>
											</View>
										</View>
										<Text style={s.cardHint}>PDF, JPG ou PNG — la prise en charge automatique.</Text>

										<TouchableOpacity style={s.filePicker} onPress={handleChooseSource}>
											<View style={s.filePickerIcon}>
												<Ionicons
													name={pickedFile ? 'document-attach' : 'cloud-upload-outline'}
													size={24}
													color={pickedFile ? C.accent : C.sub}
												/>
											</View>
											<View style={{ flex: 1 }}>
												<Text style={[s.filePickerTxt, !pickedFile && { color: C.sub }]}>
													{pickedFile?.name || 'Choisir un fichier…'}
												</Text>
												{!pickedFile && (
													<Text style={s.filePickerHint}>PDF, JPG ou PNG acceptés</Text>
												)}
											</View>
											<Ionicons name="chevron-forward" size={16} color={C.sub} />
										</TouchableOpacity>

										<TouchableOpacity
											style={[s.mainBtn, (!pickedFile || loading) && s.btnDisabled]}
											onPress={handleParseDocument}
											disabled={loading || !pickedFile}
										>
											{loading ? (
												<ActivityIndicator color="#fff" />
											) : (
												<>
													<Ionicons name="sparkles" size={18} color={C.white} />
													<Text style={s.mainBtnTxt}>Analyser le document</Text>
												</>
											)}
										</TouchableOpacity>
									</>
								)}

								{/* Error */}
								{!!error && (
									<View style={s.errorBox}>
										<Ionicons name="alert-circle-outline" size={16} color={C.danger} />
										<Text style={s.errorTxt}>{error}</Text>
									</View>
								)}
							</View>

							{/* Confirmed lines header */}
							{lines.length > 0 && (
								<View style={s.linesHeader}>
									<View style={s.linesHeaderLeft}>
										<Ionicons name="list" size={16} color={C.accent} />
										<Text style={s.linesHeaderTxt}>
											{lines.length} ligne{lines.length !== 1 ? 's' : ''} confirmée{lines.length !== 1 ? 's' : ''}
										</Text>
									</View>
									<Text style={s.linesHeaderHint}>Glissez → pour retirer</Text>
								</View>
							)}
						</>
					)}
					ListEmptyComponent={
						!loading && lines.length === 0 && pendingLines.length === 0 ? (
							<View style={s.emptyCard}>
								<Text style={s.emptyEmoji}>🤖</Text>
								<Text style={s.emptyTitle}>Aucune ligne encore</Text>
								<Text style={s.emptySub}>
									Collez du texte ou importez un document — l'IA extraira les lignes automatiquement.
								</Text>
							</View>
						) : null
					}
				/>

				{/* ─── Footer ─── */}
				<View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
					{lines.length > 0 && (
						<View style={s.footerTotal}>
							<View>
								<Text style={s.footerTotalLabel}>
									{lines.length} article{lines.length !== 1 ? 's' : ''}
								</Text>
								<Text style={s.footerTotalAmt}>{totalTTC.toFixed(2)} MAD TTC</Text>
							</View>
							<View style={s.footerTotalHT}>
								<Text style={s.footerTotalHTLabel}>HT</Text>
								<Text style={s.footerTotalHTAmt}>{totalHT.toFixed(2)}</Text>
							</View>
						</View>
					)}
					<View style={s.footerBtns}>
						<TouchableOpacity style={s.ghostBtn} onPress={onClose}>
							<Text style={s.ghostBtnTxt}>Annuler</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[s.insertBtn, (lines.length === 0 || inserting) && s.btnDisabled]}
							onPress={handleInsert}
							disabled={lines.length === 0 || inserting}
						>
							{inserting ? (
								<ActivityIndicator color="#fff" />
							) : (
								<>
									<Ionicons name="arrow-forward-circle" size={20} color={C.white} />
									<Text style={s.insertBtnTxt}>
										Insérer dans le devis
									</Text>
								</>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.bg },
	flex: { flex: 1 },

	header: {
		paddingHorizontal: 16,
		paddingBottom: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	headerIcon: {
		width: 44,
		height: 44,
		borderRadius: 14,
		backgroundColor: C.accentLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: { color: C.text, fontSize: 18, fontWeight: '800' },
	subtitle: { color: C.sub, fontSize: 12, fontWeight: '500', marginTop: 2 },
	closeBtn: {
		width: 38,
		height: 38,
		borderRadius: 12,
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
		alignItems: 'center',
		justifyContent: 'center',
	},

	tabsWrap: {
		flexDirection: 'row',
		paddingHorizontal: 14,
		paddingVertical: 10,
		gap: 8,
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	tab: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 5,
		height: 40,
		borderRadius: 12,
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
	},
	tabActive: {
		backgroundColor: C.accentLight,
		borderColor: C.accentMid,
	},
	tabTxt: { color: C.sub, fontSize: 13, fontWeight: '700' },
	tabTxtActive: { color: C.accent },

	listContent: { paddingHorizontal: 14, paddingTop: 14 },

	card: {
		backgroundColor: C.white,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: C.border,
		padding: 16,
		marginBottom: 12,
		gap: 12,
		...SHADOW,
	},
	cardHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	cardTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
	cardHint: { color: C.sub, fontSize: 13, lineHeight: 20, marginTop: -4 },

	statsRow: { flexDirection: 'row', gap: 8 },
	statPill: {
		flex: 1,
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 10,
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
	},
	statPillLabel: { color: C.sub, fontSize: 11, fontWeight: '600' },
	statPillValue: { color: C.text, fontSize: 20, fontWeight: '800', marginTop: 2 },

	acceptAllBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
		backgroundColor: C.accentLight,
		borderWidth: 1,
		borderColor: C.accentMid,
	},
	acceptAllBtnTxt: { color: C.accent, fontSize: 13, fontWeight: '800' },

	pendingCard: {
		backgroundColor: C.accentLight,
		borderRadius: 16,
		borderWidth: 1.5,
		borderColor: C.accentMid,
		padding: 14,
		gap: 10,
	},
	pendingCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
	pendingIndex: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: C.accentMid,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 1,
	},
	pendingIndexTxt: { color: C.accentDark, fontSize: 12, fontWeight: '800' },
	pendingTitle: { flex: 1, color: C.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
	pendingMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: C.white,
		borderRadius: 12,
		padding: 12,
		gap: 12,
	},
	pendingMetaItem: { flex: 1, alignItems: 'center' },
	pendingMetaDivider: { width: 1, height: 28, backgroundColor: C.border },
	pendingMetaLabel: { color: C.sub, fontSize: 11, fontWeight: '600' },
	pendingMetaValue: { color: C.text, fontSize: 15, fontWeight: '800', marginTop: 2 },
	pendingActions: { flexDirection: 'row', gap: 8 },
	rejectBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		height: 44,
		borderRadius: 12,
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.dangerLight,
	},
	rejectBtnTxt: { color: C.danger, fontSize: 14, fontWeight: '700' },
	acceptBtn: {
		flex: 2,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		height: 44,
		borderRadius: 12,
		backgroundColor: C.accent,
		...SHADOW,
	},
	acceptBtnTxt: { color: C.white, fontSize: 14, fontWeight: '800' },

	textArea: {
		minHeight: 130,
		borderWidth: 1.5,
		borderColor: C.border,
		borderRadius: 14,
		paddingHorizontal: 14,
		paddingTop: 12,
		fontSize: 15,
		color: C.text,
		backgroundColor: C.bg,
		lineHeight: 22,
	},

	filePicker: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 14,
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: C.border,
		borderStyle: 'dashed',
		backgroundColor: C.bg,
	},
	filePickerIcon: {
		width: 46,
		height: 46,
		borderRadius: 14,
		backgroundColor: C.white,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: C.border,
	},
	filePickerTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
	filePickerHint: { color: C.sub, fontSize: 12, marginTop: 3 },

	mainBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 52,
		borderRadius: 14,
		backgroundColor: C.accent,
		...SHADOW_LG,
	},
	mainBtnTxt: { color: C.white, fontSize: 15, fontWeight: '800' },

	errorBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
		padding: 12,
		borderRadius: 12,
		backgroundColor: C.dangerLight,
		borderWidth: 1,
		borderColor: C.danger + '40',
	},
	errorTxt: { flex: 1, color: C.dangerText, fontSize: 13, fontWeight: '600', lineHeight: 18 },

	linesHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
		paddingHorizontal: 2,
	},
	linesHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	linesHeaderTxt: { color: C.text, fontSize: 15, fontWeight: '800' },
	linesHeaderHint: { color: C.sub, fontSize: 12 },

	lineCard: {
		backgroundColor: C.white,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: C.border,
		padding: 14,
		marginBottom: 10,
		gap: 10,
		...SHADOW,
	},
	lineCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	lineIndex: {
		width: 26,
		height: 26,
		borderRadius: 13,
		backgroundColor: C.accentLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	lineIndexTxt: { color: C.accent, fontSize: 12, fontWeight: '800' },
	lineFieldWrap: { gap: 6 },
	lineRow: { flexDirection: 'row', gap: 10 },
	lineTotalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: C.border,
	},
	lineTotalTxt: { color: C.sub, fontSize: 13, fontWeight: '500' },
	lineTotalAmt: { color: C.text, fontSize: 15, fontWeight: '800' },

	remarqueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
	remarqueTxt: { flex: 1, color: C.sub, fontSize: 12, lineHeight: 17 },

	input: {
		height: 46,
		borderWidth: 1.5,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		fontSize: 15,
		color: C.text,
		backgroundColor: C.bg,
	},
	inputCompact: {
		height: 44,
		borderWidth: 1.5,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		fontSize: 15,
		color: C.text,
		backgroundColor: C.bg,
		fontWeight: '700',
	},

	swipeDelete: {
		width: 90,
		marginBottom: 10,
		backgroundColor: C.danger,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4,
	},
	swipeDeleteTxt: { color: C.white, fontWeight: '700', fontSize: 12 },

	emptyCard: {
		backgroundColor: C.white,
		borderRadius: 20,
		padding: 36,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: C.border,
		marginTop: 8,
		...SHADOW,
	},
	emptyEmoji: { fontSize: 40, marginBottom: 14 },
	emptyTitle: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
	emptySub: { color: C.sub, fontSize: 14, textAlign: 'center', lineHeight: 22 },

	footer: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: C.white,
		borderTopWidth: 1,
		borderTopColor: C.border,
		paddingHorizontal: 16,
		paddingTop: 12,
		gap: 10,
		...SHADOW,
	},
	footerTotal: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	footerTotalLabel: { color: C.sub, fontSize: 13, fontWeight: '600' },
	footerTotalAmt: { color: C.text, fontSize: 20, fontWeight: '800' },
	footerTotalHT: {
		alignItems: 'flex-end',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 10,
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
	},
	footerTotalHTLabel: { color: C.sub, fontSize: 10, fontWeight: '600' },
	footerTotalHTAmt: { color: C.textMid, fontSize: 14, fontWeight: '700' },

	footerBtns: { flexDirection: 'row', gap: 10 },
	ghostBtn: {
		flex: 1,
		height: 52,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
	},
	ghostBtnTxt: { color: C.textMid, fontSize: 15, fontWeight: '700' },
	insertBtn: {
		flex: 2.5,
		height: 52,
		borderRadius: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		backgroundColor: C.accent,
		...SHADOW_LG,
	},
	insertBtnTxt: { color: C.white, fontSize: 15, fontWeight: '800' },
	btnDisabled: { opacity: 0.5 },
});
