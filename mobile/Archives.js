import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	FlatList,
	Alert,
	ActivityIndicator,
	SafeAreaView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from './config';
import { COLORS, SHADOW, SHADOW_SM } from './utils/platformStyles';

const C = COLORS;

const formatDate = (value) => {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function Archive({ navigation }) {
	const [devis, setDevis] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const insets = useSafeAreaInsets();

	const load = async (refresh = false) => {
		refresh ? setRefreshing(true) : setLoading(true);
		try {
			const token = await AsyncStorage.getItem('token');
			if (!token) { navigation.replace('Login'); return; }
			const response = await axios.get(`${API_BASE_URL}/index_archive`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setDevis(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			if (error?.response?.status === 401) { navigation.replace('Login'); return; }
			Alert.alert('Erreur', 'Impossible de charger les archives.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => { load(); }, []);

	const handleUnarchive = (id) => {
		Alert.alert('Restaurer le devis', 'Ce devis retournera dans la liste active.', [
			{ text: 'Annuler', style: 'cancel' },
			{
				text: 'Restaurer',
				onPress: async () => {
					try {
						const token = await AsyncStorage.getItem('token');
						await axios.patch(`${API_BASE_URL}/Unarchive/${id}`, {}, {
							headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
						});
						load(true);
					} catch {
						Alert.alert('Erreur', 'Restauration impossible.');
					}
				},
			},
		]);
	};

	const renderItem = ({ item }) => (
		<View style={s.card}>
			<View style={s.cardHeader}>
				<View style={s.archiveBadge}>
					<Ionicons name="archive" size={12} color={C.sub} />
					<Text style={s.archiveBadgeTxt}>Archivé</Text>
				</View>
				<Text style={s.cardNumber}>{item.numero || `DEV-${item.id}`}</Text>
			</View>

			<Text style={s.clientName} numberOfLines={1}>
				{item?.client?.nom || 'Client inconnu'}
			</Text>

			<View style={s.cardMeta}>
				<View style={s.metaItem}>
					<Ionicons name="calendar-outline" size={13} color={C.sub} />
					<Text style={s.metaTxt}>{formatDate(item.archived_at || item.updated_at)}</Text>
				</View>
				<Text style={s.amount}>{Number(item.total_ttc || 0).toFixed(2)} MAD</Text>
			</View>

			<TouchableOpacity
				activeOpacity={0.85}
				style={s.restoreBtn}
				onPress={() => handleUnarchive(item.id)}
			>
				<Ionicons name="arrow-undo" size={16} color={C.accent} />
				<Text style={s.restoreBtnTxt}>Restaurer ce devis</Text>
			</TouchableOpacity>
		</View>
	);

	return (
		<SafeAreaView style={s.safe}>
			<View style={[s.header, { paddingTop: Math.max(insets.top, 10) }]}>
				<TouchableOpacity
					activeOpacity={0.8}
					style={s.backBtn}
					onPress={() => navigation.replace('Dash')}
				>
					<Ionicons name="arrow-back" size={20} color={C.text} />
				</TouchableOpacity>
				<View>
					<Text style={s.headerTitle}>Archives</Text>
					<Text style={s.headerSub}>{devis.length} devis archivé{devis.length !== 1 ? 's' : ''}</Text>
				</View>
				<View style={{ width: 40 }} />
			</View>

			{loading ? (
				<View style={s.center}>
					<ActivityIndicator size="large" color={C.accent} />
					<Text style={s.loadingTxt}>Chargement…</Text>
				</View>
			) : (
				<FlatList
					data={devis}
					keyExtractor={(item) => String(item.id)}
					renderItem={renderItem}
					contentContainerStyle={s.list}
					refreshing={refreshing}
					onRefresh={() => load(true)}
					showsVerticalScrollIndicator={false}
					ListEmptyComponent={
						<View style={s.emptyCard}>
							<Text style={s.emptyEmoji}>📭</Text>
							<Text style={s.emptyTitle}>Aucune archive</Text>
							<Text style={s.emptySub}>Vos devis archivés apparaîtront ici.</Text>
						</View>
					}
				/>
			)}
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
	headerTitle: { color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
	headerSub: { color: C.sub, fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 2 },

	list: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 32, gap: 10 },

	card: {
		backgroundColor: C.white,
		borderRadius: 18,
		padding: 16,
		borderWidth: 1,
		borderColor: C.border,
		gap: 10,
		...SHADOW,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	archiveBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 99,
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
	},
	archiveBadgeTxt: { color: C.sub, fontSize: 12, fontWeight: '600' },
	cardNumber: { color: C.sub, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

	clientName: { color: C.text, fontSize: 17, fontWeight: '800' },

	cardMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	metaTxt: { color: C.sub, fontSize: 13, fontWeight: '500' },
	amount: { color: C.text, fontSize: 18, fontWeight: '800' },

	restoreBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 46,
		borderRadius: 12,
		backgroundColor: C.accentLight,
		borderWidth: 1,
		borderColor: C.accentMid,
	},
	restoreBtnTxt: { color: C.accent, fontSize: 15, fontWeight: '800' },

	emptyCard: {
		backgroundColor: C.white,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: C.border,
		padding: 40,
		alignItems: 'center',
		marginTop: 16,
		...SHADOW,
	},
	emptyEmoji: { fontSize: 40, marginBottom: 14 },
	emptyTitle: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
	emptySub: { color: C.sub, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
