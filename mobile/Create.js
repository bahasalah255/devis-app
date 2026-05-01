import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Alert,
	ActivityIndicator,
	Modal,
	FlatList,
	SafeAreaView,
	KeyboardAvoidingView,
	Keyboard,
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from './config';
import { COLORS, SHADOW, SHADOW_SM, SHADOW_LG } from './utils/platformStyles';

const C = COLORS;

const toISO = (d) => `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;

const calcLigne = (line) => {
	const q = Number(line.quantite || 0);
	const p = Number(line.prix_unitaire || 0);
	const r = Number(line.remise || 0);
	return q * p * (1 - r / 100);
};

const makeLine = () => ({
	produit_id: '',
	nom: '',
	description: '',
	quantite: '1',
	prix_unitaire: '',
	remise: '0',
});

const fromSmartLine = (line) => ({
	produit_id: line?.produit_id ? String(line.produit_id) : '',
	nom: String(line?.designation || '').trim(),
	description: String(line?.remarque || line?.designation || '').trim(),
	quantite: String(Number(line?.quantite || 1)),
	prix_unitaire: String(Number(line?.prix_unitaire_ht || 0)),
	remise: '0',
});

const PRODUCT_UNITS = ['unite', 'kg', 'litre', 'metre'];

const STEPS = [
	{ num: 1, label: 'Client', icon: 'person-outline' },
	{ num: 2, label: 'Produits', icon: 'list-outline' },
	{ num: 3, label: 'Confirmer', icon: 'checkmark-circle-outline' },
];

function StepProgress({ step }) {
	return (
		<View style={sp.wrap}>
			{STEPS.map((s, i) => {
				const isDone = step > s.num;
				const isActive = step === s.num;
				return (
					<React.Fragment key={s.num}>
						<View style={sp.item}>
							<View style={[sp.circle, isDone && sp.circleDone, isActive && sp.circleActive]}>
								{isDone ? (
									<Ionicons name="checkmark" size={14} color={C.white} />
								) : (
									<Text style={[sp.circleNum, isActive && sp.circleNumActive]}>{s.num}</Text>
								)}
							</View>
							<Text style={[sp.label, isActive && sp.labelActive, isDone && sp.labelDone]}>
								{s.label}
							</Text>
						</View>
						{i < STEPS.length - 1 && (
							<View style={[sp.connector, (isDone || step > s.num) && sp.connectorDone]} />
						)}
					</React.Fragment>
				);
			})}
		</View>
	);
}

const sp = StyleSheet.create({
	wrap: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	item: { alignItems: 'center', gap: 4 },
	circle: {
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: C.bg,
		borderWidth: 2,
		borderColor: C.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	circleActive: { borderColor: C.accent, backgroundColor: C.accentLight },
	circleDone: { borderColor: C.accent, backgroundColor: C.accent },
	circleNum: { color: C.sub, fontSize: 13, fontWeight: '800' },
	circleNumActive: { color: C.accent },
	label: { color: C.sub, fontSize: 11, fontWeight: '600' },
	labelActive: { color: C.accent, fontWeight: '700' },
	labelDone: { color: C.success },
	connector: { flex: 1, height: 2, backgroundColor: C.border, marginBottom: 14 },
	connectorDone: { backgroundColor: C.accent },
});

export default function Create({ navigation, route }) {
	const insets = useSafeAreaInsets();
	const [step, setStep] = useState(1);
	const [clientId, setClientId] = useState('');
	const [clients, setClients] = useState([]);
	const [produits, setProduits] = useState([]);
	const [lignes, setLignes] = useState(() => {
		const prefilled = route?.params?.prefilledLines;
		if (Array.isArray(prefilled) && prefilled.length > 0) return prefilled.map(fromSmartLine);
		return [makeLine()];
	});

	const [clientQuery, setClientQuery] = useState('');
	const [productQuery, setProductQuery] = useState('');
	const [showProductModal, setShowProductModal] = useState(false);
	const [activeLine, setActiveLine] = useState(0);
	const [showClientForm, setShowClientForm] = useState(false);
	const [savingClient, setSavingClient] = useState(false);
	const [clientNom, setClientNom] = useState('');
	const [clientEmail, setClientEmail] = useState('');
	const [clientTel, setClientTel] = useState('');
	const [showProductForm, setShowProductForm] = useState(false);
	const [savingProduct, setSavingProduct] = useState(false);
	const [productLibelle, setProductLibelle] = useState('');
	const [productPrix, setProductPrix] = useState('');
	const [productDescription, setProductDescription] = useState('');
	const [productUnite, setProductUnite] = useState('unite');
	const [priceSuggestions, setPriceSuggestions] = useState({});
	const [loadingRefs, setLoadingRefs] = useState(true);
	const [saving, setSaving] = useState(false);

	const mainScrollRef = useRef(null);
	const productListRef = useRef(null);

	const client = clients.find((c) => String(c.id) === String(clientId));
	const totalHT = useMemo(() => lignes.reduce((sum, l) => sum + calcLigne(l), 0), [lignes]);
	const totalTVA = totalHT * 0.2;
	const totalTTC = totalHT * 1.2;

	const filteredClients = useMemo(() => {
		const q = clientQuery.trim().toLowerCase();
		if (!q) return clients;
		return clients.filter((c) => String(c.nom || '').toLowerCase().includes(q) || String(c.email || '').toLowerCase().includes(q));
	}, [clientQuery, clients]);

	const filteredProduits = useMemo(() => {
		const q = productQuery.trim().toLowerCase();
		if (!q) return produits;
		return produits.filter((p) => String(p.libelle || '').toLowerCase().includes(q));
	}, [productQuery, produits]);

	const suggestionSignature = useMemo(
		() => lignes.map((line) => `${line.produit_id || ''}|${String(line.nom || '').trim().toLowerCase()}`).join(';'),
		[lignes]
	);

	useEffect(() => {
		(async () => {
			setLoadingRefs(true);
			try {
				const token = await AsyncStorage.getItem('token');
				const headers = { Authorization: `Bearer ${token}` };
				const [cr, pr] = await Promise.all([
					axios.get(`${API_BASE_URL}/clients`, { headers }),
					axios.get(`${API_BASE_URL}/produits`, { headers }),
				]);
				setClients(Array.isArray(cr.data) ? cr.data : []);
				setProduits(Array.isArray(pr.data) ? pr.data : []);
			} catch {
				Alert.alert('Erreur', 'Chargement des données impossible.');
			} finally {
				setLoadingRefs(false);
			}
		})();
	}, []);

	useEffect(() => {
		if (!showProductForm) return;
		const scroll = () => setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120);
		scroll();
	}, [showProductForm]);

	useEffect(() => {
		if (!showProductModal || !showProductForm) return;
		const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
		const sub = Keyboard.addListener(eventName, () => {
			setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120);
		});
		return () => sub.remove();
	}, [showProductModal, showProductForm]);

	useEffect(() => {
		let cancelled = false;
		const fetchSuggestions = async () => {
			try {
				const token = await AsyncStorage.getItem('token');
				if (!token) return;
				const headers = { Authorization: `Bearer ${token}` };
				const nextSuggestions = {};
				for (let index = 0; index < lignes.length; index += 1) {
					const line = lignes[index];
					const designation = String(line.nom || '').trim();
					if (!line.produit_id && !designation) continue;
					const params = { margin_percent: 10, default_price: Number(line.prix_unitaire || 0) || 0 };
					if (line.produit_id) params.produit_id = Number(line.produit_id);
					if (designation) params.designation = designation;
					const response = await axios.get(`${API_BASE_URL}/pricing/suggest`, { headers, params });
					nextSuggestions[index] = response?.data || null;
				}
				if (!cancelled) setPriceSuggestions(nextSuggestions);
			} catch {
				if (!cancelled) setPriceSuggestions({});
			}
		};
		fetchSuggestions();
		return () => { cancelled = true; };
	}, [suggestionSignature]);

	const setLigne = (index, key, value) => {
		setLignes((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
	};

	const applySuggestedPrice = (index) => {
		const suggestion = priceSuggestions[index];
		const suggestedPrice = Number(suggestion?.suggested_price || 0);
		if (!suggestedPrice) return;
		setLigne(index, 'prix_unitaire', String(suggestedPrice));
	};

	const canGoStep2 = Boolean(clientId);
	const canGoStep3 = lignes.length > 0 && lignes.every((l) => l.nom && Number(l.quantite) > 0 && Number(l.prix_unitaire) > 0);

	const nextStep = () => {
		if (step === 1 && !canGoStep2) {
			Alert.alert('Client requis', 'Sélectionnez un client pour continuer.');
			return;
		}
		if (step === 2 && !canGoStep3) {
			Alert.alert('Informations manquantes', 'Chaque ligne doit avoir un produit, une quantité et un prix.');
			return;
		}
		setStep((s) => Math.min(3, s + 1));
	};

	const submit = async () => {
		if (!canGoStep2 || !canGoStep3) {
			Alert.alert('Vérification', 'Vérifiez le client et les articles.');
			return;
		}
		setSaving(true);
		try {
			const token = await AsyncStorage.getItem('token');
			const dateEm = new Date();
			const dateVal = new Date();
			dateVal.setDate(dateVal.getDate() + 30);
			const normalizedEmail = String(clientEmail || '').trim();
			const payload = {
				client_id: Number(clientId),
				date_emission: toISO(dateEm),
				date_validite: toISO(dateVal),
				lignes: lignes.map((l) => ({
					produit_id: l.produit_id ? Number(l.produit_id) : null,
					description: l.description || l.nom,
					quantite: Number(l.quantite),
					prix_unitaire: Number(l.prix_unitaire),
					remise: Number(l.remise || 0),
				})),
			};
			if (normalizedEmail) payload.email = normalizedEmail;
			await axios.post(`${API_BASE_URL}/devis`, payload, {
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			});
			Alert.alert('Devis créé !', 'Votre devis a été enregistré avec succès.', [
				{ text: 'Voir les devis', onPress: () => navigation.replace('Dash') },
			]);
		} catch (e) {
			if (e?.response?.status === 422) Alert.alert('Validation', 'Vérifiez les informations saisies.');
			else Alert.alert('Erreur', 'Impossible de créer le devis.');
		} finally {
			setSaving(false);
		}
	};

	const saveClientForm = async () => {
		if (savingClient) return;
		if (!clientNom.trim()) { Alert.alert('Requis', 'Le nom du client est requis.'); return; }
		setSavingClient(true);
		try {
			const token = await AsyncStorage.getItem('token');
			const response = await axios.post(
				`${API_BASE_URL}/clients`,
				{ nom: clientNom.trim(), email: clientEmail.trim() || null, telephone: clientTel.trim() || null, adresse: null },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			const created = response?.data;
			if (!created?.id) { Alert.alert('Erreur', 'Client créé mais ID invalide.'); return; }
			setClients((prev) => [created, ...prev]);
			setClientId(String(created.id));
			setClientNom('');
			setClientEmail(String(created?.email || ''));
			setClientTel('');
			setShowClientForm(false);
		} catch (error) {
			const apiErrors = error?.response?.data?.errors;
			if (apiErrors) {
				Alert.alert('Validation', Object.values(apiErrors)?.[0]?.[0] || 'Données invalides.');
			} else {
				Alert.alert('Erreur', 'Impossible de créer le client.');
			}
		} finally {
			setSavingClient(false);
		}
	};

	const saveProductForm = async () => {
		if (savingProduct) return;
		if (!productLibelle.trim()) { Alert.alert('Requis', 'Le nom du produit est requis.'); return; }
		if (!productPrix.trim()) { Alert.alert('Requis', 'Le prix est requis.'); return; }
		const parsedPrice = Number(String(productPrix).replace(',', '.'));
		if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
			Alert.alert('Prix invalide', 'Entrez un prix valide (ex: 150.00).');
			return;
		}
		const normalizedUnit = String(productUnite || '').trim().toLowerCase();
		if (!PRODUCT_UNITS.includes(normalizedUnit)) {
			Alert.alert('Unité requise', 'Sélectionnez une unité.');
			return;
		}
		setSavingProduct(true);
		try {
			const token = await AsyncStorage.getItem('token');
			const response = await axios.post(
				`${API_BASE_URL}/produits`,
				{ libelle: productLibelle.trim(), description: productDescription.trim() || null, prix_unitaire: parsedPrice, unite: normalizedUnit },
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			const created = response?.data;
			if (!created?.id) { Alert.alert('Erreur', 'Produit créé mais ID invalide.'); return; }
			setProduits((prev) => [created, ...prev]);
			setLigne(activeLine, 'produit_id', String(created.id));
			setLigne(activeLine, 'nom', created.libelle || `Produit ${created.id}`);
			setLigne(activeLine, 'prix_unitaire', String(created.prix_unitaire || ''));
			setLigne(activeLine, 'description', created.description || '');
			setProductLibelle(''); setProductPrix(''); setProductDescription(''); setProductUnite('unite');
			setShowProductForm(false);
			setShowProductModal(false);
		} catch (error) {
			const apiErrors = error?.response?.data?.errors;
			if (apiErrors) {
				Alert.alert('Validation', Object.values(apiErrors)?.[0]?.[0] || 'Données invalides.');
			} else {
				Alert.alert('Erreur', error?.response?.data?.message || 'Impossible de créer le produit.');
			}
		} finally {
			setSavingProduct(false);
		}
	};

	return (
		<SafeAreaView style={s.safe}>
			<KeyboardAvoidingView
				style={s.flex}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
			>
				<View style={s.header}>
					<TouchableOpacity style={s.backBtn} onPress={() => navigation.replace('Dash')}>
						<Ionicons name="arrow-back" size={20} color={C.text} />
					</TouchableOpacity>
					<Text style={s.title}>Nouveau devis</Text>
					<View style={{ width: 40 }} />
				</View>

				<StepProgress step={step} />

				<ScrollView
					ref={mainScrollRef}
					contentContainerStyle={s.scroll}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					keyboardDismissMode="on-drag"
				>
					{step === 1 && (
						<View>
							<Text style={s.sectionTitle}>Sélectionnez un client</Text>
							<View style={s.searchWrap}>
								<Ionicons name="search-outline" size={18} color={C.sub} />
								<TextInput
									style={s.searchInput}
									placeholder="Rechercher par nom ou email…"
									placeholderTextColor={C.sub}
									value={clientQuery}
									onChangeText={setClientQuery}
								/>
								{!!clientQuery && (
									<TouchableOpacity onPress={() => setClientQuery('')}>
										<Ionicons name="close-circle" size={18} color={C.sub} />
									</TouchableOpacity>
								)}
							</View>

							{loadingRefs ? (
								<View style={s.loadingWrap}>
									<ActivityIndicator color={C.accent} />
									<Text style={s.loadingTxt}>Chargement des clients…</Text>
								</View>
							) : (
								<View style={s.card}>
									<FlatList
										data={filteredClients}
										keyExtractor={(item) => String(item.id)}
										scrollEnabled={false}
										renderItem={({ item }) => {
											const isSelected = String(clientId) === String(item.id);
											return (
												<TouchableOpacity
													style={[s.clientRow, isSelected && s.clientRowSelected]}
													onPress={() => {
														setClientId(String(item.id));
														setClientEmail(String(item?.email || ''));
													}}
												>
													<View style={[s.clientAvatar, isSelected && s.clientAvatarSelected]}>
														<Text style={[s.clientAvatarTxt, isSelected && { color: C.white }]}>
															{(item.nom || '?').charAt(0).toUpperCase()}
														</Text>
													</View>
													<View style={{ flex: 1 }}>
														<Text style={[s.clientName, isSelected && s.clientNameSelected]}>
															{item.nom}
														</Text>
														{!!item.email && (
															<Text style={s.clientEmail} numberOfLines={1}>{item.email}</Text>
														)}
													</View>
													{isSelected && (
														<Ionicons name="checkmark-circle" size={22} color={C.accent} />
													)}
												</TouchableOpacity>
											);
										}}
										ListEmptyComponent={
											<Text style={s.emptyTxt}>
												{clientQuery ? `Aucun résultat pour "${clientQuery}"` : 'Aucun client enregistré.'}
											</Text>
										}
										ItemSeparatorComponent={() => <View style={s.separator} />}
									/>

									<TouchableOpacity
										style={[s.addInlineBtn, showClientForm && s.addInlineBtnActive]}
										onPress={() => setShowClientForm((p) => !p)}
									>
										<Ionicons
											name={showClientForm ? 'close' : 'person-add-outline'}
											size={16}
											color={C.accent}
										/>
										<Text style={s.addInlineBtnTxt}>
											{showClientForm ? 'Annuler' : 'Nouveau client'}
										</Text>
									</TouchableOpacity>

									{showClientForm && (
										<View style={s.inlineForm}>
											<Text style={s.inlineFormTitle}>Ajouter un client</Text>
											<TextInput
												style={s.input}
												placeholder="Nom du client *"
												placeholderTextColor={C.sub}
												value={clientNom}
												onChangeText={setClientNom}
												onFocus={() => mainScrollRef.current?.scrollTo({ y: 320, animated: true })}
											/>
											<TextInput
												style={s.input}
												placeholder="Email (optionnel)"
												placeholderTextColor={C.sub}
												value={clientEmail}
												onChangeText={setClientEmail}
												autoCapitalize="none"
												keyboardType="email-address"
											/>
											<TextInput
												style={s.input}
												placeholder="Téléphone (optionnel)"
												placeholderTextColor={C.sub}
												value={clientTel}
												onChangeText={setClientTel}
												keyboardType="phone-pad"
											/>
											<TouchableOpacity
												style={[s.primaryBtn, savingClient && { opacity: 0.7 }]}
												onPress={saveClientForm}
												disabled={savingClient}
											>
												{savingClient ? (
													<ActivityIndicator color="#fff" />
												) : (
													<Text style={s.primaryBtnTxt}>Enregistrer le client</Text>
												)}
											</TouchableOpacity>
										</View>
									)}
								</View>
							)}
						</View>
					)}

					{step === 2 && (
						<View>
							<View style={s.step2Header}>
								<Text style={s.sectionTitle}>Articles du devis</Text>
								{totalHT > 0 && (
									<View style={s.liveTotalBadge}>
										<Text style={s.liveTotalTxt}>
											{totalTTC.toFixed(2)} MAD TTC
										</Text>
									</View>
								)}
							</View>

							{lignes.map((line, index) => (
								<View key={index} style={s.lineCard}>
									<View style={s.lineCardHeader}>
										<View style={s.lineNumber}>
											<Text style={s.lineNumberTxt}>{index + 1}</Text>
										</View>
										<Text style={s.lineCardTitle}>
											{line.nom || 'Article sans nom'}
										</Text>
										{lignes.length > 1 && (
											<TouchableOpacity
												style={s.removeLineBtn}
												onPress={() => setLignes((p) => p.filter((_, i) => i !== index))}
											>
												<Ionicons name="close" size={18} color={C.danger} />
											</TouchableOpacity>
										)}
									</View>

									{(() => {
										const suggestion = priceSuggestions[index];
										if (!suggestion?.suggested_price) return null;
										return (
											<TouchableOpacity
												style={s.suggestWrap}
												onPress={() => applySuggestedPrice(index)}
											>
												<Ionicons name="sparkles" size={14} color={C.accent} />
												<Text style={s.suggestTxt}>
													Prix suggéré: {Number(suggestion.suggested_price).toFixed(2)} MAD
												</Text>
												<Text style={s.suggestApply}>Appliquer</Text>
											</TouchableOpacity>
										);
									})()}

									<TouchableOpacity
										style={s.productPicker}
										onPress={() => { setActiveLine(index); setShowProductModal(true); }}
									>
										<Ionicons name="cube-outline" size={18} color={line.nom ? C.accent : C.sub} />
										<Text style={[s.productPickerTxt, !line.nom && s.productPickerPlaceholder]}>
											{line.nom || 'Choisir un produit…'}
										</Text>
										<Ionicons name="chevron-down" size={16} color={C.sub} />
									</TouchableOpacity>

									<View style={s.qtyPriceRow}>
										<View style={s.qtyWrap}>
											<Text style={s.fieldLabel}>Quantité</Text>
											<View style={s.qtyRow}>
												<TouchableOpacity
													style={s.qtyBtn}
													onPress={() => setLigne(index, 'quantite', String(Math.max(1, Number(line.quantite || 1) - 1)))}
												>
													<Ionicons name="remove" size={16} color={C.accent} />
												</TouchableOpacity>
												<TextInput
													style={s.qtyInput}
													value={line.quantite}
													onChangeText={(v) => setLigne(index, 'quantite', v.replace(/[^0-9]/g, '') || '1')}
													keyboardType="numeric"
												/>
												<TouchableOpacity
													style={s.qtyBtn}
													onPress={() => setLigne(index, 'quantite', String(Number(line.quantite || 1) + 1))}
												>
													<Ionicons name="add" size={16} color={C.accent} />
												</TouchableOpacity>
											</View>
										</View>

										<View style={s.priceWrap}>
											<Text style={s.fieldLabel}>Prix HT (MAD)</Text>
											<TextInput
												style={s.priceInput}
												value={line.prix_unitaire}
												onChangeText={(v) => setLigne(index, 'prix_unitaire', v.replace(',', '.'))}
												keyboardType="decimal-pad"
												placeholder="0.00"
												placeholderTextColor={C.sub}
											/>
										</View>
									</View>

									{calcLigne(line) > 0 && (
										<View style={s.lineTotal}>
											<Text style={s.lineTotalTxt}>
												Sous-total: <Text style={s.lineTotalAmt}>{calcLigne(line).toFixed(2)} MAD HT</Text>
											</Text>
										</View>
									)}
								</View>
							))}

							<TouchableOpacity
								style={s.addLineBtn}
								onPress={() => setLignes((p) => [...p, makeLine()])}
							>
								<Ionicons name="add-circle-outline" size={20} color={C.accent} />
								<Text style={s.addLineBtnTxt}>Ajouter un article</Text>
							</TouchableOpacity>
						</View>
					)}

					{step === 3 && (
						<View>
							<Text style={s.sectionTitle}>Vérifiez avant de créer</Text>
							<View style={s.receiptCard}>
								<View style={s.receiptHeader}>
									<Ionicons name="document-text" size={22} color={C.accent} />
									<Text style={s.receiptTitle}>Résumé du devis</Text>
								</View>

								<View style={s.receiptRow}>
									<Text style={s.receiptLabel}>Client</Text>
									<Text style={s.receiptValue}>{client?.nom || '—'}</Text>
								</View>
								{!!client?.email && (
									<View style={s.receiptRow}>
										<Text style={s.receiptLabel}>Email</Text>
										<Text style={s.receiptValue}>{client.email}</Text>
									</View>
								)}
								<View style={s.receiptRow}>
									<Text style={s.receiptLabel}>Articles</Text>
									<Text style={s.receiptValue}>{lignes.length} ligne{lignes.length !== 1 ? 's' : ''}</Text>
								</View>

								<View style={s.receiptDivider} />

								{lignes.map((l, i) => (
									<View key={i} style={s.receiptLineRow}>
										<Text style={s.receiptLineName} numberOfLines={1}>{l.nom || `Article ${i + 1}`}</Text>
										<Text style={s.receiptLineQty}>×{l.quantite}</Text>
										<Text style={s.receiptLineTotal}>{calcLigne(l).toFixed(2)} MAD</Text>
									</View>
								))}

								<View style={s.receiptDivider} />

								<View style={s.receiptRow}>
									<Text style={s.receiptLabel}>Sous-total HT</Text>
									<Text style={s.receiptValue}>{totalHT.toFixed(2)} MAD</Text>
								</View>
								<View style={s.receiptRow}>
									<Text style={s.receiptLabel}>TVA (20%)</Text>
									<Text style={s.receiptValue}>{totalTVA.toFixed(2)} MAD</Text>
								</View>

								<View style={s.receiptTotalRow}>
									<Text style={s.receiptTotalLabel}>Total TTC</Text>
									<Text style={s.receiptTotalAmt}>{totalTTC.toFixed(2)} MAD</Text>
								</View>
							</View>
						</View>
					)}
				</ScrollView>

				<View style={[s.footer, { paddingBottom: 14 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0) }]}>
					{step > 1 && (
						<TouchableOpacity style={s.ghostBtn} onPress={() => setStep((s) => Math.max(1, s - 1))}>
							<Ionicons name="arrow-back" size={18} color={C.textMid} />
							<Text style={s.ghostBtnTxt}>Retour</Text>
						</TouchableOpacity>
					)}
					{step < 3 ? (
						<TouchableOpacity style={s.mainBtn} onPress={nextStep}>
							<Text style={s.mainBtnTxt}>Continuer</Text>
							<Ionicons name="arrow-forward" size={18} color={C.white} />
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={[s.mainBtn, s.mainBtnSuccess, saving && { opacity: 0.7 }]}
							onPress={submit}
							disabled={saving}
						>
							{saving ? (
								<ActivityIndicator color="#fff" />
							) : (
								<>
									<Ionicons name="checkmark-circle" size={20} color={C.white} />
									<Text style={s.mainBtnTxt}>Créer le devis</Text>
								</>
							)}
						</TouchableOpacity>
					)}
				</View>

				<Modal visible={showProductModal} transparent animationType="slide">
					<View style={s.modalOverlay}>
						<KeyboardAvoidingView
							style={s.flex}
							behavior="padding"
							keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 24}
						>
							<View style={[s.modalSheet, { paddingBottom: 14 + Math.max(insets.bottom, 10) }]}>
								<View style={s.modalHandle} />
								<View style={s.modalHeader}>
									<Text style={s.modalTitle}>Choisir un produit</Text>
									<TouchableOpacity
										style={s.modalCloseBtn}
										onPress={() => setShowProductModal(false)}
									>
										<Ionicons name="close" size={20} color={C.textMid} />
									</TouchableOpacity>
								</View>

								<View style={s.modalSearchWrap}>
									<Ionicons name="search-outline" size={18} color={C.sub} />
									<TextInput
										style={s.searchInput}
										placeholder="Rechercher un produit…"
										placeholderTextColor={C.sub}
										value={productQuery}
										onChangeText={setProductQuery}
									/>
								</View>

								<FlatList
									ref={productListRef}
									data={filteredProduits}
									keyExtractor={(item) => String(item.id)}
									keyboardShouldPersistTaps="always"
									keyboardDismissMode="none"
									nestedScrollEnabled
									contentContainerStyle={{ paddingBottom: 10 }}
									renderItem={({ item }) => (
										<TouchableOpacity
											style={s.productRow}
											onPress={() => {
												setLigne(activeLine, 'produit_id', String(item.id));
												setLigne(activeLine, 'nom', item.libelle || `Produit ${item.id}`);
												setLigne(activeLine, 'prix_unitaire', String(item.prix_unitaire || ''));
												setProductQuery('');
												setShowProductModal(false);
											}}
										>
											<View style={s.productRowIcon}>
												<Ionicons name="cube-outline" size={18} color={C.accent} />
											</View>
											<View style={{ flex: 1 }}>
												<Text style={s.productRowName}>{item.libelle}</Text>
												<Text style={s.productRowPrice}>{Number(item.prix_unitaire || 0).toFixed(2)} MAD</Text>
											</View>
											<Ionicons name="chevron-forward" size={16} color={C.sub} />
										</TouchableOpacity>
									)}
									ListEmptyComponent={
										<Text style={s.emptyTxt}>
											{productQuery ? `Aucun résultat pour "${productQuery}"` : 'Aucun produit dans le catalogue.'}
										</Text>
									}
									ItemSeparatorComponent={() => <View style={s.separator} />}
									ListFooterComponent={(
										<>
											<TouchableOpacity
												style={[s.addInlineBtn, showProductForm && s.addInlineBtnActive]}
												onPress={() => setShowProductForm((p) => !p)}
											>
												<Ionicons
													name={showProductForm ? 'close' : 'add-circle-outline'}
													size={16}
													color={C.accent}
												/>
												<Text style={s.addInlineBtnTxt}>
													{showProductForm ? 'Annuler' : 'Nouveau produit'}
												</Text>
											</TouchableOpacity>

											{showProductForm && (
												<View style={s.inlineForm}>
													<Text style={s.inlineFormTitle}>Ajouter un produit</Text>
													<TextInput
														style={s.input}
														placeholder="Nom du produit *"
														placeholderTextColor={C.sub}
														value={productLibelle}
														onChangeText={setProductLibelle}
														onFocus={() => setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120)}
													/>
													<TextInput
														style={s.input}
														placeholder="Prix unitaire *"
														placeholderTextColor={C.sub}
														value={productPrix}
														onChangeText={(v) => setProductPrix(v.replace(',', '.'))}
														keyboardType="decimal-pad"
														onFocus={() => setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120)}
													/>
													<TextInput
														style={s.input}
														placeholder="Description (optionnel)"
														placeholderTextColor={C.sub}
														value={productDescription}
														onChangeText={setProductDescription}
														onFocus={() => setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120)}
													/>
													<Text style={s.fieldLabel}>Unité</Text>
													<View style={s.unitsRow}>
														{PRODUCT_UNITS.map((unit) => (
															<TouchableOpacity
																key={unit}
																style={[s.unitChip, productUnite === unit && s.unitChipActive]}
																onPress={() => setProductUnite(unit)}
															>
																<Text style={[s.unitChipTxt, productUnite === unit && s.unitChipTxtActive]}>
																	{unit}
																</Text>
															</TouchableOpacity>
														))}
													</View>
													<TouchableOpacity
														style={[s.primaryBtn, { marginTop: 10 }, savingProduct && { opacity: 0.7 }]}
														onPress={saveProductForm}
														disabled={savingProduct}
													>
														{savingProduct ? (
															<ActivityIndicator color="#fff" />
														) : (
															<Text style={s.primaryBtnTxt}>Enregistrer le produit</Text>
														)}
													</TouchableOpacity>
												</View>
											)}
										</>
									)}
								/>
							</View>
						</KeyboardAvoidingView>
					</View>
				</Modal>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.bg },
	flex: { flex: 1 },

	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	backBtn: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	title: { color: C.text, fontSize: 18, fontWeight: '800' },

	scroll: { padding: 16, paddingBottom: 140 },

	sectionTitle: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 12 },

	searchWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: C.white,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: C.border,
		paddingHorizontal: 14,
		height: 46,
		gap: 10,
		marginBottom: 10,
		...SHADOW_SM,
	},
	searchInput: { flex: 1, fontSize: 15, color: C.text },

	loadingWrap: { alignItems: 'center', paddingVertical: 32, gap: 12 },
	loadingTxt: { color: C.sub, fontSize: 14, fontWeight: '500' },

	card: {
		backgroundColor: C.white,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: C.border,
		overflow: 'hidden',
		...SHADOW,
	},

	clientRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 12,
	},
	clientRowSelected: { backgroundColor: C.accentLight },
	clientAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: C.bg,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: C.border,
	},
	clientAvatarSelected: { backgroundColor: C.accent, borderColor: C.accent },
	clientAvatarTxt: { color: C.sub, fontSize: 16, fontWeight: '800' },
	clientName: { color: C.text, fontSize: 15, fontWeight: '700' },
	clientNameSelected: { color: C.accent },
	clientEmail: { color: C.sub, fontSize: 12, marginTop: 2 },
	separator: { height: 1, backgroundColor: C.border },

	addInlineBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		margin: 12,
		height: 46,
		borderRadius: 12,
		backgroundColor: C.accentLight,
		borderWidth: 1.5,
		borderColor: C.accentMid,
		borderStyle: 'dashed',
	},
	addInlineBtnActive: { backgroundColor: C.dangerLight, borderColor: C.dangerText },
	addInlineBtnTxt: { color: C.accent, fontSize: 14, fontWeight: '700' },

	inlineForm: {
		margin: 12,
		marginTop: 0,
		padding: 14,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 14,
		backgroundColor: C.bg,
		gap: 10,
	},
	inlineFormTitle: { color: C.text, fontSize: 15, fontWeight: '800', marginBottom: 2 },

	input: {
		height: 46,
		borderWidth: 1.5,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		fontSize: 15,
		color: C.text,
		backgroundColor: C.white,
	},

	emptyTxt: { color: C.sub, textAlign: 'center', marginVertical: 20, fontSize: 14 },

	step2Header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	liveTotalBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		backgroundColor: C.accentLight,
	},
	liveTotalTxt: { color: C.accent, fontSize: 13, fontWeight: '800' },

	lineCard: {
		backgroundColor: C.white,
		borderRadius: 18,
		borderWidth: 1,
		borderColor: C.border,
		padding: 14,
		marginBottom: 12,
		gap: 10,
		...SHADOW,
	},
	lineCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	lineNumber: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: C.accentLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	lineNumberTxt: { color: C.accent, fontSize: 13, fontWeight: '800' },
	lineCardTitle: { flex: 1, color: C.text, fontSize: 15, fontWeight: '700' },
	removeLineBtn: {
		width: 32,
		height: 32,
		borderRadius: 10,
		backgroundColor: C.dangerLight,
		alignItems: 'center',
		justifyContent: 'center',
	},

	suggestWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 10,
		borderRadius: 10,
		backgroundColor: C.accentLight,
	},
	suggestTxt: { flex: 1, color: C.accent, fontSize: 12, fontWeight: '600' },
	suggestApply: { color: C.accent, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },

	productPicker: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		height: 50,
		borderWidth: 1.5,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 14,
		backgroundColor: C.bg,
	},
	productPickerTxt: { flex: 1, color: C.text, fontSize: 15, fontWeight: '600' },
	productPickerPlaceholder: { color: C.sub, fontWeight: '400' },

	qtyPriceRow: { flexDirection: 'row', gap: 12 },
	qtyWrap: { flex: 1, gap: 6 },
	priceWrap: { flex: 1.2, gap: 6 },
	fieldLabel: { color: C.textMid, fontSize: 12, fontWeight: '600' },

	qtyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		height: 46,
		borderWidth: 1.5,
		borderColor: C.border,
		borderRadius: 12,
		backgroundColor: C.bg,
		overflow: 'hidden',
	},
	qtyBtn: {
		width: 40,
		height: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: C.accentLight,
	},
	qtyInput: {
		flex: 1,
		textAlign: 'center',
		color: C.text,
		fontWeight: '800',
		fontSize: 16,
	},
	priceInput: {
		height: 46,
		borderWidth: 1.5,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		fontSize: 15,
		color: C.text,
		backgroundColor: C.bg,
		fontWeight: '700',
	},
	lineTotal: {
		paddingTop: 6,
		borderTopWidth: 1,
		borderTopColor: C.border,
	},
	lineTotalTxt: { color: C.sub, fontSize: 13, fontWeight: '500' },
	lineTotalAmt: { color: C.text, fontWeight: '800' },

	addLineBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 50,
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: C.accentMid,
		borderStyle: 'dashed',
		backgroundColor: C.accentLight,
	},
	addLineBtnTxt: { color: C.accent, fontSize: 15, fontWeight: '700' },

	receiptCard: {
		backgroundColor: C.white,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: C.border,
		overflow: 'hidden',
		...SHADOW,
	},
	receiptHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 16,
		backgroundColor: C.accentLight,
		borderBottomWidth: 1,
		borderBottomColor: C.accentMid,
	},
	receiptTitle: { color: C.accent, fontSize: 16, fontWeight: '800' },
	receiptRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 10,
	},
	receiptLabel: { color: C.sub, fontSize: 14, fontWeight: '500' },
	receiptValue: { color: C.text, fontSize: 14, fontWeight: '700' },
	receiptDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
	receiptLineRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
		gap: 8,
	},
	receiptLineName: { flex: 1, color: C.textMid, fontSize: 13, fontWeight: '600' },
	receiptLineQty: { color: C.sub, fontSize: 13, width: 30, textAlign: 'center' },
	receiptLineTotal: { color: C.text, fontSize: 13, fontWeight: '700', width: 90, textAlign: 'right' },
	receiptTotalRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: C.text,
		borderRadius: 0,
	},
	receiptTotalLabel: { color: C.white, fontSize: 16, fontWeight: '700' },
	receiptTotalAmt: { color: C.white, fontSize: 22, fontWeight: '800' },

	footer: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: C.white,
		paddingHorizontal: 16,
		paddingTop: 12,
		flexDirection: 'row',
		gap: 10,
		borderTopWidth: 1,
		borderTopColor: C.border,
		...SHADOW,
	},
	ghostBtn: {
		flex: 1,
		height: 54,
		borderRadius: 16,
		flexDirection: 'row',
		gap: 6,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
	},
	ghostBtnTxt: { color: C.textMid, fontSize: 15, fontWeight: '700' },
	mainBtn: {
		flex: 2,
		height: 54,
		borderRadius: 16,
		flexDirection: 'row',
		gap: 8,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: C.accent,
		...SHADOW_LG,
	},
	mainBtnSuccess: { backgroundColor: C.success },
	mainBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

	primaryBtn: {
		height: 48,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: C.accent,
		...SHADOW,
	},
	primaryBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },

	modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
	modalSheet: {
		backgroundColor: C.white,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 16,
		maxHeight: Platform.OS === 'android' ? '90%' : '76%',
	},
	modalHandle: {
		width: 40, height: 4, borderRadius: 2,
		backgroundColor: C.border,
		alignSelf: 'center', marginBottom: 12,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	modalTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
	modalCloseBtn: {
		width: 36, height: 36, borderRadius: 10,
		backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
		alignItems: 'center', justifyContent: 'center',
	},
	modalSearchWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: C.bg,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: C.border,
		paddingHorizontal: 12,
		height: 44,
		gap: 8,
		marginBottom: 10,
	},

	productRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 4,
		paddingVertical: 12,
		gap: 12,
	},
	productRowIcon: {
		width: 38, height: 38, borderRadius: 10,
		backgroundColor: C.accentLight,
		alignItems: 'center', justifyContent: 'center',
	},
	productRowName: { color: C.text, fontSize: 15, fontWeight: '700' },
	productRowPrice: { color: C.sub, fontSize: 13, marginTop: 2 },

	unitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
	unitChip: {
		paddingHorizontal: 12, height: 36,
		borderRadius: 10, borderWidth: 1.5, borderColor: C.border,
		justifyContent: 'center', alignItems: 'center',
		backgroundColor: C.white,
	},
	unitChipActive: { backgroundColor: C.accentLight, borderColor: C.accent },
	unitChipTxt: { color: C.textMid, fontWeight: '700', fontSize: 13 },
	unitChipTxtActive: { color: C.accent },
});
