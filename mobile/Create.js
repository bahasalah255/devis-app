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
	Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from './config';

const C = {
	bg: '#F2F2F7',
	white: '#FFFFFF',
	accent: '#4F46E5',
	text: '#1C1C1E',
	sub: '#8E8E93',
	border: '#E5E5EA',
};

const SHADOW = {
	shadowColor: '#000',
	shadowOpacity: 0.06,
	shadowRadius: 8,
	shadowOffset: { width: 0, height: 3 },
	elevation: 2,
};

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

const PRODUCT_UNITS = ['unite', 'kg', 'litre', 'metre'];

export default function Create({ navigation }) {
	const [step, setStep] = useState(1);
	const [clientId, setClientId] = useState('');
	const [clients, setClients] = useState([]);
	const [produits, setProduits] = useState([]);
	const [lignes, setLignes] = useState([makeLine()]);

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

	const [loadingRefs, setLoadingRefs] = useState(true);
	const [saving, setSaving] = useState(false);
	const mainScrollRef = useRef(null);
	const productListRef = useRef(null);

	const client = clients.find((c) => String(c.id) === String(clientId));
	const totalHT = useMemo(() => lignes.reduce((sum, l) => sum + calcLigne(l), 0), [lignes]);
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
		setTimeout(() => {
			productListRef.current?.scrollToEnd({ animated: true });
		}, 140);
	}, [showProductForm]);

	const setLigne = (index, key, value) => {
		setLignes((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
	};

	const canGoStep2 = Boolean(clientId);
	const canGoStep3 = lignes.length > 0 && lignes.every((l) => l.nom && Number(l.quantite) > 0 && Number(l.prix_unitaire) > 0);

	const nextStep = () => {
		if (step === 1 && !canGoStep2) {
			Alert.alert('Client requis', 'Choisissez un client pour continuer.');
			return;
		}
		if (step === 2 && !canGoStep3) {
			Alert.alert('Lignes incomplètes', 'Ajoutez au moins une ligne complète.');
			return;
		}
		setStep((s) => Math.min(3, s + 1));
	};

	const submit = async () => {
		if (!canGoStep2 || !canGoStep3) {
			Alert.alert('Vérification', 'Vérifiez le client et les lignes du devis.');
			return;
		}

		setSaving(true);
		try {
			const token = await AsyncStorage.getItem('token');
			const dateEm = new Date();
			const dateVal = new Date();
			dateVal.setDate(dateVal.getDate() + 30);

			await axios.post(
				`${API_BASE_URL}/devis`,
				{
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
				},
				{ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
			);

			Alert.alert('Succès', 'Devis créé avec succès.', [{ text: 'OK', onPress: () => navigation.replace('Dash') }]);
		} catch (e) {
			if (e?.response?.status === 422) Alert.alert('Validation', 'Vérifiez les informations saisies.');
			else Alert.alert('Erreur', 'Impossible de créer le devis.');
		} finally {
			setSaving(false);
		}
	};

	const saveClientForm = async () => {
		if (savingClient) return;
		if (!clientNom.trim()) {
			Alert.alert('Client', 'Le nom du client est requis.');
			return;
		}
		setSavingClient(true);
		try {
			const token = await AsyncStorage.getItem('token');
			const response = await axios.post(
				`${API_BASE_URL}/clients`,
				{
					nom: clientNom.trim(),
					email: clientEmail.trim() || null,
					telephone: clientTel.trim() || null,
					adresse: null,
				},
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			const created = response?.data;
			if (!created?.id) {
				Alert.alert('Erreur', 'Client créé mais ID invalide.');
				return;
			}

			setClients((prev) => [created, ...prev]);
			setClientId(String(created.id));
			setClientNom('');
			setClientEmail('');
			setClientTel('');
			setShowClientForm(false);
		} catch (error) {
			const apiErrors = error?.response?.data?.errors;
			if (apiErrors) {
				const firstError = Object.values(apiErrors)?.[0]?.[0];
				Alert.alert('Validation', firstError || 'Données client invalides.');
			} else {
				Alert.alert('Erreur', 'Impossible de créer le client.');
			}
		} finally {
			setSavingClient(false);
		}
	};

	const saveProductForm = async () => {
		if (savingProduct) return;
		if (!productLibelle.trim()) {
			Alert.alert('Produit', 'Le nom du produit est requis.');
			return;
		}
		if (!productPrix.trim()) {
			Alert.alert('Produit', 'Le prix est requis.');
			return;
		}

		const parsedPrice = Number(String(productPrix).replace(',', '.'));
		if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
			Alert.alert('Produit', 'Le prix unitaire doit être un nombre positif.');
			return;
		}

		const normalizedUnit = String(productUnite || '').trim().toLowerCase();
		if (!PRODUCT_UNITS.includes(normalizedUnit)) {
			Alert.alert('Produit', 'Veuillez choisir une unité valide (unite, kg, litre, metre).');
			return;
		}

		setSavingProduct(true);
		try {
			const token = await AsyncStorage.getItem('token');
			const response = await axios.post(
				`${API_BASE_URL}/produits`,
				{
					libelle: productLibelle.trim(),
					description: productDescription.trim() || null,
					prix_unitaire: parsedPrice,
					unite: normalizedUnit,
				},
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			const created = response?.data;
			if (!created?.id) {
				Alert.alert('Erreur', 'Produit créé mais ID invalide.');
				return;
			}

			setProduits((prev) => [created, ...prev]);
			setLigne(activeLine, 'produit_id', String(created.id));
			setLigne(activeLine, 'nom', created.libelle || `Produit ${created.id}`);
			setLigne(activeLine, 'prix_unitaire', String(created.prix_unitaire || ''));
			setLigne(activeLine, 'description', created.description || '');
			setProductLibelle('');
			setProductPrix('');
			setProductDescription('');
			setProductUnite('unite');
			setShowProductForm(false);
			setShowProductModal(false);
		} catch (error) {
			const apiErrors = error?.response?.data?.errors;
			if (apiErrors) {
				const firstError = Object.values(apiErrors)?.[0]?.[0];
				Alert.alert('Validation', firstError || 'Données produit invalides.');
			} else {
				const message = error?.response?.data?.message;
				Alert.alert('Erreur', message || 'Impossible de créer le produit.');
			}
		} finally {
			setSavingProduct(false);
		}
	};

	return (
		<SafeAreaView style={s.safe}>
			<KeyboardAvoidingView
				style={s.keyboardRoot}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
			>
			<View style={s.header}>
				<TouchableOpacity style={s.backBtn} onPress={() => navigation.replace('Dash')}>
					<Text style={s.backTxt}>← Retour</Text>
				</TouchableOpacity>
				<Text style={s.title}>Nouveau devis</Text>
			</View>

			<View style={s.stepsRow}>
				<View style={[s.stepPill, step >= 1 && s.stepPillActive]}><Text style={[s.stepTxt, step >= 1 && s.stepTxtActive]}>1. Client</Text></View>
				<View style={[s.stepPill, step >= 2 && s.stepPillActive]}><Text style={[s.stepTxt, step >= 2 && s.stepTxtActive]}>2. Lignes</Text></View>
				<View style={[s.stepPill, step >= 3 && s.stepPillActive]}><Text style={[s.stepTxt, step >= 3 && s.stepTxtActive]}>3. Confirmation</Text></View>
			</View>

			<ScrollView
				ref={mainScrollRef}
				contentContainerStyle={s.scroll}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
			>
				{step === 1 && (
					<View style={s.card}>
						<Text style={s.cardTitle}>Choisir un client</Text>
						<TextInput
							style={s.search}
							placeholder="Rechercher par nom ou email"
							placeholderTextColor={C.sub}
							value={clientQuery}
							onChangeText={setClientQuery}
						/>
						{loadingRefs ? (
							<ActivityIndicator color={C.accent} style={{ marginTop: 10 }} />
						) : (
							<>
								<FlatList
									data={filteredClients}
									keyExtractor={(item) => String(item.id)}
									scrollEnabled={false}
									renderItem={({ item }) => (
										<TouchableOpacity
											style={[s.itemRow, String(clientId) === String(item.id) && s.itemRowActive]}
											onPress={() => setClientId(String(item.id))}
										>
											<Text style={s.itemMain}>{item.nom}</Text>
											{!!item.email && <Text style={s.itemSub}>{item.email}</Text>}
										</TouchableOpacity>
									)}
									ListEmptyComponent={<Text style={s.empty}>Aucun client trouvé.</Text>}
								/>

								<TouchableOpacity style={s.addInlineBtn} onPress={() => setShowClientForm((p) => !p)}>
									<Text style={s.addInlineBtnTxt}>{showClientForm ? 'Annuler' : '+ Ajouter un client'}</Text>
								</TouchableOpacity>

								{showClientForm && (
									<View style={s.inlineForm}>
										<TextInput style={s.input} placeholder="Nom du client" placeholderTextColor={C.sub} value={clientNom} onChangeText={setClientNom} onFocus={() => mainScrollRef.current?.scrollTo({ y: 320, animated: true })} />
										<TextInput style={s.input} placeholder="Email (optionnel)" placeholderTextColor={C.sub} value={clientEmail} onChangeText={setClientEmail} autoCapitalize="none" keyboardType="email-address" onFocus={() => mainScrollRef.current?.scrollTo({ y: 380, animated: true })} />
										<TextInput style={s.input} placeholder="Téléphone (optionnel)" placeholderTextColor={C.sub} value={clientTel} onChangeText={setClientTel} keyboardType="phone-pad" onFocus={() => mainScrollRef.current?.scrollTo({ y: 440, animated: true })} />
										<TouchableOpacity style={[s.mainBtn, { marginTop: 10 }, savingClient && { opacity: 0.7 }]} onPress={saveClientForm} disabled={savingClient}>
											{savingClient ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnTxt}>Enregistrer le client</Text>}
										</TouchableOpacity>
									</View>
								)}
							</>
						)}
					</View>
				)}

				{step === 2 && (
					<View style={s.card}>
						<View style={s.rowBetween}>
							<Text style={s.cardTitle}>Ajouter les produits</Text>
							<TouchableOpacity style={s.linkBtn} onPress={() => setLignes((p) => [...p, makeLine()])}>
								<Text style={s.linkBtnTxt}>+ Ligne</Text>
							</TouchableOpacity>
						</View>

						{lignes.map((line, index) => (
							<View key={index} style={s.lineCard}>
								<TouchableOpacity style={s.select} onPress={() => { setActiveLine(index); setShowProductModal(true); }}>
									<Text style={s.selectLabel}>Produit</Text>
									<Text style={s.selectValue}>{line.nom || 'Choisir un produit'}</Text>
								</TouchableOpacity>

								<View style={s.qtyRow}>
									<TouchableOpacity style={s.qtyBtn} onPress={() => setLigne(index, 'quantite', String(Math.max(1, Number(line.quantite || 1) - 1)))}>
										<Text style={s.qtyBtnTxt}>−</Text>
									</TouchableOpacity>
									<TextInput
										style={s.qtyInput}
										value={line.quantite}
										onChangeText={(v) => setLigne(index, 'quantite', v.replace(/[^0-9]/g, '') || '1')}
										keyboardType="numeric"
										onFocus={() => mainScrollRef.current?.scrollTo({ y: 260 + index * 180, animated: true })}
									/>
									<TouchableOpacity style={s.qtyBtn} onPress={() => setLigne(index, 'quantite', String(Number(line.quantite || 1) + 1))}>
										<Text style={s.qtyBtnTxt}>+</Text>
									</TouchableOpacity>
								</View>

								<TextInput
									style={s.input}
									value={line.prix_unitaire}
									onChangeText={(v) => setLigne(index, 'prix_unitaire', v.replace(',', '.'))}
									keyboardType="decimal-pad"
									placeholder="Prix unitaire"
									placeholderTextColor={C.sub}
									onFocus={() => mainScrollRef.current?.scrollTo({ y: 300 + index * 180, animated: true })}
								/>

								<TextInput
									style={s.input}
									value={line.description}
									onChangeText={(v) => setLigne(index, 'description', v)}
									placeholder="Description (optionnel)"
									placeholderTextColor={C.sub}
									onFocus={() => mainScrollRef.current?.scrollTo({ y: 340 + index * 180, animated: true })}
								/>

								{lignes.length > 1 && (
									<TouchableOpacity style={s.removeBtn} onPress={() => setLignes((p) => p.filter((_, i) => i !== index))}>
										<Text style={s.removeTxt}>Supprimer la ligne</Text>
									</TouchableOpacity>
								)}
							</View>
						))}
					</View>
				)}

				{step === 3 && (
					<View style={s.card}>
						<Text style={s.cardTitle}>Confirmer le devis</Text>
						<Text style={s.resumeLine}>Client: <Text style={s.resumeStrong}>{client?.nom || '-'}</Text></Text>
						<Text style={s.resumeLine}>Nombre de lignes: <Text style={s.resumeStrong}>{lignes.length}</Text></Text>
						<Text style={s.resumeLine}>Total HT: <Text style={s.resumeStrong}>{totalHT.toFixed(2)} MAD</Text></Text>
						<Text style={s.resumeLine}>TVA (20%): <Text style={s.resumeStrong}>{(totalTTC - totalHT).toFixed(2)} MAD</Text></Text>
						<Text style={s.totalTtc}>Total TTC: {totalTTC.toFixed(2)} MAD</Text>
					</View>
				)}
			</ScrollView>

			<View style={s.footerActions}>
				{step > 1 && (
					<TouchableOpacity style={s.ghostBtn} onPress={() => setStep((s) => Math.max(1, s - 1))}>
						<Text style={s.ghostBtnTxt}>Précédent</Text>
					</TouchableOpacity>
				)}

				{step < 3 ? (
					<TouchableOpacity style={s.mainBtn} onPress={nextStep}>
						<Text style={s.mainBtnTxt}>Continuer</Text>
					</TouchableOpacity>
				) : (
					<TouchableOpacity style={[s.mainBtn, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
						{saving ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnTxt}>Créer le devis</Text>}
					</TouchableOpacity>
				)}
			</View>

			<Modal visible={showProductModal} transparent animationType="slide">
				<View style={s.modalOverlay}>
					<KeyboardAvoidingView
						style={s.modalKeyboard}
						behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
						keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
					>
						<View style={s.modalSheet}>
						<View style={s.modalHeader}>
							<Text style={s.modalTitle}>Choisir un produit</Text>
							<TouchableOpacity onPress={() => setShowProductModal(false)}><Text style={s.closeTxt}>Fermer</Text></TouchableOpacity>
						</View>
						<TextInput
							style={s.search}
							placeholder="Rechercher un produit"
							placeholderTextColor={C.sub}
							value={productQuery}
							onChangeText={setProductQuery}
						/>
						<FlatList
							ref={productListRef}
							data={filteredProduits}
							keyExtractor={(item) => String(item.id)}
							keyboardShouldPersistTaps="always"
							nestedScrollEnabled
							contentContainerStyle={s.modalListContent}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={s.itemRow}
									onPress={() => {
										setLigne(activeLine, 'produit_id', String(item.id));
										setLigne(activeLine, 'nom', item.libelle || `Produit ${item.id}`);
										setLigne(activeLine, 'prix_unitaire', String(item.prix_unitaire || ''));
										setShowProductModal(false);
									}}
								>
									<Text style={s.itemMain}>{item.libelle}</Text>
									<Text style={s.itemSub}>{Number(item.prix_unitaire || 0).toFixed(2)} MAD</Text>
								</TouchableOpacity>
							)}
							ListFooterComponent={(
								<>
									<TouchableOpacity style={s.addInlineBtn} onPress={() => setShowProductForm((p) => !p)}>
										<Text style={s.addInlineBtnTxt}>{showProductForm ? 'Annuler' : '+ Ajouter un produit'}</Text>
									</TouchableOpacity>

									{showProductForm && (
										<View style={s.inlineForm}>
											<TextInput style={s.input} placeholder="Nom du produit" placeholderTextColor={C.sub} value={productLibelle} onChangeText={setProductLibelle} onFocus={() => productListRef.current?.scrollToEnd({ animated: true })} />
											<TextInput style={s.input} placeholder="Prix unitaire" placeholderTextColor={C.sub} value={productPrix} onChangeText={(v) => setProductPrix(v.replace(',', '.'))} keyboardType="decimal-pad" onFocus={() => productListRef.current?.scrollToEnd({ animated: true })} />
											<TextInput style={s.input} placeholder="Description (optionnel)" placeholderTextColor={C.sub} value={productDescription} onChangeText={setProductDescription} onFocus={() => productListRef.current?.scrollToEnd({ animated: true })} />
											<Text style={s.unitLabel}>Unité</Text>
											<View style={s.unitRow}>
												{PRODUCT_UNITS.map((unit) => (
													<TouchableOpacity
														key={unit}
														style={[s.unitChip, productUnite === unit && s.unitChipActive]}
														onPress={() => setProductUnite(unit)}
													>
														<Text style={[s.unitChipTxt, productUnite === unit && s.unitChipTxtActive]}>{unit}</Text>
													</TouchableOpacity>
												))}
											</View>
											<TouchableOpacity style={[s.mainBtn, { marginTop: 10 }, savingProduct && { opacity: 0.7 }]} onPress={saveProductForm} disabled={savingProduct}>
												{savingProduct ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnTxt}>Enregistrer le produit</Text>}
											</TouchableOpacity>
										</View>
									)}
								</>
							)}
							ListEmptyComponent={<Text style={s.empty}>Aucun produit trouvé.</Text>}
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
	keyboardRoot: { flex: 1 },
	header: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backBtn: {
		height: 40,
		paddingHorizontal: 12,
		borderRadius: 12,
		justifyContent: 'center',
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
	},
	backTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
	title: { color: C.text, fontSize: 22, fontWeight: '800', flex: 1, textAlign: 'right' },

	stepsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
	stepPill: {
		flex: 1,
		height: 34,
		borderRadius: 12,
		backgroundColor: '#E8E8EC',
		justifyContent: 'center',
		alignItems: 'center',
	},
	stepPillActive: { backgroundColor: '#E9EAFF' },
	stepTxt: { color: C.sub, fontSize: 12, fontWeight: '700' },
	stepTxtActive: { color: C.accent },

	scroll: { padding: 16, paddingTop: 2, paddingBottom: 140 },
	card: {
		backgroundColor: C.white,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: C.border,
		padding: 12,
		...SHADOW,
	},
	cardTitle: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 10 },
	search: {
		height: 46,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		fontSize: 15,
		color: C.text,
		backgroundColor: '#FAFAFB',
		marginBottom: 10,
	},
	itemRow: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	itemRowActive: { backgroundColor: '#EEF0FF', borderRadius: 10, paddingHorizontal: 10 },
	itemMain: { color: C.text, fontSize: 15, fontWeight: '700' },
	itemSub: { color: C.sub, fontSize: 12, marginTop: 2 },
	addInlineBtn: {
		height: 44,
		borderRadius: 12,
		backgroundColor: '#EEF0FF',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 10,
	},
	addInlineBtnTxt: { color: C.accent, fontSize: 14, fontWeight: '700' },
	inlineForm: {
		marginTop: 10,
		padding: 10,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		backgroundColor: '#FAFAFB',
	},
	unitLabel: { color: C.sub, fontSize: 13, fontWeight: '700', marginTop: 10 },
	unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
	unitChip: {
		paddingHorizontal: 10,
		height: 34,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: C.border,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: C.white,
	},
	unitChipActive: {
		backgroundColor: '#EEF0FF',
		borderColor: C.accent,
	},
	unitChipTxt: { color: C.text, fontWeight: '700', fontSize: 13 },
	unitChipTxtActive: { color: C.accent },
	empty: { color: C.sub, textAlign: 'center', marginTop: 14 },

	rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	linkBtn: { paddingHorizontal: 10, paddingVertical: 4 },
	linkBtnTxt: { color: C.accent, fontSize: 14, fontWeight: '700' },

	lineCard: {
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		padding: 10,
		marginBottom: 10,
	},
	select: {
		height: 48,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		backgroundColor: '#FAFAFB',
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	selectLabel: { color: C.sub, fontSize: 13 },
	selectValue: { color: C.text, fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' },
	qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
	qtyBtn: {
		width: 38,
		height: 38,
		borderRadius: 10,
		backgroundColor: '#EEF0FF',
		justifyContent: 'center',
		alignItems: 'center',
	},
	qtyBtnTxt: { color: C.accent, fontSize: 20, fontWeight: '800' },
	qtyInput: {
		width: 72,
		height: 38,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 10,
		textAlign: 'center',
		color: C.text,
		fontWeight: '700',
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
		marginTop: 8,
	},
	removeBtn: { marginTop: 8, alignItems: 'center' },
	removeTxt: { color: '#C62828', fontWeight: '700' },

	resumeLine: { color: C.sub, fontSize: 14, marginBottom: 6 },
	resumeStrong: { color: C.text, fontWeight: '700' },
	totalTtc: { color: C.text, fontSize: 20, fontWeight: '800', marginTop: 6 },

	footerActions: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: C.bg,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 14,
		flexDirection: 'row',
		gap: 10,
		borderTopWidth: 1,
		borderTopColor: C.border,
	},
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
		flex: 1.4,
		height: 52,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: C.accent,
		...SHADOW,
	},
	mainBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },

	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
	},
	modalKeyboard: { flex: 1, justifyContent: 'flex-end' },
	modalSheet: {
		backgroundColor: C.white,
		borderTopLeftRadius: 18,
		borderTopRightRadius: 18,
		padding: 14,
		maxHeight: '72%',
	},
	modalListContent: { paddingBottom: 6 },
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
	modalTitle: { color: C.text, fontSize: 17, fontWeight: '800' },
	closeTxt: { color: C.accent, fontWeight: '700' },
});
