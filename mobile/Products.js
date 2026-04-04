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
import axios from 'axios';
import Navbar from './Navbar';
import { API_BASE_URL } from './config';
import { COLORS, SHADOW, KEYBOARD_BEHAVIOR } from './utils/platformStyles';

const C = COLORS;

const PRODUCT_UNITS = ['unite', 'kg', 'litre', 'metre'];

function Products({ navigation }) {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [query, setQuery] = useState('');

	const [showForm, setShowForm] = useState(false);
	const [saving, setSaving] = useState(false);
	const [editingId, setEditingId] = useState(null);

	const [libelle, setLibelle] = useState('');
	const [description, setDescription] = useState('');
	const [prixUnitaire, setPrixUnitaire] = useState('');
	const [tva, setTva] = useState('20');
	const [unite, setUnite] = useState('unite');
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
			const response = await axios.get(`${API_BASE_URL}/produits`, { headers });
			setProducts(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			if (error?.response?.status === 401) {
				navigation.replace('Login');
				return;
			}
			if (error?.message === 'NO_TOKEN') return;
			Alert.alert('Erreur', 'Impossible de charger les produits.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	const filteredProducts = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return products;
		return products.filter((item) => {
			const text = `${item?.libelle || ''} ${item?.description || ''} ${item?.unite || ''}`.toLowerCase();
			return text.includes(q);
		});
	}, [products, query]);

	const resetForm = () => {
		setEditingId(null);
		setLibelle('');
		setDescription('');
		setPrixUnitaire('');
		setTva('20');
		setUnite('unite');
	};

	const openCreate = () => {
		resetForm();
		setShowForm(true);
	};

	const openEdit = (item) => {
		setEditingId(item.id);
		setLibelle(String(item?.libelle || ''));
		setDescription(String(item?.description || ''));
		setPrixUnitaire(String(item?.prix_unitaire ?? ''));
		setTva(String(item?.tva ?? 20));
		setUnite(PRODUCT_UNITS.includes(item?.unite) ? item.unite : 'unite');
		setShowForm(true);
	};

	const saveProduct = async () => {
		if (saving) return;
		if (!libelle.trim()) {
			Alert.alert('Validation', 'Le libellé est requis.');
			return;
		}

		const parsedPrice = Number(String(prixUnitaire).replace(',', '.'));
		if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
			Alert.alert('Validation', 'Le prix unitaire doit être un nombre valide.');
			return;
		}

		const parsedTva = Number(String(tva).replace(',', '.'));
		if (!Number.isFinite(parsedTva) || parsedTva < 0 || parsedTva > 100) {
			Alert.alert('Validation', 'La TVA doit être entre 0 et 100.');
			return;
		}

		if (!PRODUCT_UNITS.includes(unite)) {
			Alert.alert('Validation', 'Veuillez choisir une unité valide.');
			return;
		}

		setSaving(true);
		try {
			const headers = await getAuthHeaders();
			const payload = {
				libelle: libelle.trim(),
				description: description.trim() || null,
				prix_unitaire: parsedPrice,
				tva: parsedTva,
				unite,
			};

			if (editingId) {
				const response = await axios.put(`${API_BASE_URL}/produits/${editingId}`, payload, { headers });
				const updated = response?.data;
				setProducts((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
			} else {
				const response = await axios.post(`${API_BASE_URL}/produits`, payload, { headers });
				const created = response?.data;
				setProducts((prev) => [created, ...prev]);
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
				Alert.alert('Validation', firstError || 'Données produit invalides.');
			} else {
				Alert.alert('Erreur', 'Impossible d’enregistrer le produit.');
			}
		} finally {
			setSaving(false);
		}
	};

	const deactivateProduct = (id) => {
		Alert.alert('Désactiver', 'Voulez-vous désactiver ce produit ?', [
			{ text: 'Annuler', style: 'cancel' },
			{
				text: 'Désactiver',
				style: 'destructive',
				onPress: async () => {
					try {
						const headers = await getAuthHeaders();
						await axios.delete(`${API_BASE_URL}/produits/${id}`, { headers });
						setProducts((prev) => prev.filter((item) => item.id !== id));
					} catch (error) {
						if (error?.response?.status === 401) {
							navigation.replace('Login');
							return;
						}
						if (error?.message === 'NO_TOKEN') return;
						const apiMessage = error?.response?.data?.message;
						Alert.alert('Erreur', apiMessage || 'Désactivation impossible.');
					}
				},
			},
		]);
	};

	const handleNavChange = (page) => {
		navigation.navigate(page);
	};

	const renderItem = ({ item }) => {
		const price = Number(item?.prix_unitaire || 0);
		const productTva = Number(item?.tva || 0);
		const ttc = price * (1 + productTva / 100);

		return (
			<View style={s.card}>
				<View style={{ flex: 1 }}>
					<Text style={s.name}>{item?.libelle || 'Produit sans nom'}</Text>
					{!!item?.description && <Text style={s.meta} numberOfLines={2}>{item.description}</Text>}
					<Text style={s.meta}>PU HT: {price.toFixed(2)} MAD</Text>
					<Text style={s.meta}>TVA: {productTva.toFixed(2)}%</Text>
					<Text style={s.meta}>PU TTC: {ttc.toFixed(2)} MAD</Text>
					<Text style={s.unit}>{String(item?.unite || 'unite')}</Text>
				</View>
				<View style={s.actionsCol}>
					<TouchableOpacity activeOpacity={0.85} style={s.editBtn} onPress={() => openEdit(item)}>
						<Text style={s.editTxt}>Modifier</Text>
					</TouchableOpacity>
					<TouchableOpacity activeOpacity={0.85} style={s.deleteBtn} onPress={() => deactivateProduct(item.id)}>
						<Text style={s.deleteTxt}>Désactiver</Text>
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	return (
		<SafeAreaView style={s.safe} edges={['top', 'right', 'bottom', 'left']}>
			<View style={[s.header, { paddingTop: Math.max(insets.top, 8) }]}>
				<TouchableOpacity style={s.backBtn} onPress={() => navigation.replace('Dash')}>
					<Text style={s.backTxt}>← Retour</Text>
				</TouchableOpacity>
				<Text style={s.title}>Produits ({products.length})</Text>
			</View>

			<View style={s.toolbar}>
				<TextInput
					style={s.search}
					placeholder="Rechercher produit"
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
					data={filteredProducts}
					keyExtractor={(item) => String(item.id)}
					renderItem={renderItem}
					contentContainerStyle={s.list}
					refreshing={refreshing}
					onRefresh={() => load(true)}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={
						<View style={s.emptyCard}>
							<Text style={s.emptyEmoji}>📦</Text>
							<Text style={s.emptyTitle}>Aucun produit</Text>
							<Text style={s.emptySub}>Ajoutez un produit pour commencer.</Text>
						</View>
					}
				/>
			)}

			<Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
				<KeyboardAvoidingView
					style={s.modalWrap}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
					keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
				>
					<ScrollView
						style={s.modalScroll}
						contentContainerStyle={s.modalScrollContent}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={s.modalCard}>
							<Text style={s.modalTitle}>{editingId ? 'Modifier produit' : 'Nouveau produit'}</Text>
							<TextInput
								style={s.input}
								placeholder="Libellé *"
								placeholderTextColor={C.sub}
								value={libelle}
								onChangeText={setLibelle}
							/>
							<TextInput
								style={s.input}
								placeholder="Description"
								placeholderTextColor={C.sub}
								value={description}
								onChangeText={setDescription}
								multiline
							/>
							<TextInput
								style={s.input}
								placeholder="Prix unitaire HT"
								placeholderTextColor={C.sub}
								value={prixUnitaire}
								onChangeText={setPrixUnitaire}
								keyboardType="numeric"
							/>
							<TextInput
								style={s.input}
								placeholder="TVA (%)"
								placeholderTextColor={C.sub}
								value={tva}
								onChangeText={setTva}
								keyboardType="numeric"
							/>

							<View style={s.unitsRow}>
								{PRODUCT_UNITS.map((u) => (
									<TouchableOpacity
										key={u}
										activeOpacity={0.85}
										style={[s.unitPill, unite === u && s.unitPillActive]}
										onPress={() => setUnite(u)}
									>
										<Text style={[s.unitPillTxt, unite === u && s.unitPillTxtActive]}>{u}</Text>
									</TouchableOpacity>
								))}
							</View>

							<View style={s.modalActions}>
								<TouchableOpacity activeOpacity={0.85} style={s.cancelBtn} onPress={() => setShowForm(false)}>
									<Text style={s.cancelTxt}>Annuler</Text>
								</TouchableOpacity>
								<TouchableOpacity activeOpacity={0.85} style={s.saveBtn} onPress={saveProduct}>
									{saving ? <ActivityIndicator color={C.white} /> : <Text style={s.saveTxt}>Enregistrer</Text>}
								</TouchableOpacity>
							</View>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</Modal>

			<Navbar onChange={handleNavChange} current="Products" />
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.bg },
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
	unit: {
		marginTop: 6,
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: '#EEF2FF',
		color: C.accent,
		fontSize: 12,
		fontWeight: '700',
	},
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
	modalScroll: {
		maxHeight: '90%',
	},
	modalScrollContent: {
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
	unitsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 4,
	},
	unitPill: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.white,
	},
	unitPillActive: {
		backgroundColor: C.accent,
		borderColor: C.accent,
	},
	unitPillTxt: { color: C.text, fontSize: 12, fontWeight: '700' },
	unitPillTxtActive: { color: C.white },
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

export default Products;