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
import { COLORS, SHADOW_LG } from './utils/platformStyles';

const C = COLORS;

export default function Register({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/register`, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: passwordConfirm,
      });

      const token = res.data.token;
      const user = res.data.user;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      // If backend returned company in response, use it. Otherwise fetch it.
      const returnedCompany = res.data.company;
      if (typeof returnedCompany !== 'undefined') {
        if (returnedCompany) navigation.replace('Dash');
        else navigation.replace('CompanySetup');
      } else {
        try {
          const companyRes = await axios.get(`${API_BASE_URL}/company`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (companyRes?.data) navigation.replace('Dash');
          else navigation.replace('CompanySetup');
        } catch (e) {
          navigation.replace('CompanySetup');
        }
      }
    } catch (err) {
      if (err?.response?.data) {
        const data = err.response.data;
        if (data.errors) {
          const first = Object.values(data.errors)[0][0];
          Alert.alert('Erreur', first);
        } else if (data.message) {
          Alert.alert('Erreur', data.message);
        } else {
          Alert.alert('Erreur', 'Échec de l’inscription.');
        }
      } else {
        Alert.alert('Erreur', 'Impossible de contacter le serveur.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.container}>
          <Text style={s.title}>Créer un compte</Text>

          <View style={s.card}>
            <Text style={s.label}>Nom</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Jean Dupont" />

            <Text style={s.label}>Email</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

            <Text style={s.label}>Mot de passe</Text>
            <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />

            <Text style={s.label}>Confirmer le mot de passe</Text>
            <TextInput style={s.input} value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />

            <TouchableOpacity style={s.submitBtn} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>S'inscrire</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.replace('Login')} style={s.linkWrap}>
            <Text style={s.linkTxt}>J'ai déjà un compte — Connexion</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: C.bg || '#F3F4F6' },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, ...SHADOW_LG },
  label: { color: '#374151', fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#111827',
  },
  submitBtn: { marginTop: 18, backgroundColor: '#4F46E5', height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { color: '#fff', fontWeight: '800' },
  linkWrap: { marginTop: 12, alignItems: 'center' },
  linkTxt: { color: '#6B7280' },
});
