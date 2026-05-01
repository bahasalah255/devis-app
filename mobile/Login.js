import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	SafeAreaView,
	KeyboardAvoidingView,
	Platform,
	ActivityIndicator,
	Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { COLORS, SHADOW, SHADOW_LG } from './utils/platformStyles';

const C = COLORS;

export default function Login({ navigation }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [checkingSession, setCheckingSession] = useState(true);

	useEffect(() => {
		let isMounted = true;
		const autoLogin = async () => {
			try {
				const token = await AsyncStorage.getItem('token');
				if (!token) return;
				const response = await axios.get(`${API_BASE_URL}/me`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				const user = response?.data;
				if (user) {
					await AsyncStorage.setItem('user', JSON.stringify(user));
					if (isMounted) navigation.replace('Dash');
				}
			} catch {
				await AsyncStorage.multiRemove(['token', 'user']);
			} finally {
				if (isMounted) setCheckingSession(false);
			}
		};
		autoLogin();
		return () => { isMounted = false; };
	}, [navigation]);

	const handleLogin = async () => {
		if (!email.trim() || !password.trim()) {
			Alert.alert('Champs requis', 'Veuillez saisir votre email et mot de passe.');
			return;
		}
		setLoading(true);
		try {
			const response = await axios.post(`${API_BASE_URL}/login`, {
				email: email.trim().toLowerCase(),
				password,
			});
			await AsyncStorage.setItem('token', response.data.token);
			await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
			navigation.replace('Dash');
		} catch (error) {
			if (!error?.response) {
				Alert.alert('Connexion impossible', 'Vérifiez votre connexion internet et réessayez.');
			} else if (error.response.status === 422 || error.response.status === 401) {
				Alert.alert('Identifiants incorrects', 'Email ou mot de passe invalide.');
			} else {
				Alert.alert('Erreur', `Échec de connexion (HTTP ${error.response.status}).`);
			}
		} finally {
			setLoading(false);
		}
	};

	if (checkingSession) {
		return (
			<SafeAreaView style={s.safe}>
				<View style={s.sessionLoader}>
					<View style={s.loaderLogo}>
						<Ionicons name="document-text" size={32} color={C.accent} />
					</View>
					<ActivityIndicator color={C.accent} style={{ marginTop: 20 }} />
					<Text style={s.sessionLoaderTxt}>Vérification de la session…</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={s.safe}>
			<KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<View style={s.container}>
					<View style={s.brandWrap}>
						<View style={s.brandIcon}>
							<Ionicons name="document-text" size={36} color={C.white} />
						</View>
						<Text style={s.brandTitle}>Devis Pro</Text>
						<Text style={s.brandSub}>Créez vos devis en quelques secondes</Text>
					</View>

					<View style={s.card}>
						<Text style={s.cardTitle}>Connexion</Text>

						<View style={s.fieldWrap}>
							<Text style={s.fieldLabel}>Email</Text>
							<View style={s.inputRow}>
								<Ionicons name="mail-outline" size={18} color={C.sub} style={s.inputIcon} />
								<TextInput
									style={s.inputField}
									value={email}
									onChangeText={setEmail}
									placeholder="votre@email.com"
									placeholderTextColor={C.sub}
									autoCapitalize="none"
									keyboardType="email-address"
									returnKeyType="next"
								/>
							</View>
						</View>

						<View style={s.fieldWrap}>
							<Text style={s.fieldLabel}>Mot de passe</Text>
							<View style={s.inputRow}>
								<Ionicons name="lock-closed-outline" size={18} color={C.sub} style={s.inputIcon} />
								<TextInput
									style={s.inputField}
									value={password}
									onChangeText={setPassword}
									placeholder="••••••••"
									placeholderTextColor={C.sub}
									secureTextEntry={!showPassword}
									returnKeyType="done"
									onSubmitEditing={handleLogin}
								/>
								<TouchableOpacity onPress={() => setShowPassword((p) => !p)} style={s.eyeBtn}>
									<Ionicons
										name={showPassword ? 'eye-off-outline' : 'eye-outline'}
										size={18}
										color={C.sub}
									/>
								</TouchableOpacity>
							</View>
						</View>
					</View>

					<TouchableOpacity
						activeOpacity={0.9}
						style={[s.mainBtn, loading && { opacity: 0.75 }]}
						onPress={handleLogin}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color="#fff" />
						) : (
							<>
								<Text style={s.mainBtnTxt}>Se connecter</Text>
								<Ionicons name="arrow-forward" size={18} color={C.white} />
							</>
						)}
					</TouchableOpacity>

					<Text style={s.hint}>
						Vos données sont sécurisées et chiffrées.
					</Text>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	flex: { flex: 1 },
	safe: { flex: 1, backgroundColor: C.bg },

	sessionLoader: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loaderLogo: {
		width: 80,
		height: 80,
		borderRadius: 24,
		backgroundColor: C.accent,
		alignItems: 'center',
		justifyContent: 'center',
		...SHADOW,
	},
	sessionLoaderTxt: { color: C.sub, fontSize: 14, fontWeight: '500', marginTop: 12 },

	container: {
		flex: 1,
		paddingHorizontal: 20,
		justifyContent: 'center',
	},

	brandWrap: { alignItems: 'center', marginBottom: 36 },
	brandIcon: {
		width: 80,
		height: 80,
		borderRadius: 24,
		backgroundColor: C.accent,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
		...SHADOW_LG,
	},
	brandTitle: { color: C.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
	brandSub: { color: C.sub, fontSize: 14, fontWeight: '500', marginTop: 4 },

	card: {
		backgroundColor: C.white,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: C.border,
		padding: 20,
		gap: 16,
		...SHADOW,
	},
	cardTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },

	fieldWrap: { gap: 8 },
	fieldLabel: { color: C.textMid, fontSize: 13, fontWeight: '600' },
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 50,
		borderWidth: 1.5,
		borderColor: C.border,
		borderRadius: 14,
		backgroundColor: C.bg,
		paddingHorizontal: 14,
		gap: 10,
	},
	inputIcon: {},
	inputField: { flex: 1, fontSize: 15, color: C.text },
	eyeBtn: { padding: 4 },

	mainBtn: {
		height: 56,
		borderRadius: 16,
		backgroundColor: C.accent,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
		marginTop: 20,
		...SHADOW_LG,
	},
	mainBtnTxt: { color: C.white, fontSize: 17, fontWeight: '800' },

	hint: {
		color: C.sub,
		fontSize: 12,
		textAlign: 'center',
		marginTop: 16,
	},
});
