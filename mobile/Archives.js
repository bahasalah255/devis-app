import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Alert, ActivityIndicator, SafeAreaView,
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

function Archive({ navigation }) {
  const [devis, setDevis]       = useState([]);  
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {  // ✅ async ()
    try {
      const [raw, token] = await Promise.allSettled([  
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token'),
      ]);

      if (raw.value) setUser(JSON.parse(raw.value));  
      if (!token.value) { navigation.replace('Login'); return; }  

      const res = await axios.get(`${API_BASE_URL}/index_archive`, {  
        headers: { Authorization: `Bearer ${token.value}` },
      });

      setDevis(res.data);
    } catch (error) {
      if (error?.response?.status === 401) { navigation.replace('Login'); return; }
      Alert.alert('Erreur', 'Impossible de charger les devis.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const renderItem = ({ item }) => (
    <View>
      <Text>{item.numero}</Text>
    </View>
  );

  return (
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
          <Text style={s.listTitle}>Mes devis archivés</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Aucun devis archivé</Text>
        </View>
      }
    />
  );
}

export default Archive;

const s = StyleSheet.create({
  list: { padding: 16 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 15, color: C.sub },
});