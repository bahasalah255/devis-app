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
import CameraScreen from './Camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { API_BASE_URL } from './config';

const C = {
	bg: '#F2F2F7',
	white: '#FFFFFF',
	accent: '#4F46E5',
	text: '#1C1C1E',
	sub: '#8E8E93',
	border: '#E5E5EA',
	success: '#25D366',
	warn: '#F59E0B',
	danger: '#C62828',
};

const SHADOW = {
	shadowColor: '#000',
	shadowOpacity: 0.06,
	shadowRadius: 8,
	shadowOffset: { width: 0, height: 3 },
	elevation: 2,
};

const toNumber = (value, fallback = 0) => {
	if (value === null || value === undefined) return fallback;
	const parsed = Number(String(value).replace(',', '.').trim());
	return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const sanitizeLine = (line) => {
	const quantite = clamp(toNumber(line?.quantite, 1), 0, 10000);
	const prix = clamp(toNumber(line?.prix_unitaire_ht, 0), 0, 1000000);
	const total = Number((quantite * prix).toFixed(2));
	const confiance = Math.max(0, Math.min(1, toNumber(line?.confiance, 0.7)));

	return {
		designation: String(line?.designation || '').trim(),
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
	return {
		...line,
		quantite,
		prix_unitaire_ht: Number(prix.toFixed(2)),
		total_ht: Number((quantite * prix).toFixed(2)),
	};
};

export default function SmartPasteScreen({ onInsert, onClose }) {
	const [mode, setMode] = useState('text');
	const [rawText, setRawText] = useState('');
	const [pickedFile, setPickedFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [lines, setLines] = useState([]);

	const totalHT = useMemo(() => lines.reduce((sum, line) => sum + toNumber(line.total_ht, 0), 0), [lines]);

	const parseApiData = useCallback((data) => {
		if (Array.isArray(data)) return data;
		if (typeof data === 'string') {
			try {
				const parsed = JSON.parse(data);
				return Array.isArray(parsed) ? parsed : [];
			} catch {
				return [];
			}
		}
		return [];
	}, []);

	const callParseApi = useCallback(async (payload) => {
		const token = await AsyncStorage.getItem('token');
		const response = await axios.post(`${API_BASE_URL}/parse-devis`, payload, {
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
		});

		const parsed = parseApiData(response?.data);
		const sanitized = parsed.map(sanitizeLine).filter((line) => line.designation.length > 0 || line.remarque);

		setLines(sanitized);
		if (sanitized.length === 0) {
			setError('Aucune ligne exploitable détectée. Vérifiez le contenu collé ou le PDF.');
		}
	}, [parseApiData]);

	const handleParseText = useCallback(async () => {
		const text = rawText.trim();
		if (!text) {
			setError('Collez un texte avant de lancer l’analyse.');
			return;
		}

		setLoading(true);
		setError(null);
		try {
			await callParseApi({ text });
		} catch {
			setError('Échec de l’analyse. Vérifiez votre connexion puis réessayez.');
		} finally {
			setLoading(false);
		}
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

		if (!manipulated?.base64) {
			throw new Error('IMAGE_CONVERSION_FAILED');
		}

		return {
			base64: manipulated.base64,
			mimeType: 'image/jpeg',
		};
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
		if (!permission.granted) {
			setError('Autorisez l’accès à la galerie pour sélectionner une image.');
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: false,
			quality: 1,
			base64: false,
		});

		if (result.canceled || !result.assets?.length) return;
		const asset = result.assets[0];
		setPickedFile({
			uri: asset.uri,
			name: asset.fileName || 'image.jpg',
			mimeType: asset.mimeType || 'image/jpeg',
		});
	}, []);

	const handleChooseSource = useCallback(() => {
		Alert.alert('Sélection du document', 'Choisissez la source', [
			{ text: 'Annuler', style: 'cancel' },
			{ text: 'Galerie', onPress: handlePickFromGallery },
			{ text: 'Fichiers', onPress: handlePickDocument },
		]);
	}, [handlePickFromGallery, handlePickDocument]);

	const handleParseDocument = useCallback(async () => {
		if (!pickedFile?.uri) {
			setError('Sélectionnez un fichier PDF, JPG ou PNG avant de lancer l’analyse.');
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const mimeType = normalizePickedMimeType(pickedFile);
			if (!mimeType) {
				setError('Type de fichier non supporté. Utilisez PDF, JPG ou PNG.');
				return;
			}

			if (mimeType === 'application/pdf') {
				const base64Content = await FileSystem.readAsStringAsync(pickedFile.uri, {
					encoding: FileSystem.EncodingType.Base64,
				});
				await callParseApi({
					pdf_base64: base64Content,
					mime_type: mimeType,
				});
			} else {
				const preparedImage = await prepareImageBase64(pickedFile);
				await callParseApi({
					image_base64: preparedImage.base64,
					mime_type: preparedImage.mimeType,
				});
			}
		} catch (e) {
			const message =
				e?.response?.data?.detail ||
				e?.response?.data?.message ||
				'Impossible de traiter ce fichier. Essayez un autre document.';
			setError(message);
		} finally {
			setLoading(false);
		}
	}, [pickedFile, callParseApi, prepareImageBase64]);

	const updateLine = useCallback((index, key, value) => {
		setLines((prev) => prev.map((line, i) => {
			if (i !== index) return line;

			if (key === 'designation') {
				return { ...line, designation: value };
			}

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

	const handleInsert = useCallback(() => {
		const finalLines = lines.map((line) => recalcLine({
			...line,
			designation: String(line.designation || '').trim(),
		})).filter((line) => line.designation.length > 0);

		onInsert(finalLines);
	}, [lines, onInsert]);

	const renderDeleteAction = useCallback((index) => (
		<TouchableOpacity style={s.deleteAction} onPress={() => removeLine(index)}>
			<Text style={s.deleteActionTxt}>Supprimer</Text>
		</TouchableOpacity>
	), [removeLine]);

	const renderItem = useCallback(({ item, index }) => (
		<Swipeable overshootRight={false} renderRightActions={() => renderDeleteAction(index)}>
			<View style={s.lineCard}>
				<TextInput
					style={s.input}
					value={item.designation}
					onChangeText={(value) => updateLine(index, 'designation', value)}
					placeholder="Désignation"
					placeholderTextColor={C.sub}
				/>

				<View style={s.inlineRow}>
					<View style={s.fieldHalf}>
						<Text style={s.fieldLabel}>Quantité</Text>
						<TextInput
							style={s.inputCompact}
							value={String(item.quantite)}
							onChangeText={(value) => updateLine(index, 'quantite', value)}
							keyboardType="decimal-pad"
							placeholder="0"
							placeholderTextColor={C.sub}
						/>
					</View>

					<View style={s.fieldHalf}>
						<Text style={s.fieldLabel}>Prix unitaire HT</Text>
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

				<View style={s.metaRow}>
					<Text style={s.totalTxt}>Total HT: {Number(item.total_ht || 0).toFixed(2)} MAD</Text>
					<View style={[s.badge, item.confiance >= 0.7 ? s.badgeOk : s.badgeWarn]}>
						<Text style={s.badgeTxt}>{item.confiance >= 0.7 ? '✓' : '?'}</Text>
					</View>
				</View>

				{item.remarque ? <Text style={s.remarque}>{item.remarque}</Text> : null}
			</View>
		</Swipeable>
	), [renderDeleteAction, updateLine]);

	return (
		<SafeAreaView style={s.safe}>
			<KeyboardAvoidingView
				style={s.keyboardRoot}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
			>
				<View style={s.header}>
					<Text style={s.title}>Smart Paste</Text>
					<TouchableOpacity style={s.closeBtn} onPress={onClose}>
						<Text style={s.closeBtnTxt}>Fermer</Text>
					</TouchableOpacity>
				</View>

				<View style={s.tabsRow}>
					<TouchableOpacity style={[s.tab, mode === 'text' && s.tabActive]} onPress={() => setMode('text')}>
						<Text style={[s.tabTxt, mode === 'text' && s.tabTxtActive]}>Coller texte</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[s.tab, mode === 'pdf' && s.tabActive]} onPress={() => setMode('pdf')}>
						<Text style={[s.tabTxt, mode === 'pdf' && s.tabTxtActive]}>Scanner doc</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[s.tab, mode === 'camera' && s.tabActive]} onPress={() => setMode('camera')}>
						<Text style={[s.tabTxt, mode === 'camera' && s.tabTxtActive]}>Prendre photo</Text>
					</TouchableOpacity>
				</View>

				<FlatList
					data={lines}
					keyExtractor={(item, index) => `${item.designation}-${index}`}
					renderItem={renderItem}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={s.listContent}
					ListHeaderComponent={(
						<View style={s.card}>
							{mode === 'text' ? (
								<>
									<Text style={s.cardTitle}>Texte brut à analyser</Text>
									<TextInput
										style={s.textArea}
										placeholder="Collez ici le contenu copié (email, PDF, tableau, etc.)"
										placeholderTextColor={C.sub}
										multiline
										textAlignVertical="top"
										value={rawText}
										onChangeText={setRawText}
									/>
									<TouchableOpacity style={s.mainBtn} onPress={handleParseText} disabled={loading}>
										{loading ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnTxt}>Analyser le texte</Text>}
									</TouchableOpacity>
								</>
							) : mode === 'camera' ? (
								<>
									<Text style={s.cardTitle}>Prendre une photo du document</Text>
									<CameraScreen
										onCaptured={(asset) => {
											setPickedFile(asset);
											setError(null);
											setMode('pdf');
										}}
										onCancel={() => setMode('pdf')}
									/>
								</>
							) : (
								<>
									<Text style={s.cardTitle}>Document à analyser (PDF / JPG / PNG)</Text>
									<TouchableOpacity style={s.ghostBtn} onPress={handleChooseSource}>
										<Text style={s.ghostBtnTxt}>Choisir un document</Text>
									</TouchableOpacity>
									<Text style={s.fileName}>{pickedFile?.name || 'Aucun fichier sélectionné'}</Text>
									<TouchableOpacity style={[s.mainBtn, !pickedFile && s.btnDisabled]} onPress={handleParseDocument} disabled={loading || !pickedFile}>
										{loading ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnTxt}>Analyser le document</Text>}
									</TouchableOpacity>
								</>
							)}

							{error ? <Text style={s.errorTxt}>{error}</Text> : null}
						</View>
					)}
					ListEmptyComponent={!loading ? <Text style={s.empty}>Aucune ligne détectée pour le moment.</Text> : null}
				/>

				<View style={s.footer}>
					<Text style={s.footerTotal}>Total HT: {totalHT.toFixed(2)} MAD</Text>
					<View style={s.footerRow}>
						<TouchableOpacity style={s.ghostBtn} onPress={onClose}>
							<Text style={s.ghostBtnTxt}>Annuler</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[s.mainBtn, lines.length === 0 && s.btnDisabled]} onPress={handleInsert} disabled={lines.length === 0}>
							<Text style={s.mainBtnTxt}>Insérer dans le devis</Text>
						</TouchableOpacity>
					</View>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.bg },
	keyboardRoot: { flex: 1 },
	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	title: { color: C.text, fontSize: 22, fontWeight: '800' },
	closeBtn: {
		height: 40,
		paddingHorizontal: 12,
		borderRadius: 12,
		justifyContent: 'center',
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
	},
	closeBtnTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
	tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
	tab: {
		flex: 1,
		height: 38,
		borderRadius: 12,
		backgroundColor: '#E8E8EC',
		alignItems: 'center',
		justifyContent: 'center',
	},
	tabActive: { backgroundColor: '#E9EAFF' },
	tabTxt: { color: C.sub, fontSize: 13, fontWeight: '700' },
	tabTxtActive: { color: C.accent },
	listContent: { paddingHorizontal: 16, paddingBottom: 160 },
	card: {
		backgroundColor: C.white,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: C.border,
		padding: 12,
		marginBottom: 12,
		...SHADOW,
	},
	cardTitle: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
	textArea: {
		minHeight: 130,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingTop: 12,
		fontSize: 15,
		color: C.text,
		backgroundColor: '#FAFAFB',
		marginBottom: 10,
	},
	fileName: { color: C.sub, fontSize: 13, marginTop: 8, marginBottom: 10 },
	errorTxt: { color: C.danger, fontSize: 13, marginTop: 10, fontWeight: '600' },
	empty: { color: C.sub, textAlign: 'center', marginTop: 8, marginBottom: 24 },
	lineCard: {
		backgroundColor: C.white,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: C.border,
		padding: 10,
		marginBottom: 10,
	},
	input: {
		height: 46,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		fontSize: 15,
		color: C.text,
		backgroundColor: '#FAFAFB',
	},
	inlineRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
	fieldHalf: { flex: 1 },
	fieldLabel: { color: C.sub, fontSize: 12, marginBottom: 4, fontWeight: '600' },
	inputCompact: {
		height: 42,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 10,
		paddingHorizontal: 10,
		fontSize: 15,
		color: C.text,
		backgroundColor: '#FAFAFB',
	},
	metaRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	totalTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
	badge: {
		width: 26,
		height: 26,
		borderRadius: 13,
		alignItems: 'center',
		justifyContent: 'center',
	},
	badgeOk: { backgroundColor: C.success },
	badgeWarn: { backgroundColor: C.warn },
	badgeTxt: { color: C.white, fontSize: 14, fontWeight: '800' },
	remarque: { color: C.sub, fontSize: 12, marginTop: 8 },
	deleteAction: {
		width: 100,
		marginBottom: 10,
		backgroundColor: C.danger,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	deleteActionTxt: { color: C.white, fontWeight: '700', fontSize: 13 },
	footer: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 14,
		backgroundColor: C.bg,
		borderTopWidth: 1,
		borderTopColor: C.border,
	},
	footerTotal: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
	footerRow: { flexDirection: 'row', gap: 10 },
	ghostBtn: {
		flex: 1,
		height: 52,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
		...SHADOW,
	},
	ghostBtnTxt: { color: C.text, fontSize: 15, fontWeight: '700' },
	mainBtn: {
		height: 52,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: C.accent,
		paddingHorizontal: 14,
		...SHADOW,
	},
	mainBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
	btnDisabled: { opacity: 0.55 },
});
