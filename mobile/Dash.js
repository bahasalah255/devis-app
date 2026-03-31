import React, { useEffect, useMemo, useRef, useState } from 'react';
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
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Navbar from './Navbar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from './config';
import { COLORS, SPACING, SHADOW, KEYBOARD_BEHAVIOR } from './utils/platformStyles';

const C = COLORS;

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
	const autoArchivedRef = useRef(new Set());
	const insets = useSafeAreaInsets();

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
	const getPdfRequestHeaders = async () => {
		const token = await AsyncStorage.getItem('token');
		if (!token) {
			navigation.replace('Login');
			throw new Error('NO_TOKEN');
		}

		return {
			Authorization: `Bearer ${token}`,
			Accept: 'application/pdf',
		};
	};

	const downloadInvoice = async (devis_id, email) => {
		const confirmed = await new Promise((resolve) => {
			Alert.alert(
				'Envoyer le devis',
				email ? `Envoyer le devis par email à ${email} ?` : 'Envoyer ce devis par email au client ?',
				[
					{ text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
					{ text: 'Envoyer', onPress: () => resolve(true) },
				]
			);
		});

		if (!confirmed) return;

		try {
			const token = await AsyncStorage.getItem('token');
			if (!token) {
				navigation.replace('Login');
				return;
			}

			const payload = email ? { email } : {};
			const response = await axios.post(
				`${API_BASE_URL}/devis/${devis_id}/send-email`,
				payload,
				{ headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
			);

			const sentTo = response?.data?.email || email;
			Alert.alert('Succès', sentTo ? `Devis envoyé à ${sentTo}.` : 'Devis envoyé par email.');
		} catch (error) {
			if (error?.response?.status === 401) {
				navigation.replace('Login');
				return;
			}

			const details =
				error?.response?.data?.message ||
				error?.message ||
				'Impossible d’envoyer le devis par email.';

			Alert.alert('Erreur envoi email', details);
		}
	};
		/*
		try {
			const headers = await getPdfRequestHeaders();
			const localUri = FileSystem.documentDirectory + `devis-${devis_id}.pdf`;

			const downloadResult = await FileSystem.downloadAsync(
				`${API_BASE_URL}/devis/${devis_id}/pdf`,
				localUri,
				{ headers }
			);

			if (downloadResult.status !== 200) {
				if (downloadResult.status === 401) {
					navigation.replace('Login');
					return;
				}
				throw new Error(`HTTP_${downloadResult.status}`);
			}

			const canShare = await Sharing.isAvailableAsync();
			if (!canShare) {
				Alert.alert('Succès', `PDF téléchargé: ${downloadResult.uri}`);
				return;
			}

			await Sharing.shareAsync(downloadResult.uri, {
				mimeType: 'application/pdf',
				dialogTitle: `Devis ${devis_id}`,
				UTI: 'com.adobe.pdf',
			});
		} catch (error) {
			if (error?.response?.status === 401) {
				navigation.replace('Login');
				return;
			}
			if (error?.message === 'NO_TOKEN') return;
			const details =
				error?.message ||
				error?.response?.data?.message ||
				'Connexion impossible au serveur';

			Alert.alert(
				'Erreur PDF',
				`Impossible de télécharger le PDF.\nURL: ${API_BASE_URL}\nDétail: ${details}`
			);
		}
		*/
	
	const sendPdfWhatsApp = async (id) => {
		 try {
			const headers = await getPdfRequestHeaders();
        // 1. Download PDF from your Laravel API
        const localUri = FileSystem.documentDirectory + `facture-${id}.pdf`;

        const downloadResult = await FileSystem.downloadAsync(
            `${API_BASE_URL}/devis/${id}/pdf`, // your Laravel route
            localUri,
			{ headers }
        );

		if (downloadResult.status !== 200) {
			if (downloadResult.status === 401) {
				navigation.replace('Login');
				return;
			}
			throw new Error(`HTTP_${downloadResult.status}`);
		}

        // 2. Check if sharing is available on the device
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
            Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil.');
            return;
        }

        // 3. Open native share sheet → user picks WhatsApp
		await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Devis Equipement Chefchouani ${id}`,
            UTI: 'com.adobe.pdf', // iOS only
        });

    } catch (error) {
		if (error?.response?.status === 401) {
			navigation.replace('Login');
			return;
		}
		if (error?.message === 'NO_TOKEN') return;
		const details =
			error?.message ||
			error?.response?.data?.message ||
			'Connexion impossible au serveur';
        Alert.alert('Erreur', `Impossible d\'envoyer la facture.\nURL: ${API_BASE_URL}\nDétail: ${details}`);
        console.error(error);
    }
		
	}
	const handleArchive = async (id) => {
				
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
					
				
	};
}

	const stats = useMemo(() => {
		const accepted = devis.filter((d) => d.statut === 'accepte').length;
		const total = devis.reduce((sum, d) => sum + Number(d.total_ttc || 0), 0);
		return { accepted, total };
	}, [devis]);

	useEffect(() => {
		const now = Date.now();
		const toArchive = devis.filter((item) => {
			if (!item?.id || !item?.created_at) return false;
			if (autoArchivedRef.current.has(item.id)) return false;

			const itemDate = item.restored_at ? new Date(String(item.restored_at).replace(' ', 'T')) :
			new Date(String(item.created_at).replace(' ', 'T')) ;
			if (Number.isNaN(itemDate.getTime())) return false;

			const diffDays = (now - itemDate.getTime()) / (1000 * 60 * 60 * 24);
			return diffDays > 2;
		});

		if (!toArchive.length) return;

		toArchive.forEach((item) => {
			autoArchivedRef.current.add(item.id);
			handleArchive(item.id).catch(() => {
				autoArchivedRef.current.delete(item.id);
			});
		});
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
					<View style={s.cardLeft}>
						<Text style={s.cardNumber}>{item.numero || `DEV-${item.id}`}</Text>
						<Text style={s.cardClient} numberOfLines={1}>{item?.client?.nom || 'Client inconnu'}</Text>
					</View>
					<View style={s.cardActions}>
						<TouchableOpacity activeOpacity={0.8} style={s.actionBtn} onPress={() => handleArchive(item.id)}>
							<MaterialIcons name="archive" size={20} color="white" />
						</TouchableOpacity>
						<TouchableOpacity activeOpacity={0.8} style={s.actionBtn} onPress={() => downloadInvoice(item.id, item.email)}>
    <MaterialIcons name="email" size={20} color="white" />
</TouchableOpacity>
						<TouchableOpacity activeOpacity={0.8} style={s.actionBtn} onPress={() => sendPdfWhatsApp(item.id)}>
							<FontAwesome name="whatsapp" size={20} color="white" />
						</TouchableOpacity>
					</View>
				</View>

				<View style={s.rowBetween}>
					<Text style={s.amount}>{Number(item.total_ttc || 0).toFixed(2)} MAD</Text>
					<Text style={s.status}>{`${status.dot} ${status.label}`}</Text>
				</View>
			</TouchableOpacity>
		);
	};
	const handleNavChange = (page) => {
    console.log("Active page:", page);
	navigation.navigate(page)
    // t9dr tdir logic bach tbdl content
  };
	return (
			<SafeAreaView style={s.safe} edges={['top', 'right', 'bottom', 'left']}>
			<View style={[s.header, { paddingTop: Math.max(insets.top, 10) }]}>
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
				<TouchableOpacity activeOpacity={0.9} style={s.secondaryBtn} onPress={() => navigation.navigate('SmartPaste')}>
					<Text style={s.secondaryBtnTxt}>Smart Paste</Text>
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
					<Text style={s.statValue}>{stats.total.toFixed(0)} DHS</Text>
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
			<Navbar onChange={handleNavChange} current="Dash" />
			
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
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	hello: { color: C.sub, fontSize: 11, fontWeight: '500' },
	name: { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 0 },
	logoutBtn: {
		height: 36,
		paddingHorizontal: 14,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: C.border,
		backgroundColor: C.white,
		justifyContent: 'center',
		...SHADOW,
	},
	logoutTxt: { color: C.text, fontSize: 13, fontWeight: '700' },

	quickActions: {
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 8,
		flexDirection: 'row',
		gap: 10,
	},
	primaryBtn: {
		flex: 1,
		height: 56,
		borderRadius: 16,
		backgroundColor: C.accent,
		justifyContent: 'center',
		alignItems: 'center',
		...SHADOW,
	},
	primaryBtnTxt: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
	secondaryBtn: {
		width: 110,
		height: 56,
		borderRadius: 16,
		backgroundColor: C.white,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1.5,
		borderColor: C.border,
		...SHADOW,
	},
	secondaryBtnTxt: { color: C.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },

	statsRow: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		flexDirection: 'row',
		gap: 10,
		backgroundColor: C.white,
	},
	statCard: {
		flex: 1,
		backgroundColor: C.bg,
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: C.border,
	},
	statLabel: { color: C.sub, fontSize: 12, fontWeight: '600', marginBottom: 6 },
	statValue: { color: C.text, fontSize: 18, fontWeight: '800' },

	list: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, gap: 10 },
	card: {
		backgroundColor: C.white,
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: C.border,
		...SHADOW,
	},
	cardTop: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	cardLeft: { flex: 1, marginRight: 10 },
	cardNumber: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
	cardClient: { color: C.sub, fontSize: 13, fontWeight: '500' },
	cardActions: {
		flexDirection: 'row',
		gap: 6,
		alignItems: 'center',
	},
	actionBtn: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: C.accent,
		justifyContent: 'center',
		alignItems: 'center',
		...SHADOW,
	},
	archiveMini: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: '#EEF0F8',
		justifyContent: 'center',
		alignItems: 'center',
		...SHADOW,
	},
	archiveMiniTxt: { fontSize: 16 },
	button: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: '#25D366',
		justifyContent: 'center',
		alignItems: 'center',
		...SHADOW,
	},
	rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
	amount: { color: C.text, fontSize: 18, fontWeight: '800' },
	status: { color: C.sub, fontSize: 12, fontWeight: '600' },

	emptyCard: {
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 16,
		padding: 32,
		alignItems: 'center',
		marginHorizontal: 16,
		marginTop: 32,
		...SHADOW,
	},
	emptyEmoji: { fontSize: 32, marginBottom: 12 },
	emptyTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
	emptySub: { color: C.sub, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});