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
	bg:     '#F2F2F7',
	white:  '#FFFFFF',
	border: '#E5E5EA',
	text:   '#000000',
	sub:    '#8E8E93',
	accent: '#4F46E5',
};

const STATUS = {
	brouillon: { label: 'Brouillon', bg: '#FFF3CD', color: '#856404' },
	envoye:    { label: 'Envoye',    bg: '#D1ECF1', color: '#0C5460' },
	accepte:   { label: 'Accepte',   bg: '#D4EDDA', color: '#155724' },
	refuse:    { label: 'Refuse',    bg: '#F8D7DA', color: '#721C24' },
};

function Chip({ status }) {
	const cfg = STATUS[status] || STATUS.brouillon;
	return (
		<View style={[s.chip, { backgroundColor: cfg.bg }]}>
			<Text style={[s.chipText, { color: cfg.color }]}>{cfg.label}</Text>
		</View>
	);
}

export default function Dash({ navigation }) {
	const [user, setUser]         = useState(null);
	const [devis, setDevis]       = useState([]);
	const [loading, setLoading]   = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const load = async (refresh = false) => {
		refresh ? setRefreshing(true) : setLoading(true);
		try {
			const [raw, token] = await Promise.all([
				AsyncStorage.getItem('user'),
				AsyncStorage.getItem('token'),
			]);
			if (raw) setUser(JSON.parse(raw));
			if (!token) { navigation.replace('Login'); return; }

			const res = await axios.get(`${API_BASE_URL}/devis`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setDevis(Array.isArray(res.data) ? res.data : []);
		} catch (e) {
			if (e?.response?.status === 401) { navigation.replace('Login'); return; }
			Alert.alert('Erreur', 'Impossible de charger les devis.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => { load(); }, []);

	const logout = () =>
		Alert.alert('Deconnexion', 'Confirmer ?', [
			{ text: 'Annuler', style: 'cancel' },
			{
				text: 'Deconnecter', style: 'destructive',
				onPress: async () => {
					await AsyncStorage.multiRemove(['token', 'user']);
					navigation.replace('Login');
				},
			},
		]);

	const accepted = devis.filter(d => d.statut === 'accepte').length;

	const renderItem = ({ item, index }) => (
		<TouchableOpacity
			activeOpacity={0.7}
			style={[
				s.devisRow,
				index === 0 && s.devisRowFirst,
				index === devis.length - 1 && s.devisRowLast,
			]}
			onPress={() => navigation.navigate('UpdateDevis', { devis: item })}
		>
			<View style={{ flex: 1 }}>
				<Text style={s.devisNum}>{item.numero}</Text>
				<Text style={s.devisClient} numberOfLines={1}>
					{item?.client?.nom || 'Client inconnu'}
				</Text>
			</View>
			<View style={{ alignItems: 'flex-end', gap: 5 }}>
				<Text style={s.devisAmount}>
					{Number(item.total_ttc || 0).toFixed(2)} MAD
				</Text>
				<Chip status={item.statut} />
			</View>
			{index < devis.length - 1 && <View style={s.rowSep} />}
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={s.safe}>

			{/* Header */}
			<View style={s.header}>
				<View>
					<Text style={s.headerName}>{user ? user.name : '—'}</Text>
					<Text style={s.headerSub}>
						{devis.length} devis · {accepted} acceptes
					</Text>
				</View>
				<TouchableOpacity onPress={logout}>
					<Text style={s.logoutText}>Deconnexion</Text>
				</TouchableOpacity>
			</View>

			{/* List */}
			{loading ? (
				<View style={s.center}>
					<ActivityIndicator color={C.accent} />
				</View>
			) : (
				<FlatList
					data={devis}
					keyExtractor={item => item.id.toString()}
					renderItem={renderItem}
					refreshing={refreshing}
					onRefresh={() => load(true)}
					contentContainerStyle={s.list}
					showsVerticalScrollIndicator={false}
					ListHeaderComponent={
						<View style={s.listHeader}>
							<Text style={s.listTitle}>Mes devis</Text>
							<TouchableOpacity
								style={s.newBtn}
								onPress={() => navigation.replace('CreateDevis')}
							>
								<Text style={s.newBtnText}>+ Nouveau</Text>
							</TouchableOpacity>
						</View>
					}
					ListEmptyComponent={
						<View style={s.empty}>
							<Text style={s.emptyTitle}>Aucun devis</Text>
							<Text style={s.emptySub}>Creez votre premier devis</Text>
						</View>
					}
				/>
			)}
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.bg },

	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 14,
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	headerName: { fontSize: 18, fontWeight: '700', color: C.text },
	headerSub:  { fontSize: 13, color: C.sub, marginTop: 2 },
	logoutText: { fontSize: 14, color: C.accent, fontWeight: '500' },

	list: { padding: 16, gap: 0 },

	listHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	listTitle: { fontSize: 16, fontWeight: '600', color: C.text },
	newBtn: {
		backgroundColor: C.accent,
		paddingVertical: 8,
		paddingHorizontal: 14,
		borderRadius: 8,
	},
	newBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

	// Devis rows grouped like iOS table
	devisRow: {
		backgroundColor: C.white,
		paddingHorizontal: 14,
		paddingVertical: 13,
		flexDirection: 'row',
		alignItems: 'center',
		borderLeftWidth: 1,
		borderRightWidth: 1,
		borderColor: C.border,
		position: 'relative',
	},
	devisRowFirst: {
		borderTopWidth: 1,
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
	},
	devisRowLast: {
		borderBottomWidth: 1,
		borderBottomLeftRadius: 12,
		borderBottomRightRadius: 12,
	},
	rowSep: {
		position: 'absolute',
		bottom: 0,
		left: 14,
		right: 0,
		height: 1,
		backgroundColor: C.border,
	},

	devisNum:    { fontSize: 15, fontWeight: '600', color: C.text },
	devisClient: { fontSize: 13, color: C.sub, marginTop: 2 },
	devisAmount: { fontSize: 14, fontWeight: '600', color: C.text },

	chip: {
		paddingVertical: 2,
		paddingHorizontal: 8,
		borderRadius: 5,
	},
	chipText: { fontSize: 11, fontWeight: '600' },

	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

	empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
	emptyTitle: { fontSize: 17, fontWeight: '600', color: C.text },
	emptySub:   { fontSize: 14, color: C.sub },
});