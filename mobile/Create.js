import React, { useEffect, useState } from 'react';
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
	Platform,
	KeyboardAvoidingView,
	Button
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from './config';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const C = {
	bg:     '#F2F2F7',
	white:  '#FFFFFF',
	border: '#E5E5EA',
	text:   '#000000',
	sub:    '#8E8E93',
	accent: '#4F46E5',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const toISO  = d => `${d.getFullYear()}-${`${d.getMonth()+1}`.padStart(2,'0')}-${`${d.getDate()}`.padStart(2,'0')}`;
const toDisp = d => `${`${d.getDate()}`.padStart(2,'0')}/${`${d.getMonth()+1}`.padStart(2,'0')}/${d.getFullYear()}`;
const calcLigne = l => (parseFloat(l.quantite)||0) * (parseFloat(l.prix_unitaire)||0) * (1 - (parseFloat(l.remise)||0)/100);

// ─── Date picker modal ────────────────────────────────────────────────────────
function DateModal({ visible, date, onConfirm, onCancel }) {
	const [tmp, setTmp] = useState(date);
	useEffect(() => { if (visible) setTmp(date); }, [visible]);
	if (!visible) return null;

	if (Platform.OS === 'android') {
		return (
			<DateTimePicker
				value={tmp}
				mode="date"
				display="default"
				onChange={(e, d) => e.type === 'set' && d ? onConfirm(d) : onCancel()}
			/>
		);
	}
	return (
		<Modal visible transparent animationType="slide">
			<View style={s.dateOverlay}>
				<View style={s.dateSheet}>
					<View style={s.dateSheetBar}>
						<TouchableOpacity onPress={onCancel}>
							<Text style={s.dateCancel}>Annuler</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => onConfirm(tmp)}>
							<Text style={s.dateConfirm}>Confirmer</Text>
						</TouchableOpacity>
					</View>
					<DateTimePicker
						value={tmp}
						mode="date"
						display="inline"
						accentColor={C.accent}
						themeVariant="light"
						onChange={(_, d) => d && setTmp(d)}
						style={{ width: '100%' }}
					/>
				</View>
			</View>
		</Modal>
	);
}

