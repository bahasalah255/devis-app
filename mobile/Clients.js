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
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Navbar from './Navbar';
import { API_BASE_URL } from './config';
import { COLORS, SHADOW, KEYBOARD_BEHAVIOR } from './utils/platformStyles';

const C = COLORS;

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
		if (!token) {
			navigation.replace('Login');
			throw new Error('NO_TOKEN');
		}
		return { Authorization: `Bearer ${token}` };
	};

	const load = async (refresh = false) => {
		refresh ? setRefreshing(true) : setLoading(true);
		try {
			const headers = await getAuthHeaders();
			const response = await axios.get(`${API_BASE_URL}/clients`, { headers });
			setClients(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			if (error?.response?.status === 401) {
				navigation.replace('Login');
				return;
			}
			if (error?.message === 'NO_TOKEN') return;
			Alert.alert('Erreur', 'Impossible de charger les clients.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	const filteredClients = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return clients;
		return clients.filter((item) => {
			const text = `${item?.nom || ''} ${item?.email || ''} ${item?.telephone || ''}`.toLowerCase();
			return text.includes(q);
		});
	}, [clients, query]);

	const resetForm = () => {
		setEditingId(null);
		setNom('');
		setEmail('');
		setTelephone('');
		setAdresse('');
	};

	const openCreate = () => {
		resetForm();
		setShowForm(true);
	};

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
			Alert.alert('Validation', 'Le nom est requis.');
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
				const updated = response?.data;
				setClients((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
			} else {
				const response = await axios.post(`${API_BASE_URL}/clients`, payload, { headers });
				const created = response?.data;
				setClients((prev) => [created, ...prev]);
			}

			setShowForm(false);
			resetForm();
		} catch (error) {
			if (error?.response?.status === 401) {
				navigation.replace('Login');
				return;
			}
			if (error?.message === 'NO_TOKEN') return;

			const apiErrors = error?.response?.data?.errors;
			if (apiErrors) {
				const firstError = Object.values(apiErrors)?.[0]?.[0];
				Alert.alert('Validation', firstError || 'Données client invalides.');
			} else {
				Alert.alert('Erreur', 'Impossible d’enregistrer le client.');
			}
		} finally {
			setSaving(false);
		}
	};

	const removeClient = (id) => {
		Alert.alert('Supprimer', 'Voulez-vous supprimer ce client ?', [
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
						if (error?.response?.status === 401) {
							navigation.replace('Login');
							return;
						}
						if (error?.message === 'NO_TOKEN') return;
						Alert.alert('Erreur', 'Suppression impossible.');
					}
				},
			},
		]);
	};

	const handleNavChange = (page) => {
		navigation.navigate(page);
	};

	const renderItem = ({ item }) => (
		<View style={s.card}>
			<View style={{ flex: 1 }}>
				<Text style={s.name}>{item?.nom || 'Client sans nom'}</Text>
				{!!item?.email && <Text style={s.meta}>✉ {item.email}</Text>}
				{!!item?.telephone && <Text style={s.meta}>☎ {item.telephone}</Text>}
				{!!item?.adresse && <Text style={s.meta} numberOfLines={2}>📍 {item.adresse}</Text>}
			</View>
			<View style={s.actionsCol}>
				<TouchableOpacity activeOpacity={0.85} style={s.editBtn} onPress={() => openEdit(item)}>
					<Text style={s.editTxt}>Modifier</Text>
				</TouchableOpacity>
				<TouchableOpacity activeOpacity={0.85} style={s.deleteBtn} onPress={() => removeClient(item.id)}>
					<Text style={s.deleteTxt}>Supprimer</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<SafeAreaView style={s.safe} edges={['top', 'right', 'bottom', 'left']}>
			<View style={[s.header, { paddingTop: Math.max(insets.top, 8) }]}>
				<TouchableOpacity style={s.backBtn} onPress={() => navigation.replace('Dash')}>
					<Text style={s.backTxt}>← Retour</Text>
				</TouchableOpacity>
				<Text style={s.title}>Clients ({clients.length})</Text>
			</View>

			<View style={s.toolbar}>
				<TextInput
					style={s.search}
					placeholder="Rechercher client"
					placeholderTextColor={C.sub}
					value={query}
					onChangeText={setQuery}
				/>
				<TouchableOpacity activeOpacity={0.9} style={s.addBtn} onPress={openCreate}>
					<Text style={s.addTxt}>+ Ajouter</Text>
				</TouchableOpacity>
			</View>

			{loading ? (
				<View style={s.center}><ActivityIndicator color={C.accent} /></View>
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
							<Text style={s.emptyTitle}>Aucun client</Text>
							<Text style={s.emptySub}>Ajoutez un client pour commencer.</Text>
						</View>
					}
				/>
			)}

			<Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
				<KeyboardAvoidingView
					style={s.modalWrap}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<View style={s.modalCard}>
						<Text style={s.modalTitle}>{editingId ? 'Modifier client' : 'Nouveau client'}</Text>
						<TextInput
							style={s.input}
							placeholder="Nom *"
							placeholderTextColor={C.sub}
							value={nom}
							onChangeText={setNom}
						/>
						<TextInput
							style={s.input}
							placeholder="Email"
							placeholderTextColor={C.sub}
							value={email}
							onChangeText={setEmail}
							autoCapitalize="none"
							keyboardType="email-address"
						/>
						<TextInput
							style={s.input}
							placeholder="Téléphone"
							placeholderTextColor={C.sub}
							value={telephone}
							onChangeText={setTelephone}
							keyboardType="phone-pad"
						/>
						<TextInput
							style={[s.input, { minHeight: 78, textAlignVertical: 'top' }]}
							placeholder="Adresse"
							placeholderTextColor={C.sub}
							value={adresse}
							onChangeText={setAdresse}
							multiline
						/>
						<View style={s.modalActions}>
							<TouchableOpacity activeOpacity={0.85} style={s.cancelBtn} onPress={() => setShowForm(false)}>
								<Text style={s.cancelTxt}>Annuler</Text>
							</TouchableOpacity>
							<TouchableOpacity activeOpacity={0.85} style={s.saveBtn} onPress={saveClient}>
								{saving ? <ActivityIndicator color={C.white} /> : <Text style={s.saveTxt}>Enregistrer</Text>}
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>

			<Navbar onChange={handleNavChange} current="Clients" />
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.bg },
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	header: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	backBtn: {
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 12,
		justifyContent: 'center',
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
	},
	backTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
	title: { color: C.text, fontSize: 20, fontWeight: '800' },
	toolbar: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		flexDirection: 'row',
		gap: 8,
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	search: {
		flex: 1,
		height: 40,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.bg,
		paddingHorizontal: 12,
		color: C.text,
		fontSize: 14,
	},
	addBtn: {
		height: 40,
		borderRadius: 12,
		paddingHorizontal: 16,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: C.accent,
		...SHADOW,
	},
	addTxt: { color: C.white, fontSize: 14, fontWeight: '800' },
	list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, gap: 10 },
	card: {
		backgroundColor: C.white,
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: C.border,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		...SHADOW,
	},
	name: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 6 },
	meta: { color: C.sub, fontSize: 13, fontWeight: '500', marginBottom: 2 },
	actionsCol: { gap: 8 },
	editBtn: {
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#EEF2FF',
	},
	editTxt: { color: C.accent, fontSize: 12, fontWeight: '700' },
	deleteBtn: {
		height: 32,
		paddingHorizontal: 12,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FEE2E2',
	},
	deleteTxt: { color: C.danger, fontSize: 12, fontWeight: '700' },
	emptyCard: {
		marginTop: 32,
		backgroundColor: C.white,
		borderRadius: 16,
		padding: 32,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: C.border,
		...SHADOW,
	},
	emptyEmoji: { fontSize: 32, marginBottom: 12 },
	emptyTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
	emptySub: { color: C.sub, fontSize: 13, textAlign: 'center', lineHeight: 20 },
	modalWrap: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
	},
	modalCard: {
		backgroundColor: C.white,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: 16,
		gap: 10,
	},
	modalTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 2 },
	input: {
		minHeight: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: C.border,
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: C.white,
		color: C.text,
	},
	modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
	cancelBtn: {
		flex: 1,
		height: 44,
		borderRadius: 12,
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cancelTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
	saveBtn: {
		flex: 1,
		height: 44,
		borderRadius: 12,
		backgroundColor: C.accent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	saveTxt: { color: C.white, fontSize: 14, fontWeight: '800' },
});

export default Clients;