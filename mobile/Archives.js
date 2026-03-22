import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Alert, ActivityIndicator, SafeAreaView,
  Button,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons , MaterialIcons} from '@expo/vector-icons';
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

  const load = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const [raw, token] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token'),
      ]);

      if (raw) setUser(JSON.parse(raw));
      if (!token) { navigation.replace('Login'); return; }

      const res = await axios.get(`${API_BASE_URL}/index_archive`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDevis(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      if (error?.response?.status === 401) { navigation.replace('Login'); return; }
      Alert.alert('Erreur', 'Impossible de charger les devis.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDate = (value) => {
    if (!value) return 'Date non definie';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date non definie';
    return date.toLocaleDateString('fr-FR');
  };
  const Unarchive = (id) => {
   Alert.alert('UnArchive','Confirmer ?',[
               {text : 'Annuler', style : 'cancel'},
               {
                   text : 'Archiver' , style : 'destructive',
                   onPress : async() => {
                       try {
                           const token = await AsyncStorage.getItem('token');
                           const reponse = await axios.patch(`${API_BASE_URL}/Unarchive/${id}`,{},
                               {
                                   headers: {
                                   Authorization: `Bearer ${token}`,
                                   Accept: 'application/json',
                               }
                               }
                           );
                           console.log('unarchived')
                           load()
   
                       } catch(error) {
                           console.error('Error:', error.response?.data);
                       }
                        
                   }
               }
           ])
          
  }
  const renderItem = ({ item }) => (
    <TouchableOpacity activeOpacity={0.8} style={s.card}>
      <View style={s.cardTopRow}>
        <View style={s.cardTitleWrap}>
          <Text style={s.cardNumber}>{item?.numero || 'Devis sans numero'}</Text>
          <Text style={s.cardClient} numberOfLines={1}>
            {item?.client?.nom || 'Client inconnu'}
          </Text>
        </View>
        <View style={s.archiveBadge}>
          <Text style={s.archiveBadgeText}>Archive</Text>
        </View>
       <TouchableOpacity onPress={() => {console.log('unarchive')
        Unarchive(item.id)
       }}>
  <MaterialIcons name="unarchive" size={22} color="#4F46E5" />
</TouchableOpacity>
      </View>

      <View style={s.separator} />

      <View style={s.cardBottomRow}>
        <View style={s.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={C.sub} />
          <Text style={s.metaText}>{formatDate(item?.updated_at || item?.created_at)}</Text>
        </View>
        <Text style={s.amountText}>{Number(item?.total_ttc || 0).toFixed(2)} MAD</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.replace('Dash')} style={s.backBtn}>
          <Ionicons name="chevron-back" size={18} color={C.text} />
          <Text style={s.backText}>Retour</Text>
        </TouchableOpacity>
        <View style={s.headerRight}>
          <Text style={s.headerCount}>{devis.length}</Text>
        </View>
      </View>

      <View style={s.titleBlock}>
        <Text style={s.pageTitle}>Mes devis archives</Text>
        <Text style={s.pageSubtitle}>Consultez l’historique de vos devis classes.</Text>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : (
        <FlatList
          data={devis}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          refreshing={refreshing}
          onRefresh={() => load(true)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="archive-outline" size={34} color={C.sub} />
              <Text style={s.emptyTitle}>Aucun devis archivé</Text>
              <Text style={s.emptySub}>Les devis archives apparaitront ici.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

export default Archive;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
  },
  headerRight: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerCount: {
    fontSize: 13,
    color: C.accent,
    fontWeight: '700',
  },

  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: C.sub,
  },

  list: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 15,
    color: C.text,
    fontWeight: '700',
  },
  cardClient: {
    marginTop: 3,
    fontSize: 13,
    color: C.sub,
  },
  archiveBadge: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  archiveBadgeText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    color: C.sub,
    fontSize: 12,
  },
  amountText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '700',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: 58 },
  emptyTitle: { fontSize: 16, color: C.text, fontWeight: '600', marginTop: 10 },
  emptySub: { fontSize: 13, color: C.sub, marginTop: 4 },
});