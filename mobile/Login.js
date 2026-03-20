import React, { useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	Alert,
	SafeAreaView,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

const C = {
	bg:      '#F2F2F7',
	white:   '#FFFFFF',
	border:  '#E5E5EA',
	text:    '#000000',
	sub:     '#8E8E93',
	accent:  '#4F46E5',
	danger:  '#FF3B30',
};

export default function Login({ navigation }) {
	const [email, setEmail]       = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading]   = useState(false);
	const [showPass, setShowPass] = useState(false);

	const handleLogin = async () => {
		if (!email.trim() || !password) {
			Alert.alert('Champs requis', 'Email et mot de passe obligatoires.');
			return;
		}
		setLoading(true);
		try {
			const res = await axios.post(`${API_BASE_URL}/login`, {
				email: email.trim().toLowerCase(),
				password,
			});
			await AsyncStorage.setItem('token', res.data.token);
			await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
			navigation.replace('Dash');
		} catch (e) {
			Alert.alert('Erreur', 'Email ou mot de passe incorrect.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={s.safe}>
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
				<ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

					<View style={s.top}>
						<Text style={s.appName}>Devis App</Text>
						<Text style={s.appSub}>Connectez-vous pour continuer</Text>
					</View>

					<View style={s.group}>
						<View style={s.row}>
							<TextInput
								style={s.input}
								placeholder="Email"
								placeholderTextColor={C.sub}
								keyboardType="email-address"
								autoCapitalize="none"
								autoCorrect={false}
								value={email}
								onChangeText={setEmail}
							/>
						</View>
						<View style={s.separator} />
						<View style={[s.row, { paddingRight: 0 }]}>
							<TextInput
								style={[s.input, { flex: 1 }]}
								placeholder="Mot de passe"
								placeholderTextColor={C.sub}
								secureTextEntry={!showPass}
								value={password}
								onChangeText={setPassword}
								onSubmitEditing={handleLogin}
								returnKeyType="go"
							/>
							<TouchableOpacity style={s.showBtn} onPress={() => setShowPass(p => !p)}>
								<Text style={s.showBtnText}>{showPass ? 'Cacher' : 'Voir'}</Text>
							</TouchableOpacity>
						</View>
					</View>

					<TouchableOpacity
						style={[s.btn, loading && { opacity: 0.6 }]}
						onPress={handleLogin}
						disabled={loading}
						activeOpacity={0.8}
					>
						{loading
							? <ActivityIndicator color="#fff" />
							: <Text style={s.btnText}>Se connecter</Text>
						}
					</TouchableOpacity>

					<Text style={s.footer}>Equipement Chefchaouni</Text>

				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	safe:    { flex: 1, backgroundColor: C.bg },
	scroll:  { flexGrow: 1, padding: 20, justifyContent: 'center' },

	top: { marginBottom: 36 },
	appName: { fontSize: 30, fontWeight: '700', color: C.text, letterSpacing: -0.5 },
	appSub:  { fontSize: 15, color: C.sub, marginTop: 4 },

	group: {
		backgroundColor: C.white,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: C.border,
		marginBottom: 12,
		overflow: 'hidden',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
	},
	separator: { height: 1, backgroundColor: C.border, marginLeft: 14 },
	input: {
		flex: 1,
		paddingVertical: 14,
		fontSize: 16,
		color: C.text,
	},
	showBtn: { paddingHorizontal: 14, paddingVertical: 14 },
	showBtnText: { fontSize: 14, color: C.accent, fontWeight: '600' },

	btn: {
		backgroundColor: C.accent,
		borderRadius: 12,
		paddingVertical: 15,
		alignItems: 'center',
		marginBottom: 24,
	},
	btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

	footer: { textAlign: 'center', color: C.sub, fontSize: 13 },
});