// ─── Picker sheet ─────────────────────────────────────────────────────────────
function PickerSheet({ visible, title, data, renderItem, onClose }) {
	return (
		<Modal visible={visible} transparent animationType="slide">
			<View style={s.sheetOverlay}>
				<View style={s.sheet}>
					<View style={s.sheetBar}>
						<Text style={s.sheetTitle}>{title}</Text>
						<TouchableOpacity onPress={onClose}>
							<Text style={s.sheetClose}>Fermer</Text>
						</TouchableOpacity>
					</View>
					<FlatList
						data={data}
						keyExtractor={item => item.id.toString()}
						renderItem={({ item }) => renderItem(item)}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={<Text style={s.emptyText}>Aucun element</Text>}
					/>
				</View>
			</View>
		</Modal>
	);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Create({ navigation }) {
	const [clientId, setClientId]   = useState('');
	const [dateEm, setDateEm]       = useState(new Date());
	const [dateVal, setDateVal]     = useState(() => { const d = new Date(); d.setDate(d.getDate()+30); return d; });
	const [lignes, setLignes]       = useState([{ produit_id:'', nom:'', description:'', quantite:'1', prix:'', remise:'0' }]);
	const [clients, setClients]     = useState([]);
	const [produits, setProduits]   = useState([]);
	const [loadingRefs, setLoadingRefs] = useState(true);
	const [submitting, setSubmitting]   = useState(false);
	const [dateTarget, setDateTarget]   = useState(null);
	const [showClients, setShowClients] = useState(false);
	const [showProduits, setShowProduits] = useState(false);
	const [activeLine, setActiveLine]   = useState(0);
	const [clientMode, setClientMode]   = useState('picker');
	const [clientQuery, setClientQuery] = useState('');
	const [nomClient, setNomClient]     = useState('');
	const [emailClient, setEmailClient] = useState('');
	const [telClient, setTelClient]     = useState('');
	const [savingClient, setSavingClient] = useState(false);
	const [showAddButton,setShowAdd] = useState(false);
	const [productQuery, setProductQuery] = useState('');
	const [savingProduct, setSavingProduct] = useState(false);
	const [productMode, setProductMode] = useState('picker');
	const [nomProduit, setNomProduit] = useState('');
	const [prixProduit, setPrixProduit] = useState('');
	const [descriptionProduit, setDescriptionProduit] = useState('');
	const [uniteProduit, setUniteProduit] = useState('Piece');
	const [showUnitePicker, setShowUnitePicker] = useState(false);

	const uniteOptions = [
		{ label: 'piece', value: 'unite' },
		{ label: 'Kg', value: 'kg' },
		{ label: 'litre', value: 'litre' },
		{ label: 'metre', value: 'metre' },
		
	];

	const client = clients.find(c => String(c.id) === String(clientId));
	const totalHT  = lignes.reduce((sum, l) => sum + calcLigne({ quantite: l.quantite, prix_unitaire: l.prix, remise: l.remise }), 0);
	const totalTTC = totalHT * 1.2;

	useEffect(() => {
		(async () => {
			setLoadingRefs(true);
			try {
				const token = await AsyncStorage.getItem('token');
				const h = { Authorization: `Bearer ${token}` };
				const [cr, pr] = await Promise.all([
					axios.get(`${API_BASE_URL}/clients`, { headers: h }),
					axios.get(`${API_BASE_URL}/produits`, { headers: h }),
				]);
				setClients(Array.isArray(cr.data) ? cr.data : []);
				setProduits(Array.isArray(pr.data) ? pr.data : []);
			} catch { Alert.alert('Erreur', 'Chargement impossible.'); }
			finally { setLoadingRefs(false); }
		})();
	}, []);

	const setLigne = (i, key, val) =>
		setLignes(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l));

	const closeClientModal = () => {
		setShowClients(false);
		setClientMode('picker');
		setClientQuery('');
	};

	const closeProductModal = () => {
		setShowProduits(false);
		setProductMode('picker');
		setProductQuery('');
	};

	const saveProduitForm = async () => {
		if (savingProduct) return;
		if (!nomProduit.trim()) {
			Alert.alert('Produit', 'Le nom du produit est requis.');
			return;
		}
		if (!prixProduit.trim()) {
			Alert.alert('Produit', 'Le prix du produit est requis.');
			return;
		}
		try {
			setSavingProduct(true);
			const token = await AsyncStorage.getItem('token');

			const res = await axios.post(
				`${API_BASE_URL}/produits`,
				{
					libelle: nomProduit.trim(),
					description: descriptionProduit.trim() || null,
					prix_unitaire: parseFloat(prixProduit.trim()),
					unite: uniteProduit.trim(),
				},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			const createdProduit = res?.data;
			if (!createdProduit?.id) {
				Alert.alert('Erreur', 'Produit créé mais ID invalide reçu.');
				return;
			}

			setProduits(prev => {
				const exists = prev.some(p => String(p.id) === String(createdProduit.id));
				if (exists) return prev;
				return [createdProduit, ...prev];
			});

			setLigne(activeLine, 'produit_id', String(createdProduit.id));
			setLigne(activeLine, 'nom', createdProduit.libelle);
			setLigne(activeLine, 'prix', String(createdProduit.prix_unitaire));
			if (!lignes[activeLine]?.description)
				setLigne(activeLine, 'description', createdProduit.description || createdProduit.libelle);

			setNomProduit('');
			setPrixProduit('');
			setDescriptionProduit('');
			setUniteProduit('Piece');
			closeProductModal();
		} catch (error) {
			console.log('error:', error?.response?.data);
			const apiErrors = error?.response?.data?.errors;
			if (apiErrors) {
				const firstError = Object.values(apiErrors)?.[0]?.[0];
				Alert.alert('Validation', firstError || 'Données produit invalides.');
			} else {
				Alert.alert('Erreur', 'Impossible de sauvegarder le produit.');
			}
		} finally {
			setSavingProduct(false);
		}
	};

	const filteredClients = clients.filter(item => {
		const q = clientQuery.trim().toLowerCase();
		if (!q) return true;
		const nom = String(item?.nom || '').toLowerCase();
		const email = String(item?.email || '').toLowerCase();
		return nom.includes(q) || email.includes(q);
	});

	const filteredProduits = produits.filter(item => {
		const q = productQuery.trim().toLowerCase();
		if (!q) return true;
		const libelle = String(item?.libelle || '').toLowerCase();
		const description = String(item?.description || '').toLowerCase();
		return libelle.includes(q) || description.includes(q);
	});

	const saveClientForm = async () => {
		if (savingClient) return;
		if (!nomClient.trim()) {
			Alert.alert('Client', 'Le nom du client est requis.');
			return;
		}
		try {
			setSavingClient(true);
			const token = await AsyncStorage.getItem('token');

			const res = await axios.post(
				`${API_BASE_URL}/clients`,
				{
					nom: nomClient.trim(),
					email: emailClient.trim() || null,
					telephone: telClient.trim() || null,
					adresse: null,
				},
				{
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			const createdClient = res?.data;
			if (!createdClient?.id) {
				Alert.alert('Erreur', 'Client créé mais ID invalide reçu.');
				return;
			}

			setClients(prev => {
				const exists = prev.some(c => String(c.id) === String(createdClient.id));
				if (exists) return prev;
				return [createdClient, ...prev];
			});

			setClientId(String(createdClient.id));
			setNomClient('');
			setEmailClient('');
			setTelClient('');
			closeClientModal();
		} catch (error) {
			console.log('error:', error?.response?.data);
			const apiErrors = error?.response?.data?.errors;
			if (apiErrors) {
				const firstError = Object.values(apiErrors)?.[0]?.[0];
				Alert.alert('Validation', firstError || 'Données client invalides.');
			} else {
				Alert.alert('Erreur', 'Impossible de sauvegarder le client.');
			}
		} finally {
			setSavingClient(false);
		}
	};

	const submit = async () => {
		if (!clientId) { Alert.alert('Client requis'); return; }
		if (lignes.some(l => !l.nom || !l.quantite || !l.prix)) {
			Alert.alert('Lignes incompletes', 'Produit, quantite et prix requis.');
			return;
		}
		setSubmitting(true);
		try {
			const token = await AsyncStorage.getItem('token');
			await axios.post(`${API_BASE_URL}/devis`, {
				client_id: Number(clientId),
				date_emission: toISO(dateEm),
				date_validite: toISO(dateVal),
				lignes: lignes.map(l => ({
					produit_id:   l.produit_id ? Number(l.produit_id) : null,
					description:  l.description || l.nom,
					quantite:     Number(l.quantite),
					prix_unitaire:Number(l.prix),
					remise:       Number(l.remise || 0),
				})),
			}, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

			Alert.alert('Devis cree', 'Enregistre avec succes.', [
				{ text: 'OK', onPress: () => navigation.replace('Dash') },
			]);
		} catch (e) {
			if (e?.response?.status === 422) Alert.alert('Validation', 'Verifiez les champs.');
			else Alert.alert('Erreur', 'Impossible de creer le devis.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<SafeAreaView style={s.safe}>

			{/* Header */}
			<View style={s.header}>
				<TouchableOpacity onPress={() => navigation.replace('Dash')}>
					<Text style={s.back}>Retour</Text>
				</TouchableOpacity>
				<Text style={s.headerTitle}>Nouveau devis</Text>
				<View style={{ width: 55 }} />
			</View>

			<ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

				{/* Client */}
				<Text style={s.sectionLabel}>Client</Text>
				<View style={s.group}>
					<TouchableOpacity style={s.row} onPress={() => setShowClients(true)} disabled={loadingRefs}>
						<Text style={s.rowLabel}>Client</Text>

						{loadingRefs
							? <ActivityIndicator size="small" color={C.sub} />
							: <Text style={[s.rowValue, !client && { color: C.sub }]} numberOfLines={1}>
									{client ? client.nom : 'Choisir...'}
								</Text>
						}
					</TouchableOpacity>
				</View>

				{/* Dates */}
				<Text style={s.sectionLabel}>Dates</Text>
				<View style={s.group}>
					<TouchableOpacity style={s.row} onPress={() => setDateTarget('em')}>
						<Text style={s.rowLabel}>Date d'emission</Text>
						<Text style={s.rowValue}>{toDisp(dateEm)}</Text>
					</TouchableOpacity>
					<View style={s.rowSep} />
					<TouchableOpacity style={s.row} onPress={() => setDateTarget('val')}>
						<Text style={s.rowLabel}>Date de validite</Text>
						<Text style={s.rowValue}>{toDisp(dateVal)}</Text>
					</TouchableOpacity>
				</View>

				{/* Lignes */}
				<View style={s.sectionRow}>
					<Text style={s.sectionLabel}>Produits</Text>
					<TouchableOpacity onPress={() =>
						setLignes(p => [...p, { produit_id:'', nom:'', description:'', quantite:'1', prix:'', remise:'0' }])
					}>
						<Text style={s.addText}>+ Ajouter</Text>
					</TouchableOpacity>
				</View>

				{lignes.map((ligne, i) => (
					<View key={i} style={[s.group, { marginBottom: 10 }]}>
						{/* Produit selector */}
						<TouchableOpacity style={s.row} onPress={() => { setActiveLine(i); setShowProduits(true); setShowAdd(true) }} disabled={loadingRefs}>
							<Text style={s.rowLabel}>Produit</Text>
							<Text style={[s.rowValue, !ligne.nom && { color: C.sub }]} numberOfLines={1}>
								{ligne.nom || 'Choisir...'}
								
							</Text>
						</TouchableOpacity>
						<View style={s.rowSep} />
						{/* Description */}
						<View style={s.row}>
							
							<Text style={s.rowLabel}>Description</Text>
							<TextInput
								style={s.rowInput}
								placeholder="Optionnel"
								placeholderTextColor={C.sub}
								value={ligne.description}
								onChangeText={v => setLigne(i, 'description', v)}
							/>
						</View>
						<View style={s.rowSep} />
						{/* Qty + Price */}
						<View style={s.row}>
							<Text style={s.rowLabel}>Quantite</Text>
							<TextInput
								style={s.rowInput}
								keyboardType="numeric"
								placeholder="1"
								placeholderTextColor={C.sub}
								value={ligne.quantite}
								onChangeText={v => setLigne(i, 'quantite', v)}
							/>
						</View>
						<View style={s.rowSep} />
						<View style={s.row}>
							<Text style={s.rowLabel}>Prix unitaire</Text>
							<TextInput
								style={s.rowInput}
								keyboardType="numeric"
								placeholder="0.00"
								placeholderTextColor={C.sub}
								value={ligne.prix}
								onChangeText={v => setLigne(i, 'prix', v)}
							/>
						</View>
						<View style={s.rowSep} />
						<View style={s.row}>
							<Text style={s.rowLabel}>Remise (%)</Text>
							<TextInput
								style={s.rowInput}
								keyboardType="numeric"
								placeholder="0"
								placeholderTextColor={C.sub}
								value={ligne.remise}
								onChangeText={v => setLigne(i, 'remise', v)}
							/>
						</View>
						{/* Subtotal */}
						<View style={s.rowSep} />
						<View style={[s.row, { backgroundColor: C.bg }]}>
							<Text style={s.rowLabel}>Sous-total</Text>
							<Text style={[s.rowValue, { color: C.accent, fontWeight: '600' }]}>
								{calcLigne({ quantite: ligne.quantite, prix_unitaire: ligne.prix, remise: ligne.remise }).toFixed(2)} MAD
							</Text>
						</View>
						{/* Remove */}
						{lignes.length > 1 && (
							<>
								<View style={s.rowSep} />
								<TouchableOpacity style={s.row} onPress={() => setLignes(p => p.filter((_,idx) => idx !== i))}>
									<Text style={{ color: '#FF3B30', fontSize: 15 }}>Supprimer</Text>
								</TouchableOpacity>
							</>
						)}
					</View>
				))}

				{/* Totals */}
				<View style={s.group}>
					<View style={s.row}>
						<Text style={s.rowLabel}>Total HT</Text>
						<Text style={s.rowValue}>{totalHT.toFixed(2)} MAD</Text>
					</View>
					<View style={s.rowSep} />
					<View style={s.row}>
						<Text style={s.rowLabel}>TVA (20%)</Text>
						<Text style={s.rowValue}>{(totalTTC - totalHT).toFixed(2)} MAD</Text>
					</View>
					<View style={s.rowSep} />
					<View style={s.row}>
						<Text style={[s.rowLabel, { fontWeight: '700', color: C.text }]}>Total TTC</Text>
						<Text style={[s.rowValue, { color: C.accent, fontWeight: '700', fontSize: 16 }]}>
							{totalTTC.toFixed(2)} MAD
						</Text>
					</View>
				</View>

				{/* Submit */}
				<TouchableOpacity
					style={[s.btn, submitting && { opacity: 0.6 }]}
					onPress={submit}
					disabled={submitting}
				>
					{submitting
						? <ActivityIndicator color="#fff" />
						: <Text style={s.btnText}>Creer le devis</Text>
					}
				</TouchableOpacity>

				<View style={{ height: 30 }} />
			</ScrollView>

			{/* Date modal */}
			<DateModal
				visible={dateTarget !== null}
				date={dateTarget === 'em' ? dateEm : dateVal}
				onConfirm={d => {
					dateTarget === 'em' ? setDateEm(d) : setDateVal(d);
					setDateTarget(null);
				}}
				onCancel={() => setDateTarget(null)}
			/>

			{/* Client picker + form */}
			<Modal visible={showClients} transparent animationType="slide">
				<KeyboardAvoidingView
					style={s.sheetOverlay}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
				>
					<View style={[s.sheet, clientMode === 'form' && s.sheetFormMode]}>
						<View style={s.clientSheetHeader}>
							{clientMode === 'form' ? (
								<TouchableOpacity onPress={() => setClientMode('picker')}>
									<Ionicons name="arrow-back" size={20} color={C.text} />
								</TouchableOpacity>
							) : <View style={{ width: 20 }} />}

							<Text style={s.sheetTitle}>
								{clientMode === 'picker' ? 'Choisir un client' : 'Nouveau client'}
							</Text>

							<TouchableOpacity onPress={closeClientModal}>
								<Ionicons name="close" size={20} color={C.text} />
							</TouchableOpacity>
						</View>

						{clientMode === 'picker' ? (
							<>
								<View style={s.searchWrap}>
									<Ionicons name="search" size={16} color={C.sub} />
									<TextInput
										style={s.searchInput}
										placeholder="Rechercher par nom ou email"
										placeholderTextColor={C.sub}
										value={clientQuery}
										onChangeText={setClientQuery}
										autoCapitalize="none"
									/>
								</View>

								<FlatList
									data={filteredClients}
									keyExtractor={item => item.id.toString()}
									renderItem={({ item }) => (
										<TouchableOpacity
											style={s.clientRow}
											onPress={() => {
												setClientId(String(item.id));
												closeClientModal();
											}}
										>
											<View style={{ flex: 1 }}>
												<Text style={s.clientName}>{item.nom}</Text>
												{!!item.email && <Text style={s.clientMeta}>{item.email}</Text>}
											</View>
											<Ionicons name="chevron-forward" size={16} color={C.sub} />
										</TouchableOpacity>
									)}
									showsVerticalScrollIndicator={false}
									ListEmptyComponent={<Text style={s.emptyText}>Aucun client trouvé</Text>}
								/>

								<TouchableOpacity style={s.addBtn} onPress={() => setClientMode('form')}>
									<Ionicons name="person-add-outline" size={18} color="#fff" />
									<Text style={s.addBtnText}>Ajouter un client</Text>
								</TouchableOpacity>
							</>
						) : (
							<ScrollView
								style={s.formScroll}
								contentContainerStyle={s.form}
								keyboardShouldPersistTaps="handled"
								showsVerticalScrollIndicator={false}
							>
								<TextInput
									style={s.input}
									placeholder="Nom du client"
									placeholderTextColor={C.sub}
									value={nomClient}
									onChangeText={setNomClient}
								/>
								<TextInput
									style={s.input}
									placeholder="Email"
									placeholderTextColor={C.sub}
									value={emailClient}
									onChangeText={setEmailClient}
									autoCapitalize="none"
									keyboardType="email-address"
								/>
								<TextInput
									style={s.input}
									placeholder="Telephone"
									placeholderTextColor={C.sub}
									value={telClient}
									onChangeText={setTelClient}
									keyboardType="phone-pad"
								/>
								<TouchableOpacity
									style={[s.addBtn, savingClient && { opacity: 0.6 }]}
									onPress={saveClientForm}
									disabled={savingClient}
								>
									{savingClient
										? <ActivityIndicator color="#fff" />
										: <Text style={s.addBtnText}>Enregistrer</Text>
									}
								</TouchableOpacity>
							</ScrollView>
						)}
					</View>
				</KeyboardAvoidingView>
			</Modal>

			{/* Produit picker + form */}
			<Modal visible={showProduits} transparent animationType="slide">
				<KeyboardAvoidingView
					style={s.sheetOverlay}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
				>
					<View style={[s.sheet, productMode === 'form' && s.sheetFormMode]}>
						<View style={s.clientSheetHeader}>
							{productMode === 'form' ? (
								<TouchableOpacity onPress={() => setProductMode('picker')}>
									<Ionicons name="arrow-back" size={20} color={C.text} />
								</TouchableOpacity>
							) : <View style={{ width: 20 }} />}

							<Text style={s.sheetTitle}>
								{productMode === 'picker' ? 'Choisir un produit' : 'Nouveau produit'}
							</Text>

							<TouchableOpacity onPress={closeProductModal}>
								<Ionicons name="close" size={20} color={C.text} />
							</TouchableOpacity>
						</View>

						{productMode === 'picker' ? (
							<>
								<View style={s.searchWrap}>
									<Ionicons name="search" size={16} color={C.sub} />
									<TextInput
										style={s.searchInput}
										placeholder="Rechercher par nom ou description"
										placeholderTextColor={C.sub}
										value={productQuery}
										onChangeText={setProductQuery}
										autoCapitalize="none"
									/>
								</View>

								<FlatList
									data={filteredProduits}
									keyExtractor={item => item.id.toString()}
									renderItem={({ item }) => (
										<TouchableOpacity
											style={s.clientRow}
											onPress={() => {
												setLigne(activeLine, 'produit_id', String(item.id));
												setLigne(activeLine, 'nom', item.libelle);
												setLigne(activeLine, 'prix', String(item.prix_unitaire || ''));
												if (!lignes[activeLine]?.description)
													setLigne(activeLine, 'description', item.description || item.libelle);
												closeProductModal();
											}}
										>
											<View style={{ flex: 1 }}>
												<Text style={s.clientName}>{item.libelle}</Text>
												{!!item.description && <Text style={s.clientMeta}>{item.description}</Text>}
												<Text style={[s.clientMeta, { marginTop: 4 }]}>{item.prix_unitaire} MAD · {item.unite}</Text>
											</View>
											<Ionicons name="chevron-forward" size={16} color={C.sub} />
										</TouchableOpacity>
									)}
									showsVerticalScrollIndicator={false}
									ListEmptyComponent={<Text style={s.emptyText}>Aucun produit trouvé</Text>}
								/>

								<TouchableOpacity style={s.addBtn} onPress={() => setProductMode('form')}>
									<Ionicons name="add-circle-outline" size={18} color="#fff" />
									<Text style={s.addBtnText}>Ajouter un produit</Text>
								</TouchableOpacity>
							</>
						) : (
							<ScrollView
								style={s.formScroll}
								contentContainerStyle={s.form}
								keyboardShouldPersistTaps="always"
								showsVerticalScrollIndicator={false}
							>
								<TextInput
									style={s.input}
									placeholder="Nom du produit"
									placeholderTextColor={C.sub}
									value={nomProduit}
									onChangeText={setNomProduit}
								/>
								<TextInput
									style={s.input}
									placeholder="Description"
									placeholderTextColor={C.sub}
									value={descriptionProduit}
									onChangeText={setDescriptionProduit}
								/>
								<TextInput
									style={s.input}
									placeholder="Prix unitaire"
									placeholderTextColor={C.sub}
									value={prixProduit}
									onChangeText={setPrixProduit}
									keyboardType="decimal-pad"
								/>
								<TouchableOpacity 
									style={s.uniteButton} 
									onPress={() => setShowUnitePicker(!showUnitePicker)} 
									activeOpacity={0.7}
								>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
										<Ionicons name="layers" size={16} color={C.sub} />
										<Text style={[s.uniteButtonText, !uniteProduit && { color: C.sub }]}>
											{uniteProduit || 'Sélectionner unité'}
										</Text>
									</View>
									<Ionicons name={showUnitePicker ? 'chevron-up' : 'chevron-down'} size={16} color={C.sub} />
								</TouchableOpacity>
								{showUnitePicker && (
									<View style={s.unitDropdown}>
										{uniteOptions.map((option) => (
											<TouchableOpacity
												key={option.value}
												style={[s.unitDropdownItem, uniteProduit === option.value && s.unitDropdownItemActive]}
												onPress={() => {
													setUniteProduit(option.value);
													setShowUnitePicker(false);
												}}
											>
												<View style={{ flex: 1 }}>
													<Text style={[s.unitDropdownItemText, uniteProduit === option.value && s.unitDropdownItemTextActive]}>
														{option.label}
													</Text>
												</View>
												{uniteProduit === option.value && (
													<Ionicons name="checkmark" size={16} color={C.accent} />
												)}
											</TouchableOpacity>
										))}
									</View>
								)}
								<TouchableOpacity
									style={[s.addBtn, savingProduct && { opacity: 0.6 }]}
									onPress={saveProduitForm}
									disabled={savingProduct}
								>
									{savingProduct
										? <ActivityIndicator color="#fff" />
										: <Text style={s.addBtnText}>Enregistrer</Text>
									}
								</TouchableOpacity>
							</ScrollView>
						)}
					</View>
				</KeyboardAvoidingView>
			</Modal>

			{/* Unite picker modal - REMOVED, using inline picker instead */}
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe:   { flex: 1, backgroundColor: C.bg },
	scroll: { padding: 16, paddingTop: 12 },

	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	back:        { fontSize: 16, color: C.accent },
	headerTitle: { fontSize: 16, fontWeight: '600', color: C.text },

	sectionLabel: { fontSize: 13, color: C.sub, marginBottom: 6, marginTop: 14, marginLeft: 4 },
	sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 6 },
	addText:      { fontSize: 14, color: C.accent, fontWeight: '500' },

	group: {
		backgroundColor: C.white,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: C.border,
		overflow: 'hidden',
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 13,
		minHeight: 48,
	},
	rowSep:    { height: 1, backgroundColor: C.border, marginLeft: 14 },
	rowLabel:  { fontSize: 15, color: C.text, flex: 1 },
	rowValue:  { fontSize: 15, color: C.sub, textAlign: 'right', flex: 1 },
	rowInput:  { fontSize: 15, color: C.text, textAlign: 'right', flex: 1 },

	btn: {
		backgroundColor: C.accent,
		borderRadius: 12,
		paddingVertical: 15,
		alignItems: 'center',
		marginTop: 16,
	},
	btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

	// Date modal
	dateOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
	dateSheet:   { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
	dateSheetBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	dateCancel:  { fontSize: 16, color: C.sub },
	dateConfirm: { fontSize: 16, color: C.accent, fontWeight: '600' },

	// Sheet
	sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
	sheet: {
		backgroundColor: C.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 16,
		maxHeight: '65%',
	},
	sheetFormMode: {
		maxHeight: '82%',
	},
	sheetBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	sheetTitle:    { fontSize: 16, fontWeight: '600', color: C.text },
	sheetClose:    { fontSize: 15, color: C.accent },
	sheetItem:     { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border },
	sheetItemMain: { fontSize: 15, color: C.text, fontWeight: '500' },
	sheetItemSub:  { fontSize: 13, color: C.sub, marginTop: 2 },
	emptyText:     { textAlign: 'center', color: C.sub, padding: 20 },

	clientSheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	clientRow: {
		paddingVertical: 13,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	clientName: {
		fontSize: 15,
		fontWeight: '500',
		color: C.text,
	},
	clientMeta: {
		fontSize: 12,
		color: C.sub,
		marginTop: 2,
	},
	searchWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: '#F7F7FA',
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 10,
		paddingHorizontal: 10,
		marginBottom: 10,
	},
	searchInput: {
		flex: 1,
		height: 40,
		fontSize: 14,
		color: C.text,
	},
	addBtn: {
		marginTop: 14,
		backgroundColor: C.accent,
		borderRadius: 10,
		paddingVertical: 12,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	addBtnText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
	form: {
		gap: 10,
		paddingTop: 2,
		paddingBottom: 12,
	},
	formScroll: {
		flexGrow: 0,
	},
	input: {
		height: 46,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 10,
		paddingHorizontal: 12,
		fontSize: 15,
		color: C.text,
		backgroundColor: '#FAFAFB',
	},
	pickerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 46,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 10,
		paddingHorizontal: 8,
		backgroundColor: '#FAFAFB',
		gap: 6,
		overflow: 'hidden',
	},
	uniteButton: {
		height: 46,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 10,
		paddingHorizontal: 12,
		backgroundColor: '#FAFAFB',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	uniteButtonText: {
		fontSize: 15,
		color: C.text,
	},
	unitDropdown: {
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
		borderTopWidth: 0,
		borderBottomLeftRadius: 10,
		borderBottomRightRadius: 10,
		overflow: 'hidden',
	},
	unitDropdownItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	unitDropdownItemActive: {
		backgroundColor: C.bg,
	},
	unitDropdownItemText: {
		fontSize: 15,
		color: C.text,
	},
	unitDropdownItemTextActive: {
		fontWeight: '600',
		color: C.accent,
	},
});
