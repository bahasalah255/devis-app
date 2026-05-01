import React, { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	FlatList,
	Alert,
	ActivityIndicator,
	SafeAreaView,
	TextInput,
	Modal,
	KeyboardAvoidingView,
	ScrollView,
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Navbar from './Navbar';
import { API_BASE_URL } from './config';
import { COLORS, SHADOW, SHADOW_SM, RADIUS, SPACING } from './utils/platformStyles';

const C = COLORS;

function ClientAvatar({ name }) {
	const initial = (name || '?').charAt(0).toUpperCase();
	const colors = ['#EEF2FF', '#FEF3C7', '#D1FAE5', '#FCE7F3', '#E0F2FE'];
	const textColors = ['#4F46E5', '#D97706', '#059669', '#DB2777', '#0284C7'];
	const idx = (name?.charCodeAt(0) || 0) % colors.length;
	return (
		<View style={[av.wrap, { backgroundColor: colors[idx] }]}>
			<Text style={[av.txt, { color: textColors[idx] }]}>{initial}</Text>
		</View>
	);
}

const av = StyleSheet.create({
	wrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
	txt: { fontSize: 20, fontWeight: '800' },
});

function LabeledInput({ label, required, ...props }) {
	return (
		<View style={inp.wrap}>
			<Text style={inp.label}>
				{label}
				{required && <Text style={{ color: C.danger }}> *</Text>}
			</Text>
			<TextInput style={inp.field} placeholderTextColor={C.sub} {...props} />
		</View>
	);
}

const inp = StyleSheet.create({
	wrap: { gap: 6 },
	label: { color: C.textMid, fontSize: 13, fontWeight: '600' },
	field: {
		minHeight: 48,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: C.border,
		paddingHorizontal: 14,
		paddingVertical: 11,
		backgroundColor: C.bg,
		color: C.text,
		fontSize: 15,
	},
});

function Clients({ navigation }) {
	const [clients, setClients] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [query, setQuery] = useState('');
	const [showForm, setShowForm] = useState(false);
	const [saving, setSaving] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [nom, setNom] = useState('');
	const [email, setEmail] = useState('');
	const [telephone, setTelephone] = useState('');
	const [adresse, setAdresse] = useState('');
	const insets = useSafeAreaInsets();

	const getAuthHeaders = async () => {
		const token = await AsyncStorage.getItem('token');
		if (!token) { navigation.replace('Login'); throw new Error('NO_TOKEN'); }
		return { Authorization: `Bearer ${token}` };
	};

	const load = async (refresh = false) => {
		refresh ? setRefreshing(true) : setLoading(true);
		try {
			const headers = await getAuthHeaders();
			const response = await axios.get(`${API_BASE_URL}/clients`, { headers });
			setClients(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			if (error?.response?.status === 401) { navigation.replace('Login'); return; }
			if (error?.message === 'NO_TOKEN') return;
			Alert.alert('Erreur', 'Impossible de charger les clients.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => { load(); }, []);

	const filteredClients = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return clients;
		return clients.filter((item) => {
			const text = `${item?.nom || ''} ${item?.email || ''} ${item?.telephone || ''}`.toLowerCase();
			return text.includes(q);
		});
	}, [clients, query]);

	const resetForm = () => {
		setEditingId(null); setNom(''); setEmail(''); setTelephone(''); setAdresse('');
	};

	const openCreate = () => { resetForm(); setShowForm(true); };

	const openEdit = (item) => {
		setEditingId(item.id);
		setNom(String(item?.nom || ''));
		setEmail(String(item?.email || ''));
		setTelephone(String(item?.telephone || ''));
		setAdresse(String(item?.adresse || ''));
		setShowForm(true);
	};

	const saveClient = async () => {
		if (saving) return;
		if (!nom.trim()) {
			Alert.alert('Champ requis', 'Le nom du client est obligatoire.');
			return;
		}
		setSaving(true);
		try {
			const headers = await getAuthHeaders();
			const payload = {
				nom: nom.trim(),
				email: email.trim() || null,
				telephone: telephone.trim() || null,
				adresse: adresse.trim() || null,
			};
			if (editingId) {
				const response = await axios.put(`${API_BASE_URL}/clients/${editingId}`, payload, { headers });
				setClients((prev) => prev.map((item) => (item.id === editingId ? response?.data : item)));
			} else {
				const response = await axios.post(`${API_BASE_URL}/clients`, payload, { headers });
				setClients((prev) => [response?.data, ...prev]);
			}
			setShowForm(false);
			resetForm();
		} catch (error) {
			if (error?.response?.status === 401) { navigation.replace('Login'); return; }
			if (error?.message === 'NO_TOKEN') return;
			const apiErrors = error?.response?.data?.errors;
			if (apiErrors) {
				const firstError = Object.values(apiErrors)?.[0]?.[0];
				Alert.alert('Validation', firstError || 'Données invalides.');
			} else {
				Alert.alert('Erreur', 'Impossible d\'enregistrer le client.');
			}
		} finally {
			setSaving(false);
		}
	};

	const removeClient = (id) => {
		Alert.alert('Supprimer le client', 'Cette action est irréversible. Continuer ?', [
			{ text: 'Annuler', style: 'cancel' },
			{
				text: 'Supprimer',
				style: 'destructive',
				onPress: async () => {
					try {
						const headers = await getAuthHeaders();
						await axios.delete(`${API_BASE_URL}/clients/${id}`, { headers });
						setClients((prev) => prev.filter((item) => item.id !== id));
					} catch (error) {
						if (error?.response?.status === 401) { navigation.replace('Login'); return; }
						if (error?.message === 'NO_TOKEN') return;
						Alert.alert('Erreur', 'Suppression impossible.');
					}
				},
			},
		]);
	};

	const handleNavChange = (page) => { navigation.navigate(page); };

	const renderItem = ({ item }) => (
		<View style={s.card}>
			<ClientAvatar name={item?.nom} />
			<View style={s.cardBody}>
				<Text style={s.cardName}>{item?.nom || 'Client sans nom'}</Text>
				{!!item?.email && (
					<View style={s.metaRow}>
						<Ionicons name="mail-outline" size={13} color={C.sub} />
						<Text style={s.metaTxt} numberOfLines={1}>{item.email}</Text>
					</View>
				)}
				{!!item?.telephone && (
					<View style={s.metaRow}>
						<Ionicons name="call-outline" size={13} color={C.sub} />
						<Text style={s.metaTxt}>{item.telephone}</Text>
					</View>
				)}
				{!!item?.adresse && (
					<View style={s.metaRow}>
						<Ionicons name="location-outline" size={13} color={C.sub} />
						<Text style={s.metaTxt} numberOfLines={1}>{item.adresse}</Text>
					</View>
				)}
			</View>
			<View style={s.cardActions}>
				<TouchableOpacity activeOpacity={0.85} style={s.editBtn} onPress={() => openEdit(item)}>
					<Ionicons name="pencil-outline" size={16} color={C.accent} />
				</TouchableOpacity>
				<TouchableOpacity activeOpacity={0.85} style={s.deleteBtn} onPress={() => removeClient(item.id)}>
					<Ionicons name="trash-outline" size={16} color={C.danger} />
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<SafeAreaView style={s.safe} edges={['top', 'right', 'bottom', 'left']}>
			<View style={[s.header, { paddingTop: Math.max(insets.top, 10) }]}>
				<View>
					<Text style={s.title}>Clients</Text>
					<Text style={s.subtitle}>{clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}</Text>
				</View>
				<TouchableOpacity activeOpacity={0.9} style={s.addBtn} onPress={openCreate}>
					<Ionicons name="add" size={20} color={C.white} />
					<Text style={s.addTxt}>Ajouter</Text>
				</TouchableOpacity>
			</View>

			<View style={s.searchBar}>
				<Ionicons name="search-outline" size={18} color={C.sub} style={s.searchIcon} />
				<TextInput
					style={s.searchInput}
					placeholder="Rechercher un client…"
					placeholderTextColor={C.sub}
					value={query}
					onChangeText={setQuery}
				/>
				{!!query && (
					<TouchableOpacity onPress={() => setQuery('')}>
						<Ionicons name="close-circle" size={18} color={C.sub} />
					</TouchableOpacity>
				)}
			</View>

			{loading ? (
				<View style={s.center}>
					<ActivityIndicator size="large" color={C.accent} />
					<Text style={s.loadingTxt}>Chargement…</Text>
				</View>
			) : (
				<FlatList
					data={filteredClients}
					keyExtractor={(item) => String(item.id)}
					renderItem={renderItem}
					contentContainerStyle={s.list}
					refreshing={refreshing}
					onRefresh={() => load(true)}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={
						<View style={s.emptyCard}>
							<Text style={s.emptyEmoji}>👥</Text>
							<Text style={s.emptyTitle}>{query ? 'Aucun résultat' : 'Aucun client'}</Text>
							<Text style={s.emptySub}>
								{query ? `Aucun client pour "${query}"` : 'Ajoutez votre premier client.'}
							</Text>
							{!query && (
								<TouchableOpacity style={s.emptyAction} onPress={openCreate}>
									<Text style={s.emptyActionTxt}>+ Ajouter un client</Text>
								</TouchableOpacity>
							)}
						</View>
					}
				/>
			)}

			<Modal visible={showForm} transparent animationType="slide" onRequestClose={() => { setShowForm(false); resetForm(); }}>
				<KeyboardAvoidingView
					style={s.modalWrap}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
				>
					<View style={s.modalHandle} />
					<ScrollView
						style={s.modalScroll}
						contentContainerStyle={s.modalContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={s.modalCard}>
							<View style={s.modalHeaderRow}>
								<Text style={s.modalTitle}>{editingId ? 'Modifier le client' : 'Nouveau client'}</Text>
								<TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
									<Ionicons name="close-circle" size={24} color={C.sub} />
								</TouchableOpacity>
							</View>

							<LabeledInput
								label="Nom"
								required
								placeholder="Ex: Mohamed Alami"
								value={nom}
								onChangeText={setNom}
							/>
							<LabeledInput
								label="Email"
								placeholder="client@example.com"
								value={email}
								onChangeText={setEmail}
								autoCapitalize="none"
								keyboardType="email-address"
							/>
							<LabeledInput
								label="Téléphone"
								placeholder="+212 6XX XXX XXX"
								value={telephone}
								onChangeText={setTelephone}
								keyboardType="phone-pad"
							/>
							<LabeledInput
								label="Adresse"
								placeholder="Rue, Ville, Code postal"
								value={adresse}
								onChangeText={setAdresse}
								multiline
							/>

							<View style={s.modalActions}>
								<TouchableOpacity
									activeOpacity={0.85}
									style={s.cancelBtn}
									onPress={() => { setShowForm(false); resetForm(); }}
								>
									<Text style={s.cancelTxt}>Annuler</Text>
								</TouchableOpacity>
								<TouchableOpacity activeOpacity={0.85} style={s.saveBtn} onPress={saveClient} disabled={saving}>
									{saving ? (
										<ActivityIndicator color={C.white} />
									) : (
										<>
											<Ionicons name="checkmark" size={18} color={C.white} />
											<Text style={s.saveTxt}>Enregistrer</Text>
										</>
									)}
								</TouchableOpacity>
							</View>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</Modal>

			<Navbar onChange={handleNavChange} current="Clients" />
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.bg },
	center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
	loadingTxt: { color: C.sub, fontSize: 14, fontWeight: '500' },

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
	title: { color: C.text, fontSize: 22, fontWeight: '800' },
	subtitle: { color: C.sub, fontSize: 13, fontWeight: '500', marginTop: 2 },

	addBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		height: 42,
		paddingHorizontal: 16,
		borderRadius: 14,
		backgroundColor: C.accent,
		...SHADOW,
	},
	addTxt: { color: C.white, fontSize: 14, fontWeight: '800' },

	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 14,
		marginTop: 14,
		marginBottom: 8,
		paddingHorizontal: 14,
		height: 46,
		borderRadius: 14,
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
		gap: 10,
		...SHADOW_SM,
	},
	searchIcon: {},
	searchInput: { flex: 1, fontSize: 15, color: C.text },

	list: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 30, gap: 10 },

	card: {
		backgroundColor: C.white,
		borderRadius: 18,
		padding: 16,
		borderWidth: 1,
		borderColor: C.border,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		...SHADOW,
	},
	cardBody: { flex: 1, gap: 4 },
	cardName: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 4 },
	metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	metaTxt: { color: C.sub, fontSize: 13, fontWeight: '500', flex: 1 },
	cardActions: { gap: 8, alignItems: 'center' },
	editBtn: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: C.accentLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	deleteBtn: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: C.dangerLight,
		alignItems: 'center',
		justifyContent: 'center',
	},

	emptyCard: {
		backgroundColor: C.white,
		borderRadius: 20,
		padding: 36,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: C.border,
		marginTop: 16,
		...SHADOW,
	},
	emptyEmoji: { fontSize: 40, marginBottom: 14 },
	emptyTitle: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
	emptySub: { color: C.sub, fontSize: 14, textAlign: 'center', lineHeight: 22 },
	emptyAction: {
		marginTop: 16,
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 14,
		backgroundColor: C.accent,
	},
	emptyActionTxt: { color: C.white, fontSize: 15, fontWeight: '800' },

	modalWrap: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.40)',
		justifyContent: 'flex-end',
	},
	modalHandle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: 'rgba(255,255,255,0.4)',
		alignSelf: 'center',
		marginBottom: 8,
	},
	modalScroll: { maxHeight: '92%' },
	modalContent: { justifyContent: 'flex-end' },
	modalCard: {
		backgroundColor: C.white,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 20,
		gap: 14,
	},
	modalHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 4,
	},
	modalTitle: { color: C.text, fontSize: 20, fontWeight: '800' },
	modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
	cancelBtn: {
		flex: 1,
		height: 50,
		borderRadius: 14,
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelTxt: { color: C.textMid, fontSize: 15, fontWeight: '700' },
	saveBtn: {
		flex: 2,
		height: 50,
		borderRadius: 14,
		backgroundColor: C.accent,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		...SHADOW,
	},
	saveTxt: { color: C.white, fontSize: 15, fontWeight: '800' },
});

export default Clients;
