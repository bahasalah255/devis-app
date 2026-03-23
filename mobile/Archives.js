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

export default function Archive({ navigation }) {
	const [devis, setDevis] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const load = async (refresh = false) => {
		refresh ? setRefreshing(true) : setLoading(true);
		try {
			const token = await AsyncStorage.getItem('token');
			if (!token) {
				navigation.replace('Login');
				return;
			}
			const response = await axios.get(`${API_BASE_URL}/index_archive`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setDevis(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			if (error?.response?.status === 401) {
				navigation.replace('Login');
				return;
			}
			Alert.alert('Erreur', 'Impossible de charger les archives.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	const handleUnarchive = (id) => {
		Alert.alert('Restaurer', 'Remettre ce devis dans la liste active ?', [
			{ text: 'Annuler', style: 'cancel' },
			{
				text: 'Restaurer',
				onPress: async () => {
					try {
						const token = await AsyncStorage.getItem('token');
						await axios.patch(`${API_BASE_URL}/Unarchive/${id}`, {}, {
							headers: {
								Authorization: `Bearer ${token}`,
								Accept: 'application/json',
							},
						});
						load(true);
					} catch {
						Alert.alert('Erreur', 'Restauration impossible.');
					}
				},
			},
		]);
	};

	const formatDate = (value) => {
		if (!value) return '-';
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return '-';
		return d.toLocaleDateString('fr-FR');
	};

	const renderItem = ({ item }) => (
		<View style={s.card}>
			<View style={s.rowBetween}>
				<View style={{ flex: 1 }}>
					<Text style={s.number}>{item.numero || `DEV-${item.id}`}</Text>
					<Text style={s.client} numberOfLines={1}>{item?.client?.nom || 'Client inconnu'}</Text>
				</View>
				<Text style={s.badge}>🗄 Archivé</Text>
			</View>

			<View style={[s.rowBetween, { marginTop: 10 }]}>
				<Text style={s.meta}>Mis à jour: {formatDate(item.updated_at || item.created_at)}</Text>
				<Text style={s.amount}>{Number(item.total_ttc || 0).toFixed(2)} MAD</Text>
			</View>

			<TouchableOpacity activeOpacity={0.85} style={s.restoreBtn} onPress={() => handleUnarchive(item.id)}>
				<Text style={s.restoreBtnTxt}>↩ Restaurer</Text>
			</TouchableOpacity>
		</View>
	);

	return (
		<SafeAreaView style={s.safe}>
			<View style={s.header}>
				<TouchableOpacity activeOpacity={0.8} style={s.backBtn} onPress={() => navigation.replace('Dash')}>
					<Text style={s.backBtnTxt}>← Retour</Text>
				</TouchableOpacity>
				<Text style={s.headerTitle}>Archives ({devis.length})</Text>
			</View>

			{loading ? (
				<View style={s.center}><ActivityIndicator color={C.accent} /></View>
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
							<Text style={s.emptyTitle}>Aucun devis archivé</Text>
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
	backBtnTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
	headerTitle: { color: C.text, fontSize: 20, fontWeight: '800' },
	list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
	card: {
		backgroundColor: C.white,
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: C.border,
		...SHADOW,
	},
	rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
	number: { color: C.text, fontSize: 16, fontWeight: '700' },
	client: { color: C.sub, fontSize: 13, marginTop: 2 },
	badge: { color: C.accent, fontSize: 12, fontWeight: '700' },
	meta: { color: C.sub, fontSize: 12, flex: 1 },
	amount: { color: C.text, fontSize: 16, fontWeight: '800' },
	restoreBtn: {
		height: 44,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 12,
		backgroundColor: '#EEF0FF',
	},
	restoreBtnTxt: { color: C.accent, fontSize: 15, fontWeight: '800' },
	emptyCard: {
		marginTop: 24,
		backgroundColor: C.white,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: C.border,
		padding: 24,
		alignItems: 'center',
		...SHADOW,
	},
	emptyEmoji: { fontSize: 26, marginBottom: 8 },
	emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
	emptySub: { color: C.sub, fontSize: 13, marginTop: 4 },
});
