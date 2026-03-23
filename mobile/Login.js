import React, { useState } from 'react';
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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function Login({ navigation }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	const handleLogin = async () => {
		if (!email.trim() || !password.trim()) {
			Alert.alert('Champs requis', 'Veuillez saisir email et mot de passe.');
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
		} catch {
			Alert.alert('Connexion échouée', 'Email ou mot de passe incorrect.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<SafeAreaView style={s.safe}>
			<KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<View style={s.container}>
					<Text style={s.logo}>🧾 Devis App</Text>
					<Text style={s.subtitle}>Connectez-vous pour gérer vos devis rapidement.</Text>

					<View style={s.card}>
						<Text style={s.label}>Email</Text>
						<TextInput
							style={s.input}
							value={email}
							onChangeText={setEmail}
							placeholder="exemple@email.com"
							placeholderTextColor={C.sub}
							autoCapitalize="none"
							keyboardType="email-address"
						/>

						<Text style={[s.label, { marginTop: 12 }]}>Mot de passe</Text>
						<TextInput
							style={s.input}
							value={password}
							onChangeText={setPassword}
							placeholder="••••••••"
							placeholderTextColor={C.sub}
							secureTextEntry
							onSubmitEditing={handleLogin}
						/>
					</View>

					<TouchableOpacity
						activeOpacity={0.9}
						style={[s.mainBtn, loading && { opacity: 0.7 }]}
						onPress={handleLogin}
						disabled={loading}
					>
						{loading ? <ActivityIndicator color="#fff" /> : <Text style={s.mainBtnTxt}>Se connecter</Text>}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const s = StyleSheet.create({
	flex: { flex: 1 },
	safe: { flex: 1, backgroundColor: C.bg },
	container: { flex: 1, padding: 16, justifyContent: 'center' },
	logo: { fontSize: 30, fontWeight: '800', color: C.text, marginBottom: 6 },
	subtitle: { fontSize: 14, color: C.sub, marginBottom: 18 },
	card: {
		backgroundColor: C.white,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: C.border,
		padding: 14,
		...SHADOW,
	},
	label: { fontSize: 13, color: C.sub, marginBottom: 6 },
	input: {
		height: 48,
		borderWidth: 1,
		borderColor: C.border,
		borderRadius: 12,
		paddingHorizontal: 12,
		fontSize: 16,
		color: C.text,
		backgroundColor: '#FAFAFB',
	},
	mainBtn: {
		height: 52,
		borderRadius: 14,
		backgroundColor: C.accent,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 14,
		...SHADOW,
	},
	mainBtnTxt: { color: C.white, fontSize: 16, fontWeight: '800' },
});
