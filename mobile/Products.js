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
import { COLORS, SHADOW, SHADOW_SM, RADIUS } from './utils/platformStyles';

const C = COLORS;

const PRODUCT_UNITS = ['unite', 'kg', 'litre', 'metre'];

const UNIT_META = {
	unite: { icon: 'cube-outline', label: 'Unité' },
	kg: { icon: 'scale-outline', label: 'Kilo' },
	litre: { icon: 'water-outline', label: 'Litre' },
	metre: { icon: 'resize-outline', label: 'Mètre' },
};

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
		if (!token) { navigation.replace('Login'); throw new Error('NO_TOKEN'); }
		return { Authorization: `Bearer ${token}` };
	};

	const load = async (refresh = false) => {
		refresh ? setRefreshing(true) : setLoading(true);
		try {
			const headers = await getAuthHeaders();
			const response = await axios.get(`${API_BASE_URL}/produits`, { headers });
			setProducts(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			if (error?.response?.status === 401) { navigation.replace('Login'); return; }
			if (error?.message === 'NO_TOKEN') return;
			Alert.alert('Erreur', 'Impossible de charger les produits.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => { load(); }, []);

	const filteredProducts = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return products;
		return products.filter((item) => {
			const text = `${item?.libelle || ''} ${item?.description || ''} ${item?.unite || ''}`.toLowerCase();
			return text.includes(q);
		});
	}, [products, query]);

	const resetForm = () => {
		setEditingId(null); setLibelle(''); setDescription('');
		setPrixUnitaire(''); setTva('20'); setUnite('unite');
	};

	const openCreate = () => { resetForm(); setShowForm(true); };

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
			Alert.alert('Champ requis', 'Le nom du produit est obligatoire.');
			return;
		}
		const parsedPrice = Number(String(prixUnitaire).replace(',', '.'));
		if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
			Alert.alert('Prix invalide', 'Entrez un prix valide (ex: 150.00).');
			return;
		}
		const parsedTva = Number(String(tva).replace(',', '.'));
		if (!Number.isFinite(parsedTva) || parsedTva < 0 || parsedTva > 100) {
			Alert.alert('TVA invalide', 'La TVA doit être entre 0 et 100.');
			return;
		}
		if (!PRODUCT_UNITS.includes(unite)) {
			Alert.alert('Unité requise', 'Sélectionnez une unité.');
			return;
		}
		setSaving(true);
		try {
			const headers = await getAuthHeaders();
			const payload = { libelle: libelle.trim(), description: description.trim() || null, prix_unitaire: parsedPrice, tva: parsedTva, unite };
			if (editingId) {
				const response = await axios.put(`${API_BASE_URL}/produits/${editingId}`, payload, { headers });
				setProducts((prev) => prev.map((item) => (item.id === editingId ? response?.data : item)));
			} else {
				const response = await axios.post(`${API_BASE_URL}/produits`, payload, { headers });
				setProducts((prev) => [response?.data, ...prev]);
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
				Alert.alert('Erreur', 'Impossible d\'enregistrer le produit.');
			}
		} finally {
			setSaving(false);
		}
	};

	const deactivateProduct = (id) => {
		Alert.alert('Désactiver le produit', 'Ce produit ne sera plus disponible.', [
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
						if (error?.response?.status === 401) { navigation.replace('Login'); return; }
						if (error?.message === 'NO_TOKEN') return;
						const apiMessage = error?.response?.data?.message;
						Alert.alert('Erreur', apiMessage || 'Désactivation impossible.');
					}
				},
			},
		]);
	};

	const handleNavChange = (page) => { navigation.navigate(page); };

	const renderItem = ({ item }) => {
		const price = Number(item?.prix_unitaire || 0);
		const productTva = Number(item?.tva || 0);
		const ttc = price * (1 + productTva / 100);
		const unitMeta = UNIT_META[item?.unite] || UNIT_META.unite;

		return (
			<View style={s.card}>
				<View style={s.cardIconWrap}>
					<Ionicons name={unitMeta.icon} size={22} color={C.accent} />
				</View>
				<View style={s.cardBody}>
					<View style={s.cardTop}>
						<Text style={s.cardName} numberOfLines={1}>{item?.libelle || 'Produit sans nom'}</Text>
						<View style={s.unitBadge}>
							<Text style={s.unitBadgeTxt}>{unitMeta.label}</Text>
						</View>
					</View>
					{!!item?.description && (
						<Text style={s.description} numberOfLines={2}>{item.description}</Text>
					)}
					<View style={s.priceRow}>
						<View>
							<Text style={s.priceLabel}>HT</Text>
							<Text style={s.priceHT}>{price.toFixed(2)} MAD</Text>
						</View>
						<View style={s.priceDivider} />
						<View>
							<Text style={s.priceLabel}>TTC ({productTva}%)</Text>
							<Text style={s.priceTTC}>{ttc.toFixed(2)} MAD</Text>
						</View>
					</View>
				</View>
				<View style={s.cardActions}>
					<TouchableOpacity activeOpacity={0.85} style={s.editBtn} onPress={() => openEdit(item)}>
						<Ionicons name="pencil-outline" size={16} color={C.accent} />
					</TouchableOpacity>
					<TouchableOpacity activeOpacity={0.85} style={s.deleteBtn} onPress={() => deactivateProduct(item.id)}>
						<Ionicons name="trash-outline" size={16} color={C.danger} />
					</TouchableOpacity>
				</View>
			</View>
		);
	};

	return (
		<SafeAreaView style={s.safe} edges={['top', 'right', 'bottom', 'left']}>
			<View style={[s.header, { paddingTop: Math.max(insets.top, 10) }]}>
				<View>
					<Text style={s.title}>Produits</Text>
					<Text style={s.subtitle}>{products.length} produit{products.length !== 1 ? 's' : ''} dans le catalogue</Text>
				</View>
				<TouchableOpacity activeOpacity={0.9} style={s.addBtn} onPress={openCreate}>
					<Ionicons name="add" size={20} color={C.white} />
					<Text style={s.addTxt}>Ajouter</Text>
				</TouchableOpacity>
			</View>

			<View style={s.searchBar}>
				<Ionicons name="search-outline" size={18} color={C.sub} />
				<TextInput
					style={s.searchInput}
					placeholder="Rechercher un produit…"
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
							<Text style={s.emptyTitle}>{query ? 'Aucun résultat' : 'Aucun produit'}</Text>
							<Text style={s.emptySub}>
								{query ? `Aucun produit pour "${query}"` : 'Ajoutez vos produits au catalogue.'}
							</Text>
							{!query && (
								<TouchableOpacity style={s.emptyAction} onPress={openCreate}>
									<Text style={s.emptyActionTxt}>+ Ajouter un produit</Text>
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
								<Text style={s.modalTitle}>{editingId ? 'Modifier le produit' : 'Nouveau produit'}</Text>
								<TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
									<Ionicons name="close-circle" size={24} color={C.sub} />
								</TouchableOpacity>
							</View>

							<LabeledInput
								label="Nom du produit"
								required
								placeholder="Ex: Câble électrique 2.5mm"
								value={libelle}
								onChangeText={setLibelle}
							/>
							<LabeledInput
								label="Description"
								placeholder="Détails optionnels"
								value={description}
								onChangeText={setDescription}
								multiline
							/>

							<View style={s.priceRow2}>
								<View style={{ flex: 1 }}>
									<LabeledInput
										label="Prix unitaire HT"
										required
										placeholder="0.00"
										value={prixUnitaire}
										onChangeText={setPrixUnitaire}
										keyboardType="decimal-pad"
									/>
								</View>
								<View style={{ width: 90 }}>
									<LabeledInput
										label="TVA (%)"
										placeholder="20"
										value={tva}
										onChangeText={setTva}
										keyboardType="numeric"
									/>
								</View>
							</View>

							<View style={inp.wrap}>
								<Text style={inp.label}>Unité de mesure</Text>
								<View style={s.unitsRow}>
									{PRODUCT_UNITS.map((u) => {
										const meta = UNIT_META[u];
										const isActive = unite === u;
										return (
											<TouchableOpacity
												key={u}
												activeOpacity={0.85}
												style={[s.unitPill, isActive && s.unitPillActive]}
												onPress={() => setUnite(u)}
											>
												<Ionicons
													name={meta.icon}
													size={14}
													color={isActive ? C.white : C.textMid}
												/>
												<Text style={[s.unitPillTxt, isActive && s.unitPillTxtActive]}>
													{meta.label}
												</Text>
											</TouchableOpacity>
										);
									})}
								</View>
							</View>

							<View style={s.modalActions}>
								<TouchableOpacity
									activeOpacity={0.85}
									style={s.cancelBtn}
									onPress={() => { setShowForm(false); resetForm(); }}
								>
									<Text style={s.cancelTxt}>Annuler</Text>
								</TouchableOpacity>
								<TouchableOpacity activeOpacity={0.85} style={s.saveBtn} onPress={saveProduct} disabled={saving}>
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

			<Navbar onChange={handleNavChange} current="Products" />
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
	cardIconWrap: {
		width: 46,
		height: 46,
		borderRadius: 14,
		backgroundColor: C.accentLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	cardBody: { flex: 1, gap: 8 },
	cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	cardName: { flex: 1, color: C.text, fontSize: 16, fontWeight: '800' },
	description: { color: C.sub, fontSize: 13, lineHeight: 18 },
	unitBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 99,
		backgroundColor: C.accentLight,
	},
	unitBadgeTxt: { color: C.accent, fontSize: 11, fontWeight: '700' },
	priceRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
	priceDivider: { width: 1, height: 28, backgroundColor: C.border },
	priceLabel: { color: C.sub, fontSize: 11, fontWeight: '600' },
	priceHT: { color: C.textMid, fontSize: 15, fontWeight: '700' },
	priceTTC: { color: C.text, fontSize: 15, fontWeight: '800' },
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

	modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.40)', justifyContent: 'flex-end' },
	modalHandle: {
		width: 40, height: 4, borderRadius: 2,
		backgroundColor: 'rgba(255,255,255,0.4)',
		alignSelf: 'center', marginBottom: 8,
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
		flexDirection: 'row', alignItems: 'center',
		justifyContent: 'space-between', marginBottom: 4,
	},
	modalTitle: { color: C.text, fontSize: 20, fontWeight: '800' },

	priceRow2: { flexDirection: 'row', gap: 12 },

	unitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
	unitPill: {
		flexDirection: 'row', alignItems: 'center', gap: 5,
		paddingHorizontal: 12, paddingVertical: 10,
		borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
		backgroundColor: C.white,
	},
	unitPillActive: { backgroundColor: C.accent, borderColor: C.accent },
	unitPillTxt: { color: C.textMid, fontSize: 13, fontWeight: '700' },
	unitPillTxtActive: { color: C.white },

	modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
	cancelBtn: {
		flex: 1, height: 50, borderRadius: 14,
		backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
		alignItems: 'center', justifyContent: 'center',
	},
	cancelTxt: { color: C.textMid, fontSize: 15, fontWeight: '700' },
	saveBtn: {
		flex: 2, height: 50, borderRadius: 14,
		backgroundColor: C.accent,
		flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
		...SHADOW,
	},
	saveTxt: { color: C.white, fontSize: 15, fontWeight: '800' },
});

export default Products;
