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
import { Ionicons } from '@expo/vector-icons';
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
    const Archive = (id) => {
        Alert.alert('Archive','Confirmer ?',[
            {text : 'Annuler', style : 'cancel'},
            {
                text : 'Archiver' , style : 'destructive',
                onPress : async() => {
                    try {
                        const token = await AsyncStorage.getItem('token');
                        const reponse = await axios.patch(`${API_BASE_URL}/Archive/${id}`,{},
                            {
                                headers: {
                                Authorization: `Bearer ${token}`,
                                Accept: 'application/json',
                            }
                            }
                        );
                        console.log('archived')
                        load()

                    } catch(error) {
                        console.error('Error:', error.response?.data);
                    }
                     
                }
            }
         ])
       

    };
	const renderItem = ({ item, index }) => (
		<TouchableOpacity
			activeOpacity={0.7}
			style={s.devisRow}
			onPress={() => navigation.navigate('UpdateDevis', { devis: item })}
		>
			<View style={s.leftCol}>
				<Text style={s.devisNum}>{item.numero}</Text>
				<Text style={s.devisClient} numberOfLines={1}>
					{item?.client?.nom || 'Client inconnu'}
				</Text>
				<View style={s.metaRow}>
					<Ionicons name="document-text-outline" size={13} color={C.sub} />
					<Text style={s.metaText}>Devis #{item?.id || '-'}</Text>
				</View>
			</View>
			<View style={s.rightCol}>
				<TouchableOpacity onPress={() => Archive(item.id)} style={s.archiveIconBtn}>
					<Ionicons name="archive-outline" size={18} color={C.accent} />
				</TouchableOpacity>
				<Text style={s.devisAmount}>
					{Number(item.total_ttc || 0).toFixed(2)} MAD
				</Text>
				<Chip status={item.statut} />
			</View>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={s.safe}>

			{/* Header */}
			<View style={s.header}>
				<View style={s.headerLeft}>
					<Text style={s.welcomeText}>Bienvenue</Text>
					<Text style={s.headerName}>{user ? user.name : '—'}</Text>
				</View>
				<TouchableOpacity onPress={logout} style={s.logoutBtn}>
					<Ionicons name="log-out-outline" size={16} color={C.accent} />
					<Text style={s.logoutText}>Deconnexion</Text>
				</TouchableOpacity>
			</View>

			<View style={s.statsRow}>
				<View style={s.statCard}>
					<Text style={s.statLabel}>Total devis</Text>
					<Text style={s.statValue}>{devis.length}</Text>
				</View>
				<View style={s.statCard}>
					<Text style={s.statLabel}>Acceptes</Text>
					<Text style={[s.statValue, { color: '#1E8E3E' }]}>{accepted}</Text>
				</View>
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
							<TouchableOpacity style={s.newBtn} onPress={() => navigation.replace('CreateDevis')}>
								<Ionicons name="add" size={16} color="#fff" />
								<Text style={s.newBtnText}>Nouveau</Text>
							</TouchableOpacity>
						</View>
					}
					ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
					ListEmptyComponent={
						<View style={s.empty}>
							<Ionicons name="file-tray-outline" size={34} color={C.sub} />
							<Text style={s.emptyTitle}>Aucun devis</Text>
							<Text style={s.emptySub}>Creez votre premier devis</Text>
						</View>
					}
				/>
                
			)}
            {/* List Archive */}
			<TouchableOpacity style={s.archiveBtn} onPress={() => navigation.replace('Archive')}>
				<Ionicons name="archive" size={18} color="#fff" />
				<Text style={s.archiveBtnText}>Mes devis archives</Text>
			</TouchableOpacity>

		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe: { flex: 1, backgroundColor: C.bg },

	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 18,
		paddingTop: 10,
		paddingBottom: 6,
	},
	headerLeft: { flex: 1 },
	welcomeText: { fontSize: 12, color: C.sub, marginBottom: 2 },
	headerName: { fontSize: 18, fontWeight: '700', color: C.text },
	logoutBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		backgroundColor: C.white,
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	logoutText: { fontSize: 13, color: C.accent, fontWeight: '600' },

	statsRow: {
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 4,
		flexDirection: 'row',
		gap: 10,
	},
	statCard: {
		flex: 1,
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingVertical: 12,
		paddingHorizontal: 12,
	},
	statLabel: { fontSize: 12, color: C.sub, marginBottom: 3 },
	statValue: { fontSize: 20, color: C.accent, fontWeight: '700' },

	list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },

	listHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	listTitle: { fontSize: 17, fontWeight: '700', color: C.text },
	newBtn: {
		backgroundColor: C.accent,
		paddingVertical: 9,
		paddingHorizontal: 12,
		borderRadius: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	newBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

	devisRow: {
		backgroundColor: C.white,
		paddingHorizontal: 14,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'flex-start',
		borderWidth: 1,
		borderRadius: 12,
		borderColor: C.border,
	},
	leftCol: {
		flex: 1,
		paddingRight: 10,
	},
	rightCol: {
		alignItems: 'flex-end',
		gap: 6,
	},
	archiveIconBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E0E7FF',
		backgroundColor: '#EEF2FF',
		justifyContent: 'center',
		alignItems: 'center',
	},

	devisNum:    { fontSize: 15, fontWeight: '600', color: C.text },
	devisClient: { fontSize: 13, color: C.sub, marginTop: 3 },
	metaRow: {
		marginTop: 6,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
	},
	metaText: { fontSize: 12, color: C.sub },
	devisAmount: { fontSize: 14, fontWeight: '600', color: C.text },

	chip: {
		paddingVertical: 3,
		paddingHorizontal: 8,
		borderRadius: 999,
	},
	chipText: { fontSize: 11, fontWeight: '600' },

	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

	empty: { alignItems: 'center', paddingTop: 64, gap: 6 },
	emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
	emptySub:   { fontSize: 14, color: C.sub },

	archiveBtn: {
		backgroundColor: C.accent,
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginHorizontal: 16,
		marginBottom: 16,
		marginTop: 8,
		flexDirection: 'row',
		gap: 8,
	},
	archiveBtnText: {
		color: '#fff',
		fontSize: 15,
		fontWeight: '700',
	},
    
});