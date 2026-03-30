import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	Alert,
	ActivityIndicator,
	ScrollView,
	Image,
	Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Navbar from './Navbar';
import { API_BASE_URL } from './config';
import { COLORS, SHADOW, KEYBOARD_BEHAVIOR } from './utils/platformStyles';

const C = COLORS;

function Parameters({ navigation }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [loggingOut, setLoggingOut] = useState(false);
	const insets = useSafeAreaInsets();

	const getAuthHeaders = async () => {
		const token = await AsyncStorage.getItem('token');
		if (!token) {
			navigation.replace('Login');
			throw new Error('NO_TOKEN');
		}
		return { Authorization: `Bearer ${token}` };
	};

	const loadProfile = async () => {
		setLoading(true);
		try {
			const headers = await getAuthHeaders();
			const response = await axios.get(`${API_BASE_URL}/me`, { headers });
			setUser(response.data || null);
		} catch (error) {
			if (error?.response?.status === 401) {
				navigation.replace('Login');
				return;
			}
			if (error?.message === 'NO_TOKEN') return;
			Alert.alert('Erreur', 'Impossible de charger le profil.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadProfile();
	}, []);

	const handleLogout = () => {
		Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
			{ text: 'Annuler', style: 'cancel' },
			{
				text: 'Oui',
				style: 'destructive',
				onPress: async () => {
					if (loggingOut) return;
					setLoggingOut(true);
					try {
						const token = await AsyncStorage.getItem('token');
						if (token) {
							await axios.post(
								`${API_BASE_URL}/logout`,
								{},
								{ headers: { Authorization: `Bearer ${token}` } }
							);
						}
					} catch {
						// Cleanup local session even if API logout fails
					} finally {
						await AsyncStorage.multiRemove(['token', 'user']);
						navigation.replace('Login');
						setLoggingOut(false);
					}
				},
			},
		]);
	};

	const handleNavChange = (page) => {
		navigation.navigate(page);
	};

	return (
		<SafeAreaView style={s.safe} edges={['top', 'right', 'bottom', 'left']}>
			<View style={[s.header, { paddingTop: Math.max(insets.top, 8) }]}>
				<TouchableOpacity style={s.backBtn} onPress={() => navigation.replace('Dash')}>
					<Text style={s.backTxt}>← Retour</Text>
				</TouchableOpacity>
				<Text style={s.title}>Paramètres</Text>
			</View>

			{loading ? (
				<View style={s.center}><ActivityIndicator color={C.accent} /></View>
			) : (
				<ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
					<View style={s.card}>
						<View style={s.logoWrap}>
							<Image source={require('./assets/logo.jpg')} style={s.logo} resizeMode="contain" />
						</View>
						<Text style={s.cardTitle}>Compte</Text>
						<Text style={s.label}>Nom</Text>
						<Text style={s.value}>{user?.name || '-'}</Text>
						<Text style={[s.label, { marginTop: 10 }]}>Email</Text>
						<Text style={s.value}>{user?.email || '-'}</Text>
                        <Text style={[s.label]}>Societe</Text>
                        <Text style={[s.value]}>Equipement Chefchouani</Text>
					</View>

					<View style={s.card}>
						<Text style={s.cardTitle}>API</Text>
						<Text style={s.label}>Base URL</Text>
						<Text style={s.value}>{API_BASE_URL}</Text>
					</View>

					<TouchableOpacity activeOpacity={0.9} style={s.primaryBtn} onPress={loadProfile}>
						<Text style={s.primaryBtnTxt}>Rafraîchir le profil</Text>
					</TouchableOpacity>

					<TouchableOpacity
						activeOpacity={0.9}
						style={[s.dangerBtn, loggingOut && { opacity: 0.7 }]}
						onPress={handleLogout}
						disabled={loggingOut}
					>
						{loggingOut ? <ActivityIndicator color={C.white} /> : <Text style={s.dangerBtnTxt}>Se déconnecter</Text>}
					</TouchableOpacity>
				</ScrollView>
			)}

			<Navbar onChange={handleNavChange} current="Parameters" />
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
	content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, gap: 10 },
	card: {
		backgroundColor: C.white,
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: C.border,
		...SHADOW,
	},
	cardTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 10 },
	logoWrap: {
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},
	logo: {
		width: 200,
		height: 150,
	},
	label: { color: C.sub, fontSize: 12, fontWeight: '500', marginBottom: 4 },
	value: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 10 },
	primaryBtn: {
		height: 48,
		borderRadius: 12,
		backgroundColor: C.accent,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 6,
		...SHADOW,
	},
	primaryBtnTxt: { color: C.white, fontSize: 14, fontWeight: '800' },
	dangerBtn: {
		height: 48,
		borderRadius: 12,
		backgroundColor: C.danger,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 8,
		...SHADOW,
	},
	dangerBtnTxt: { color: C.white, fontSize: 14, fontWeight: '800' },
});

export default Parameters;