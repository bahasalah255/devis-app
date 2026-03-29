import React, { useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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
import Navbar from './Navbar';
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

const statusMeta = {
	brouillon: { label: 'Brouillon', dot: '⚪' },
	envoye: { label: 'Envoyé', dot: '🟣' },
	accepte: { label: 'Accepté', dot: '🟢' },
	refuse: { label: 'Refusé', dot: '🔴' },
};

export default function Dash({ navigation }) {
	const [user, setUser] = useState(null);
	const [devis, setDevis] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const load = async (refresh = false) => {
		refresh ? setRefreshing(true) : setLoading(true);
		try {
			const [rawUser, token] = await Promise.all([
				AsyncStorage.getItem('user'),
				AsyncStorage.getItem('token'),
			]);
			if (!token) {
				navigation.replace('Login');
				return;
			}
			if (rawUser) setUser(JSON.parse(rawUser));

			const response = await axios.get(`${API_BASE_URL}/devis`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setDevis(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			if (error?.response?.status === 401) {
				navigation.replace('Login');
				return;
			}
			Alert.alert('Erreur', 'Impossible de charger les devis.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		load();
	}, []);

	const handleLogout = () => {
		Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
			{ text: 'Annuler', style: 'cancel' },
			{
				text: 'Oui',
				style: 'destructive',
				onPress: async () => {
					await AsyncStorage.multiRemove(['token', 'user']);
					navigation.replace('Login');
				},
			},
		]);
	};
	const downloadInvoice = async (devis_id) => {
		  const url = `${API_BASE_URL}/devis/${devis_id}/pdf`;
		  console.log('in work');
		   await Linking.openURL(`${url}`);
	}
	const sendPdfWhatsApp = async (id) => {
		 try {
        // 1. Download PDF from your Laravel API
        const localUri = FileSystem.documentDirectory + `facture-${id}.pdf`;

        const { uri } = await FileSystem.downloadAsync(
            `${API_BASE_URL}/devis/${id}/pdf`, // your Laravel route
            localUri
        );

        // 2. Check if sharing is available on the device
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
            Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil.');
            return;
        }

        // 3. Open native share sheet → user picks WhatsApp
        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Devis Equipement Chefchouani ${id}`,
            UTI: 'com.adobe.pdf', // iOS only
        });

    } catch (error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer la facture.');
        console.error(error);
    }
		
	}
	const handleArchive = (id) => {
		Alert.alert('Archiver', 'Archiver ce devis ?', [
			{ text: 'Annuler', style: 'cancel' },
			{
				text: 'Archiver',
				style: 'destructive',
				onPress: async () => {
					try {
						const token = await AsyncStorage.getItem('token');
						await axios.patch(`${API_BASE_URL}/Archive/${id}`, {}, {
							headers: {
								Authorization: `Bearer ${token}`,
								Accept: 'application/json',
							},
						});
						load(true);
					} catch {
						Alert.alert('Erreur', 'Archive impossible.');
					}
				},
			},
		]);
	};

	const stats = useMemo(() => {
		const accepted = devis.filter((d) => d.statut === 'accepte').length;
		const total = devis.reduce((sum, d) => sum + Number(d.total_ttc || 0), 0);
		return { accepted, total };
	}, [devis]);

	const renderItem = ({ item }) => {
		const status = statusMeta[item.statut] || statusMeta.brouillon;
		return (
			<TouchableOpacity
				activeOpacity={0.9}
				style={s.card}
				onPress={() => navigation.navigate('UpdateDevis', { devis: item })}
			>
				<View style={s.cardTop}>
					<View style={{ flex: 1 }}>
						<Text style={s.cardNumber}>{item.numero || `DEV-${item.id}`}</Text>
						<Text style={s.cardClient} numberOfLines={1}>{item?.client?.nom || 'Client inconnu'}</Text>
					</View>
					<TouchableOpacity activeOpacity={0.8} style={s.archiveMini} onPress={() => handleArchive(item.id)}>
						<Text style={s.archiveMiniTxt}>🗂</Text>
					</TouchableOpacity>
					<TouchableOpacity  onPress={() => downloadInvoice(item.id)}>
    <Text >📄</Text>
</TouchableOpacity>
  <TouchableOpacity
                
                onPress={() => sendPdfWhatsApp(item.id)}
            >
                <Text>📲</Text>
            </TouchableOpacity>
				</View>

				<View style={s.rowBetween}>
					<Text style={s.amount}>{Number(item.total_ttc || 0).toFixed(2)} MAD</Text>
					<Text style={s.status}>{`${status.dot} ${status.label}`}</Text>
				</View>
			</TouchableOpacity>
		);
	};

	return (
		<SafeAreaView style={s.safe}>
			
			<View style={s.header}>
				<View>
					<Text style={s.hello}>Bonjour</Text>
					<Text style={s.name}>{user?.name || 'Utilisateur'}</Text>
				</View>
				<TouchableOpacity activeOpacity={0.8} style={s.logoutBtn} onPress={handleLogout}>
					<Text style={s.logoutTxt}>Déconnexion</Text>
				</TouchableOpacity>
			</View>
		
			<View style={s.quickActions}>
				<TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={() => navigation.replace('CreateDevis')}>
					<Text style={s.primaryBtnTxt}>+ Nouveau devis</Text>
				</TouchableOpacity>
				<TouchableOpacity activeOpacity={0.9} style={s.secondaryBtn} onPress={() => navigation.replace('Archive')}>
					<Text style={s.secondaryBtnTxt}>Archives</Text>
				</TouchableOpacity>
			</View>

			<View style={s.statsRow}>
				<View style={s.statCard}>
					<Text style={s.statLabel}>Devis en cours</Text>
					<Text style={s.statValue}>{devis.length}</Text>
				</View>
				<View style={s.statCard}>
					<Text style={s.statLabel}>Acceptés</Text>
					<Text style={s.statValue}>{stats.accepted}</Text>
				</View>
				<View style={s.statCard}>
					<Text style={s.statLabel}>Montant</Text>
					<Text style={s.statValue}>{stats.total.toFixed(0)}</Text>
				</View>
			</View>

			{loading ? (
				<View style={s.center}><ActivityIndicator color={C.accent} /></View>
			) : (
				<FlatList
					data={devis}
					keyExtractor={(item) => String(item.id)}
					renderItem={renderItem}
					contentContainerStyle={s.list}
					showsVerticalScrollIndicator={false}
					refreshing={refreshing}
					onRefresh={() => load(true)}
					ListEmptyComponent={
						<View style={s.emptyCard}>
							<Text style={s.emptyEmoji}>🧾</Text>
							<Text style={s.emptyTitle}>Aucun devis pour le moment</Text>
							<Text style={s.emptySub}>Touchez « Nouveau devis » pour commencer.</Text>
						</View>
					}
				/>
			)}
			<Navbar />
			
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
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	hello: { color: C.sub, fontSize: 13 },
	name: { color: C.text, fontSize: 22, fontWeight: '700' },
	logoutBtn: {
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.white,
		justifyContent: 'center',
	},
	logoutTxt: { color: C.text, fontSize: 13, fontWeight: '600' },

	quickActions: {
		paddingHorizontal: 16,
		flexDirection: 'row',
		gap: 10,
		marginBottom: 12,
	},
	primaryBtn: {
		flex: 1,
		height: 52,
		borderRadius: 14,
		backgroundColor: C.accent,
		justifyContent: 'center',
		alignItems: 'center',
		...SHADOW,
	},
	primaryBtnTxt: { color: C.white, fontSize: 16, fontWeight: '700' },
	secondaryBtn: {
		width: 110,
		height: 52,
		borderRadius: 14,
		backgroundColor: C.white,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: C.border,
		...SHADOW,
	},
	secondaryBtnTxt: { color: C.text, fontSize: 14, fontWeight: '700' },

	statsRow: { paddingHorizontal: 16, flexDirection: 'row', gap: 8, marginBottom: 10 },
	statCard: {
		flex: 1,
		backgroundColor: C.white,
		borderRadius: 14,
		padding: 10,
		borderWidth: 1,
		borderColor: C.border,
		...SHADOW,
	},
	statLabel: { color: C.sub, fontSize: 11, marginBottom: 4 },
	statValue: { color: C.text, fontSize: 17, fontWeight: '700' },

	list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
	card: {
		backgroundColor: C.white,
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: C.border,
		...SHADOW,
	},
	cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
	cardNumber: { color: C.text, fontSize: 16, fontWeight: '700' },
	cardClient: { color: C.sub, fontSize: 13, marginTop: 2 },
	archiveMini: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#EEF0F8',
		justifyContent: 'center',
		alignItems: 'center',
	},
	archiveMiniTxt: { fontSize: 16 },
	rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	amount: { color: C.text, fontSize: 17, fontWeight: '800' },
	status: { color: C.sub, fontSize: 13, fontWeight: '600' },

	emptyCard: {
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 14,
		padding: 24,
		alignItems: 'center',
		...SHADOW,
	},
	emptyEmoji: { fontSize: 26, marginBottom: 8 },
	emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
	emptySub: { color: C.sub, fontSize: 13, marginTop: 4, textAlign: 'center' },
});