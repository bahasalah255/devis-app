import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { COLORS, SHADOW_LG } from './utils/platformStyles';

const domains = [
  'Construction / BTP',
  'Commerce',
  'Services',
  'Transport / Logistics',
  'Restaurant / Café',
  'Electronics',
  'Furniture',
  'Plumbing',
  'Electricity',
  'Painting',
  'Carpentry',
  'Agriculture',
  'Other',
];

const tvaOptions = ['No TVA', '7%', '10%', '14%', '20%'];

export default function CompanySetup({ navigation }) {
  const [companyName, setCompanyName] = useState('');
  const [domain, setDomain] = useState(domains[0]);
  const [tvaType, setTvaType] = useState(tvaOptions[0]);
  const [loading, setLoading] = useState(false);
  const [logoUri, setLogoUri] = useState(null);

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      Alert.alert('Champs requis', 'Veuillez saisir le nom de la société.');
      return;
    }
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      formData.append('company_name', companyName.trim());
      formData.append('domain', domain);
      formData.append('tva_type', tvaType);
      if (logoUri) {
        const uriParts = logoUri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        formData.append('logo', {
          uri: logoUri,
          name: `logo.${fileType}`,
          type: `image/${fileType}`,
        });
      }

      const response = await axios.post(`${API_BASE_URL}/company`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      // optionally store company locally
      await AsyncStorage.setItem('company', JSON.stringify(response.data));
      navigation.replace('Dash');
    } catch (err) {
      if (err?.response?.status === 409) {
        Alert.alert('Erreur', 'Une société existe déjà pour cet utilisateur.');
        navigation.replace('Dash');
      } else if (err?.response) {
        Alert.alert('Erreur', `Échec (HTTP ${err.response.status}).`);
      } else {
        Alert.alert('Erreur', 'Impossible de contacter le serveur.');
      }
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès aux photos pour télécharger un logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.cancelled) {
      setLogoUri(result.assets ? result.assets[0].uri : result.uri);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.title}>Configuration de l'entreprise</Text>

        <View style={s.card}>
          <Text style={s.label}>Nom de l'entreprise</Text>
          <TextInput
            style={s.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Mon Entreprise SARL"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={s.label}>Domaine</Text>
          <View style={s.pickerWrap}>
            <Picker selectedValue={domain} onValueChange={(v) => setDomain(v)}>
              {domains.map((d) => (
                <Picker.Item key={d} label={d} value={d} />
              ))}
            </Picker>
          </View>

          <Text style={s.label}>TVA</Text>
          <View style={s.pickerWrap}>
            <Picker selectedValue={tvaType} onValueChange={(v) => setTvaType(v)}>
              {tvaOptions.map((t) => (
                <Picker.Item key={t} label={t} value={t} />
              ))}
            </Picker>
          </View>

          <Text style={s.label}>Logo</Text>
          <TouchableOpacity style={s.logoBtn} onPress={pickImage}>
            <Text style={s.logoBtnTxt}>{logoUri ? 'Changer le logo' : 'Choisir un logo'}</Text>
          </TouchableOpacity>
          {logoUri ? (
            <View style={s.logoPreviewWrap}>
              <Image source={{ uri: logoUri }} style={s.logoPreview} />
            </View>
          ) : null}

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitTxt}>Enregistrer</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
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
  pickerWrap: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden' },
  submitBtn: {
    marginTop: 18,
    backgroundColor: '#4F46E5',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitTxt: { color: '#fff', fontWeight: '800' },
  logoBtn: {
    marginTop: 10,
    backgroundColor: '#E5E7EB',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBtnTxt: { color: '#374151', fontWeight: '700' },
  logoPreviewWrap: { marginTop: 10, alignItems: 'center' },
  logoPreview: { width: 120, height: 120, borderRadius: 8 },
});
