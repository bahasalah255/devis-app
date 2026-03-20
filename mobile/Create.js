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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from './config';
import DateTimePicker from '@react-native-community/datetimepicker';

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
						<TouchableOpacity style={s.row} onPress={() => { setActiveLine(i); setShowProduits(true); }} disabled={loadingRefs}>
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

			{/* Client picker */}
			<PickerSheet
				visible={showClients}
				title="Choisir un client"
				data={clients}
				renderItem={item => (
					<TouchableOpacity
						style={s.sheetItem}
						onPress={() => { setClientId(String(item.id)); setShowClients(false); }}
					>
						<Text style={s.sheetItemMain}>{item.nom}</Text>
						{item.email && <Text style={s.sheetItemSub}>{item.email}</Text>}
					</TouchableOpacity>
				)}
				onClose={() => setShowClients(false)}
			/>

			{/* Produit picker */}
			<PickerSheet
				visible={showProduits}
				title="Choisir un produit"
				data={produits}
				renderItem={item => (
					<TouchableOpacity
						style={s.sheetItem}
						onPress={() => {
							setLigne(activeLine, 'produit_id', String(item.id));
							setLigne(activeLine, 'nom', item.libelle || `Produit #${item.id}`);
							setLigne(activeLine, 'prix', String(item.prix_unitaire || ''));
							if (!lignes[activeLine]?.description)
								setLigne(activeLine, 'description', item.description || item.libelle || '');
							setShowProduits(false);
						}}
					>
						<Text style={s.sheetItemMain}>{item.libelle}</Text>
						<Text style={s.sheetItemSub}>{item.prix_unitaire} MAD · {item.unite}</Text>
					</TouchableOpacity>
				)}
				onClose={() => setShowProduits(false)}
			/>
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
});