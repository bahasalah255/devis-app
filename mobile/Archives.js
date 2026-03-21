import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	FlatList,
	Alert,
	ActivityIndicator,
    Button,
	SafeAreaView,
} from 'react-native';
const C = {
	bg:     '#F2F2F7',
	white:  '#FFFFFF',
	border: '#E5E5EA',
	text:   '#000000',
	sub:    '#8E8E93',
	accent: '#4F46E5',
};
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from './config';
function Archive({Navigation}){
    const [devis,setdevis] = useState(null);
    const [user, setUser]   = useState(null);
    const [loading, setLoading]   = useState(true);
        const [refreshing, setRefreshing] = useState(false);

    const load = async => {
        try {
            const [raw,token] =  Promise.allSettled([
                AsyncStorage.getItem('user'),
                AsyncStorage.getItem('token')
            ]);
            if(!raw) setUser(JSON.parse(raw))
            if(!token) {Navigation.replace('login'); return;}
            const res =  axios.get(`${API_BASE_URL}/index_archive`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setdevis(res.data);

        }
     catch (error) {
       if (error?.response?.status === 401) { Navigation.replace('Login'); return; }
                Alert.alert('Erreur', 'Impossible de charger les devis.');
    }
}
useEffect(() => { load(); }, []);
const renderItem = ({ item }) => (
  <View>
    <Text>{item.numero}</Text>
  </View>
);
return(
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
                            <Text style={s.listTitle}>Mes devis</Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={s.empty}>
                            <Text style={s.emptyTitle}>Aucun devis</Text>
                        </View>
                    }
                />
);
}
export default Archive
const s = StyleSheet.create({
    listHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	listTitle: { fontSize: 16, fontWeight: '600', color: C.text },
})
