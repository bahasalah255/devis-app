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
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from './config';
import { COLORS, STATUS, SHADOW, SHADOW_SM, SHADOW_LG, SPACING, RADIUS } from './utils/platformStyles';

const C = COLORS;

function StatusBadge({ statut }) {
	const meta = STATUS[statut] || STATUS.brouillon;
	return (
		<View style={[badge.wrap, { backgroundColor: meta.bg }]}>
			<View style={[badge.dot, { backgroundColor: meta.dot }]} />
			<Text style={[badge.label, { color: meta.text }]}>{meta.label}</Text>
		</View>
	);
}

const badge = StyleSheet.create({
	wrap: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: RADIUS.full,
		gap: 5,
	},
	dot: { width: 6, height: 6, borderRadius: 3 },
	label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
});

function StatCard({ icon, label, value, color }) {
	return (
		<View style={s.statCard}>
			<View style={[s.statIcon, { backgroundColor: color + '18' }]}>
				<Ionicons name={icon} size={18} color={color} />
			</View>
			<Text style={s.statLabel}>{label}</Text>
			<Text style={[s.statValue, { color }]}>{value}</Text>
		</View>
	);
}

export default function Dash({ navigation }) {
	const [user, setUser] = useState(null);
	const [devis, setDevis] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [sharingPdfId, setSharingPdfId] = useState(null);
	const autoArchivedRef = useRef(new Set());
	const shareLockRef = useRef(false);
	const insets = useSafeAreaInsets();

	const load = async (refresh = false) => {
		refresh ? setRefreshing(true) : setLoading(true);
		try {
			const [rawUser, token] = await Promise.all([
				AsyncStorage.getItem('user'),
				AsyncStorage.getItem('token'),
			]);
			if (!token) { navigation.replace('Login'); return; }
			if (rawUser) setUser(JSON.parse(rawUser));

			const response = await axios.get(`${API_BASE_URL}/devis`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setDevis(Array.isArray(response.data) ? response.data : []);
		} catch (error) {
			if (error?.response?.status === 401) { navigation.replace('Login'); return; }
			Alert.alert('Erreur', 'Impossible de charger les devis.');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => { load(); }, []);

	const handleLogout = () => {
		Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
			{ text: 'Annuler', style: 'cancel' },
			{
				text: 'Déconnecter',
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
		if (!token) { navigation.replace('Login'); throw new Error('NO_TOKEN'); }
		return { Authorization: `Bearer ${token}`, Accept: 'application/pdf' };
	};

	const downloadInvoice = async (devis_id, email) => {
		const confirmed = await new Promise((resolve) => {
			Alert.alert(
				'Envoyer par email',
				email ? `Envoyer à ${email} ?` : 'Envoyer ce devis par email ?',
				[
					{ text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
					{ text: 'Envoyer', onPress: () => resolve(true) },
				]
			);
		});
		if (!confirmed) return;

		try {
			const token = await AsyncStorage.getItem('token');
			if (!token) { navigation.replace('Login'); return; }
			const payload = email ? { email } : {};
			const response = await axios.post(
				`${API_BASE_URL}/devis/${devis_id}/send-email`,
				payload,
				{ headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
			);
			const sentTo = response?.data?.email || email;
			Alert.alert('Envoyé', sentTo ? `Devis envoyé à ${sentTo}.` : 'Devis envoyé.');
			if (sentTo) {
				await axios.patch(
					`${API_BASE_URL}/devis/${devis_id}/statut`,
					{ statut: 'envoye' },
					{ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
				);
				load();
			}
		} catch (error) {
			if (error?.response?.status === 401) { navigation.replace('Login'); return; }
			const details = error?.response?.data?.message || error?.message || 'Envoi impossible.';
			Alert.alert('Erreur', details);
		}
	};

	const sendPdfWhatsApp = async (id) => {
		if (shareLockRef.current) return;
		shareLockRef.current = true;
		setSharingPdfId(id);
		try {
			const headers = await getPdfRequestHeaders();
			const localUri = FileSystem.documentDirectory + `facture-${id}.pdf`;
			const downloadResult = await FileSystem.downloadAsync(
				`${API_BASE_URL}/devis/${id}/pdf`,
				localUri,
				{ headers }
			);
			if (downloadResult.status !== 200) {
				if (downloadResult.status === 401) { navigation.replace('Login'); return; }
				throw new Error(`HTTP_${downloadResult.status}`);
			}
			const isAvailable = await Sharing.isAvailableAsync();
			if (!isAvailable) { Alert.alert('Erreur', 'Partage non disponible.'); return; }
			await Sharing.shareAsync(downloadResult.uri, {
				mimeType: 'application/pdf',
				dialogTitle: `Devis ${id}`,
				UTI: 'com.adobe.pdf',
			});
			if (isAvailable) {
				try {
					const token = await AsyncStorage.getItem('token');
					await axios.patch(
						`${API_BASE_URL}/devis/${id}/statut`,
						{ statut: 'envoye' },
						{ headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
					);
					load();
				} catch { /* silent */ }
			}
		} catch (error) {
			if (error?.response?.status === 401) { navigation.replace('Login'); return; }
			if (error?.message === 'NO_TOKEN') return;
			Alert.alert('Erreur', 'Impossible de partager le PDF.');
		} finally {
			shareLockRef.current = false;
			setSharingPdfId(null);
		}
	};

	const handleArchive = async (id) => {
		try {
			const token = await AsyncStorage.getItem('token');
			await axios.patch(`${API_BASE_URL}/Archive/${id}`, {}, {
				headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
			});
			load(true);
		} catch {
			Alert.alert('Erreur', 'Archive impossible.');
		}
	};

	const stats = useMemo(() => {
		const accepted = devis.filter((d) => d.statut === 'accepte').length;
		const pending = devis.filter((d) => d.statut === 'brouillon' || d.statut === 'envoye').length;
		const total = devis.reduce((sum, d) => sum + Number(d.total_ttc || 0), 0);
		return { accepted, pending, total };
	}, [devis]);

	useEffect(() => {
		const now = Date.now();
		const toArchive = devis.filter((item) => {
			if (!item?.id || !item?.created_at) return false;
			if (autoArchivedRef.current.has(item.id)) return false;
			const itemDate = item.restored_at
				? new Date(String(item.restored_at).replace(' ', 'T'))
				: new Date(String(item.created_at).replace(' ', 'T'));
			if (Number.isNaN(itemDate.getTime())) return false;
			return (now - itemDate.getTime()) / (1000 * 60 * 60 * 24) > 2;
		});
		if (!toArchive.length) return;
		toArchive.forEach((item) => {
			autoArchivedRef.current.add(item.id);
			handleArchive(item.id).catch(() => autoArchivedRef.current.delete(item.id));
		});
	}, [devis]);

	const userInitial = (user?.name || 'U').charAt(0).toUpperCase();

	const handleNavChange = (page) => {
		navigation.navigate(page);
	};

	const renderItem = ({ item }) => (
		<TouchableOpacity
			activeOpacity={0.92}
			style={s.card}
			onPress={() => navigation.navigate('UpdateDevis', { devis: item })}
		>
			<View style={s.cardHeader}>
				<StatusBadge statut={item.statut} />
				<Text style={s.cardNumber}>{item.numero || `DEV-${item.id}`}</Text>
			</View>

			<Text style={s.cardClient} numberOfLines={1}>
				{item?.client?.nom || 'Client inconnu'}
			</Text>

			<View style={s.cardDivider} />

			<View style={s.cardFooter}>
				<Text style={s.amount}>{Number(item.total_ttc || 0).toFixed(2)} MAD</Text>
				<View style={s.cardActions}>
					<TouchableOpacity
						activeOpacity={0.8}
						style={s.actionBtnNeutral}
						onPress={() => handleArchive(item.id)}
					>
						<Ionicons name="archive-outline" size={17} color={C.textMid} />
					</TouchableOpacity>
					<TouchableOpacity
						activeOpacity={0.8}
						style={s.actionBtnBlue}
						onPress={() => downloadInvoice(item.id, item.email)}
					>
						<Ionicons name="mail-outline" size={17} color={C.accent} />
					</TouchableOpacity>
					<TouchableOpacity
						activeOpacity={0.8}
						style={[s.actionBtnGreen, sharingPdfId === item.id && { opacity: 0.6 }]}
						onPress={() => sendPdfWhatsApp(item.id)}
						disabled={sharingPdfId !== null}
					>
						{sharingPdfId === item.id ? (
							<ActivityIndicator size="small" color={C.whatsapp} />
						) : (
							<FontAwesome name="whatsapp" size={17} color={C.whatsapp} />
						)}
					</TouchableOpacity>
				</View>
			</View>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={s.safe} edges={['top', 'right', 'bottom', 'left']}>
			<View style={[s.header, { paddingTop: Math.max(insets.top, 8) }]}>
				<View style={s.headerLeft}>
					<View style={s.avatar}>
						<Text style={s.avatarTxt}>{userInitial}</Text>
					</View>
					<View>
						<Text style={s.hello}>Bonjour,</Text>
						<Text style={s.name} numberOfLines={1}>{user?.name || 'Utilisateur'}</Text>
					</View>
				</View>
				<View style={s.headerRight}>
					<TouchableOpacity
						activeOpacity={0.8}
						style={s.archiveBtn}
						onPress={() => navigation.replace('Archive')}
					>
						<Ionicons name="archive-outline" size={18} color={C.textMid} />
					</TouchableOpacity>
					<TouchableOpacity
						activeOpacity={0.8}
						style={s.logoutBtn}
						onPress={handleLogout}
					>
						<Ionicons name="log-out-outline" size={18} color={C.danger} />
					</TouchableOpacity>
				</View>
			</View>

			<View style={s.statsRow}>
				<StatCard
					icon="document-text-outline"
					label="En cours"
					value={stats.pending}
					color={C.accent}
				/>
				<StatCard
					icon="checkmark-circle-outline"
					label="Acceptés"
					value={stats.accepted}
					color={C.success}
				/>
				<StatCard
					icon="cash-outline"
					label="Total TTC"
					value={`${(stats.total / 1000).toFixed(1)}k`}
					color={C.warning}
				/>
			</View>

			<View style={s.listHeader}>
				<Text style={s.listTitle}>Devis actifs</Text>
				<TouchableOpacity
					activeOpacity={0.8}
					style={s.smartPasteBtn}
					onPress={() => navigation.navigate('SmartPaste')}
				>
					<Ionicons name="scan-outline" size={14} color={C.accent} />
					<Text style={s.smartPasteTxt}>Smart Paste</Text>
				</TouchableOpacity>
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
					showsVerticalScrollIndicator={false}
					refreshing={refreshing}
					onRefresh={() => load(true)}
					ListEmptyComponent={
						<View style={s.emptyCard}>
							<Text style={s.emptyEmoji}>🧾</Text>
							<Text style={s.emptyTitle}>Aucun devis</Text>
							<Text style={s.emptySub}>
								Appuyez sur le bouton{' '}
								<Text style={{ color: C.accent, fontWeight: '700' }}>+</Text>
								{' '}pour créer votre premier devis.
							</Text>
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
	center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
	loadingTxt: { color: C.sub, fontSize: 14, fontWeight: '500' },

	header: {
		paddingHorizontal: 16,
		paddingBottom: 14,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

	avatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: C.accentLight,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: C.accentMid,
	},
	avatarTxt: { color: C.accent, fontSize: 18, fontWeight: '800' },

	hello: { color: C.sub, fontSize: 12, fontWeight: '500' },
	name: { color: C.text, fontSize: 17, fontWeight: '800', maxWidth: 160 },

	archiveBtn: {
		width: 38,
		height: 38,
		borderRadius: 12,
		backgroundColor: C.bg,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 1,
		borderColor: C.border,
	},
	logoutBtn: {
		width: 38,
		height: 38,
		borderRadius: 12,
		backgroundColor: C.dangerLight,
		alignItems: 'center',
		justifyContent: 'center',
	},

	statsRow: {
		flexDirection: 'row',
		paddingHorizontal: 14,
		paddingVertical: 14,
		gap: 10,
		backgroundColor: C.white,
		borderBottomWidth: 1,
		borderBottomColor: C.border,
	},
	statCard: {
		flex: 1,
		backgroundColor: C.bg,
		borderRadius: 14,
		padding: 12,
		alignItems: 'flex-start',
		borderWidth: 1,
		borderColor: C.border,
	},
	statIcon: {
		width: 32,
		height: 32,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	statLabel: { color: C.sub, fontSize: 11, fontWeight: '600', marginBottom: 2 },
	statValue: { fontSize: 20, fontWeight: '800' },

	listHeader: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	listTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
	smartPasteBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 10,
		backgroundColor: C.accentLight,
	},
	smartPasteTxt: { color: C.accent, fontSize: 12, fontWeight: '700' },

	list: { paddingHorizontal: 14, paddingBottom: 32, gap: 10 },

	card: {
		backgroundColor: C.white,
		borderRadius: 18,
		padding: 16,
		borderWidth: 1,
		borderColor: C.border,
		...SHADOW,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10,
	},
	cardNumber: { color: C.sub, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
	cardClient: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 12 },
	cardDivider: { height: 1, backgroundColor: C.border, marginBottom: 12 },
	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	amount: { color: C.text, fontSize: 20, fontWeight: '800' },
	cardActions: { flexDirection: 'row', gap: 8 },

	actionBtnNeutral: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: C.bg,
		borderWidth: 1,
		borderColor: C.border,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionBtnBlue: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: C.accentLight,
		alignItems: 'center',
		justifyContent: 'center',
	},
	actionBtnGreen: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: C.whatsappLight,
		alignItems: 'center',
		justifyContent: 'center',
	},

	emptyCard: {
		backgroundColor: C.white,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 20,
		padding: 36,
		alignItems: 'center',
		marginTop: 16,
		...SHADOW,
	},
	emptyEmoji: { fontSize: 40, marginBottom: 14 },
	emptyTitle: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
	emptySub: { color: C.sub, fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
