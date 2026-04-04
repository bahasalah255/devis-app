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

const STATUTS = ['brouillon', 'envoye', 'accepte', 'refuse'];
const PRODUCT_UNITS = ['unite', 'kg', 'litre', 'metre'];

const calcLigne = (line) => {
	const q = Number(line.quantite || 0);
	const p = Number(line.prix_unitaire || 0);
	const r = Number(line.remise || 0);
	return q * p * (1 - r / 100);
};

export default function Update({ navigation, route }) {
	const insets = useSafeAreaInsets();
	const { devis: initial } = route.params;

	const [clientId, setClientId] = useState(String(initial.client_id));
	const [statut, setStatut] = useState(initial.statut || 'brouillon');
	const [lignes, setLignes] = useState(
		(initial.lignes || []).map((l) => ({
			produit_id: l.produit_id ? String(l.produit_id) : '',
			nom: l.produit?.libelle || l.description || '',
			description: l.description || '',
			quantite: String(l.quantite || 1),
			prix_unitaire: String(l.prix_unitaire || 0),
			remise: String(l.remise || 0),
		}))
	);
	const [clients, setClients] = useState([]);
	const [produits, setProduits] = useState([]);
	const [loadingRefs, setLoadingRefs] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showClients, setShowClients] = useState(false);
	const [showProduits, setShowProduits] = useState(false);
	const [showStatut, setShowStatut] = useState(false);
	const [activeLine, setActiveLine] = useState(0);
	const [clientQuery, setClientQuery] = useState('');
	const [productQuery, setProductQuery] = useState('');
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
	const clientListRef = useRef(null);
	const productListRef = useRef(null);

	const client = clients.find((c) => String(c.id) === String(clientId));

	useEffect(() => {
		if (!showClientForm) return;
		setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 120);
		setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 300);
	}, [showClientForm]);

	useEffect(() => {
		if (!showProductForm) return;
		setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120);
		setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 300);
	}, [showProductForm]);

	useEffect(() => {
		if (!showClients && !showProduits) return;
		const eventName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
		const sub = Keyboard.addListener(eventName, () => {
			if (showClientForm && showClients) {
				setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 120);
				setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 280);
			}
			if (showProductForm && showProduits) {
				setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120);
				setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 280);
			}
		});

		return () => sub.remove();
	}, [showClients, showProduits, showClientForm, showProductForm]);

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
				Alert.alert('Erreur', 'Chargement des références impossible.');
			} finally {
				setLoadingRefs(false);
			}
		})();
	}, []);

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

					const params = {
						margin_percent: 10,
						default_price: Number(line.prix_unitaire || 0) || 0,
					};
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

		return () => {
			cancelled = true;
		};
	}, [suggestionSignature]);

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

	const setLigne = (index, key, value) => {
		setLignes((prev) => prev.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
	};

	const applySuggestedPrice = (index) => {
		const suggestion = priceSuggestions[index];
		const suggestedPrice = Number(suggestion?.suggested_price || 0);
		if (!suggestedPrice) return;
		setLigne(index, 'prix_unitaire', String(suggestedPrice));
	};

	const totalHT = useMemo(() => lignes.reduce((sum, l) => sum + calcLigne(l), 0), [lignes]);
	const totalTTC = totalHT * 1.2;

	const submit = async () => {
		if (!clientId) {
			Alert.alert('Client requis', 'Veuillez choisir un client.');
			return;
		}
		if (lignes.some((l) => !l.nom || !l.quantite || !l.prix_unitaire)) {
			Alert.alert('Lignes incomplètes', 'Chaque ligne doit avoir produit, quantité et prix.');
			return;
		}

		setSaving(true);
		try {
			const token = await AsyncStorage.getItem('token');
			const selectedClient = clients.find((c) => String(c.id) === String(clientId));
			const normalizedEmail = String(selectedClient?.email || initial.email || '').trim();
			const payload = {
				client_id: Number(clientId),
				statut,
				date_emission: initial.date_emission,
				date_validite: initial.date_validite,
				lignes: lignes.map((l) => ({
					produit_id: l.produit_id ? Number(l.produit_id) : null,
					description: l.description || l.nom,
					quantite: Number(l.quantite),
					prix_unitaire: Number(l.prix_unitaire),
					remise: Number(l.remise || 0),
				})),
			};

			if (normalizedEmail) {
				payload.email = normalizedEmail;
			}
			await axios.put(
				`${API_BASE_URL}/devis/${initial.id}`,
				payload,
				{ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
			);

			Alert.alert('Succès', 'Devis mis à jour.', [{ text: 'OK', onPress: () => navigation.replace('Dash') }]);
		} catch {
			Alert.alert('Erreur', 'Impossible de mettre à jour le devis.');
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
			setShowClients(false);
		} catch (error) {
			const apiErrors = error?.response?.data?.errors;
			if (apiErrors) {
				const firstError = Object.values(apiErrors)?.[0]?.[0];
				Alert.alert('Validation', firstError || 'Données client invalides.');
			} else {
				const message = error?.response?.data?.message;
				Alert.alert('Erreur', message || 'Impossible de créer le client.');
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
			setShowProduits(false);
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
					<Text style={s.backBtnTxt}>← Retour</Text>
				</TouchableOpacity>
				<Text style={s.title}>{initial.numero || `DEV-${initial.id}`}</Text>
			</View>

			<ScrollView
				contentContainerStyle={s.scroll}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				keyboardDismissMode="on-drag"
			>
				<View style={s.card}>
					<Text style={s.cardTitle}>Client et statut</Text>
					<TouchableOpacity style={s.select} onPress={() => setShowClients(true)} disabled={loadingRefs}>
						<Text style={s.selectLabel}>Client</Text>
						<Text style={s.selectValue}>{client ? client.nom : 'Choisir'}</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[s.select, { marginTop: 10 }]} onPress={() => setShowStatut(true)}>
						<Text style={s.selectLabel}>Statut</Text>
						<Text style={s.selectValue}>{statut}</Text>
					</TouchableOpacity>
				</View>

				<View style={s.card}>
					<View style={s.rowBetween}>
						<Text style={s.cardTitle}>Lignes</Text>
						<TouchableOpacity style={s.linkBtn} onPress={() => setLignes((p) => [...p, { produit_id: '', nom: '', description: '', quantite: '1', prix_unitaire: '', remise: '0' }])}>
							<Text style={s.linkBtnTxt}>+ Ajouter</Text>
						</TouchableOpacity>
					</View>

					{lignes.map((line, index) => (
						<View key={index} style={s.lineCard}>
							{(() => {
								const suggestion = priceSuggestions[index];
								if (!suggestion?.suggested_price) return null;
								return (
									<View style={s.suggestWrap}>
										<Text style={s.suggestTxt}>
											Suggéré: {Number(suggestion.suggested_price).toFixed(2)} MAD
											 {' '}· Dernier: {Number(suggestion.last_price || 0).toFixed(2)}
											 {' '}· Moy: {Number(suggestion.average_price || 0).toFixed(2)}
										</Text>
										<TouchableOpacity style={s.suggestBtn} onPress={() => applySuggestedPrice(index)}>
											<Text style={s.suggestBtnTxt}>Appliquer</Text>
										</TouchableOpacity>
									</View>
								);
							})()}

							<TouchableOpacity style={s.select} onPress={() => { setActiveLine(index); setShowProduits(true); }}>
								<Text style={s.selectLabel}>Produit</Text>
								<Text style={s.selectValue}>{line.nom || 'Choisir'}</Text>
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
							/>

							{lignes.length > 1 && (
								<TouchableOpacity style={s.removeBtn} onPress={() => setLignes((p) => p.filter((_, i) => i !== index))}>
									<Text style={s.removeBtnTxt}>Supprimer la ligne</Text>
								</TouchableOpacity>
							)}
						</View>
					))}
				</View>

				<View style={s.card}>
					<Text style={s.cardTitle}>Résumé</Text>
					<Text style={s.summaryText}>Total HT: {totalHT.toFixed(2)} MAD</Text>
					<Text style={s.summaryText}>TVA (20%): {(totalTTC - totalHT).toFixed(2)} MAD</Text>
					<Text style={s.summaryTotal}>Total TTC: {totalTTC.toFixed(2)} MAD</Text>
				</View>

				<TouchableOpacity style={[s.mainBtn, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
					{saving ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnTxt}>Enregistrer les modifications</Text>}
				</TouchableOpacity>
			</ScrollView>

			<Modal visible={showClients} transparent animationType="slide">
				<View style={s.modalOverlay}>
					<KeyboardAvoidingView
						style={s.modalKeyboard}
						behavior="padding"
						keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 24}
					>
						<View style={[s.modalSheet, { paddingBottom: 14 + Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 0) }]}>
						<View style={s.modalHeader}>
							<Text style={s.modalTitle}>Choisir un client</Text>
							<TouchableOpacity onPress={() => setShowClients(false)}><Text style={s.closeTxt}>Fermer</Text></TouchableOpacity>
						</View>
						<TextInput style={s.search} value={clientQuery} onChangeText={setClientQuery} placeholder="Rechercher client" placeholderTextColor={C.sub} />
						<FlatList
							ref={clientListRef}
							data={filteredClients}
							keyExtractor={(item) => String(item.id)}
							keyboardShouldPersistTaps="always"
							keyboardDismissMode="none"
							nestedScrollEnabled
							contentContainerStyle={[s.modalListContent, { paddingBottom: 10 + Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0) }]}
							renderItem={({ item }) => (
								<TouchableOpacity style={s.itemRow} onPress={() => { setClientId(String(item.id)); setShowClients(false); }}>
									<Text style={s.itemMain}>{item.nom}</Text>
								</TouchableOpacity>
							)}
							ListFooterComponent={(
								<>
									<TouchableOpacity style={s.addInlineBtn} onPress={() => setShowClientForm((p) => !p)}>
										<Text style={s.addInlineBtnTxt}>{showClientForm ? 'Annuler' : '+ Ajouter un client'}</Text>
									</TouchableOpacity>

									{showClientForm && (
										<View style={s.inlineForm}>
											<TextInput style={s.input} placeholder="Nom du client" placeholderTextColor={C.sub} value={clientNom} onChangeText={setClientNom} onFocus={() => {
												setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 120);
												setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 280);
											}} />
											<TextInput style={s.input} placeholder="Email (optionnel)" placeholderTextColor={C.sub} value={clientEmail} onChangeText={setClientEmail} autoCapitalize="none" keyboardType="email-address" onFocus={() => {
												setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 120);
												setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 280);
											}} />
											<TextInput style={s.input} placeholder="Téléphone (optionnel)" placeholderTextColor={C.sub} value={clientTel} onChangeText={setClientTel} keyboardType="phone-pad" onFocus={() => {
												setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 120);
												setTimeout(() => clientListRef.current?.scrollToEnd({ animated: true }), 280);
											}} />
											<TouchableOpacity style={[s.mainBtn, { marginTop: 10 }, savingClient && { opacity: 0.7 }]} onPress={saveClientForm} disabled={savingClient}>
												{savingClient ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnTxt}>Enregistrer le client</Text>}
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

			<Modal visible={showProduits} transparent animationType="slide">
				<View style={s.modalOverlay}>
					<KeyboardAvoidingView
						style={s.modalKeyboard}
						behavior="padding"
						keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 24}
					>
						<View style={[s.modalSheet, { paddingBottom: 14 + Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 0) }]}>
						<View style={s.modalHeader}>
							<Text style={s.modalTitle}>Choisir un produit</Text>
							<TouchableOpacity onPress={() => setShowProduits(false)}><Text style={s.closeTxt}>Fermer</Text></TouchableOpacity>
						</View>
						<TextInput style={s.search} value={productQuery} onChangeText={setProductQuery} placeholder="Rechercher produit" placeholderTextColor={C.sub} />
						<FlatList
							ref={productListRef}
							data={filteredProduits}
							keyExtractor={(item) => String(item.id)}
							keyboardShouldPersistTaps="always"
							keyboardDismissMode="none"
							nestedScrollEnabled
							contentContainerStyle={[s.modalListContent, { paddingBottom: 10 + Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0) }]}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={s.itemRow}
									onPress={() => {
										setLigne(activeLine, 'produit_id', String(item.id));
										setLigne(activeLine, 'nom', item.libelle || `Produit ${item.id}`);
										setLigne(activeLine, 'prix_unitaire', String(item.prix_unitaire || ''));
										setShowProduits(false);
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
											<TextInput style={s.input} placeholder="Nom du produit" placeholderTextColor={C.sub} value={productLibelle} onChangeText={setProductLibelle} onFocus={() => {
												setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120);
												setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 280);
											}} />
											<TextInput style={s.input} placeholder="Prix unitaire" placeholderTextColor={C.sub} value={productPrix} onChangeText={(v) => setProductPrix(v.replace(',', '.'))} keyboardType="decimal-pad" onFocus={() => {
												setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120);
												setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 280);
											}} />
											<TextInput style={s.input} placeholder="Description (optionnel)" placeholderTextColor={C.sub} value={productDescription} onChangeText={setProductDescription} onFocus={() => {
												setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 120);
												setTimeout(() => productListRef.current?.scrollToEnd({ animated: true }), 280);
											}} />
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
						/>
						</View>
					</KeyboardAvoidingView>
				</View>
			</Modal>

			<Modal visible={showStatut} transparent animationType="fade">
				<View style={s.modalOverlay}>
					<View style={[s.modalSheet, { maxHeight: 260 }]}> 
						<View style={s.modalHeader}>
							<Text style={s.modalTitle}>Statut</Text>
							<TouchableOpacity onPress={() => setShowStatut(false)}><Text style={s.closeTxt}>Fermer</Text></TouchableOpacity>
						</View>
						{STATUTS.map((st) => (
							<TouchableOpacity key={st} style={s.itemRow} onPress={() => { setStatut(st); setShowStatut(false); }}>
								<Text style={s.itemMain}>{st}</Text>
							</TouchableOpacity>
						))}
					</View>
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
	backBtnTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
	title: { color: C.text, fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'right' },
	scroll: { padding: 16, paddingBottom: 24, gap: 12 },
	card: {
		backgroundColor: C.white,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: C.border,
		padding: 12,
		...SHADOW,
	},
	cardTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
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
	rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	linkBtn: { paddingHorizontal: 10, paddingVertical: 4 },
	linkBtnTxt: { color: C.accent, fontSize: 14, fontWeight: '700' },
	lineCard: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, marginBottom: 10 },
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
		width: 70,
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
	removeBtnTxt: { color: '#C62828', fontWeight: '700' },
	suggestWrap: {
		marginBottom: 8,
		padding: 8,
		borderRadius: 10,
		backgroundColor: '#EEF0FF',
		borderWidth: 1,
		borderColor: C.border,
	},
	suggestTxt: { color: C.text, fontSize: 12, fontWeight: '600' },
	suggestBtn: {
		marginTop: 6,
		alignSelf: 'flex-start',
		paddingHorizontal: 10,
		height: 30,
		borderRadius: 8,
		backgroundColor: C.accent,
		justifyContent: 'center',
	},
	suggestBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
	summaryText: { color: C.sub, fontSize: 14, marginBottom: 4 },
	summaryTotal: { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
	mainBtn: {
		height: 52,
		borderRadius: 14,
		backgroundColor: C.accent,
		alignItems: 'center',
		justifyContent: 'center',
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
		maxHeight: Platform.OS === 'android' ? '88%' : '72%',
	},
	modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
	modalTitle: { color: C.text, fontSize: 17, fontWeight: '800' },
	closeTxt: { color: C.accent, fontWeight: '700' },
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
	itemMain: { color: C.text, fontSize: 15, fontWeight: '700' },
	itemSub: { color: C.sub, fontSize: 13, marginTop: 2 },
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
 	modalListContent: { paddingBottom: 8 },
});
