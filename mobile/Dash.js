import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

function Dash({ navigation }) {
    const [user, setUser] = useState(null);
    const [devis, setDevis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
   

    const getStatusStyle = (status) => {
        if (status === 'accepte') return styles.statusAccepted;
        if (status === 'refuse') return styles.statusRefused;
        return styles.statusDraft;
    };

    const formatTotal = (value) => {
        const amount = Number(value || 0);
        return `${amount.toFixed(2)} MAD`;
    };

    const loadData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const [userData, token] = await Promise.all([
                AsyncStorage.getItem('user'),
                AsyncStorage.getItem('token'),
            ]);

            if (userData) {
                const parsed = JSON.parse(userData);
                setUser(parsed);
            }

            if (!token) {
                Alert.alert('Session expirée', 'Reconnecte-toi pour voir tes devis.');
                navigation.replace('Login');
                return;
            }

            const response = await axios.get('http://192.168.11.106:8000/api/devis', {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (Array.isArray(response.data)) {
                setDevis(response.data);
            } else {
                setDevis([]);
            }
        } catch (error) {
            const statusCode = error?.response?.status;

            if (statusCode === 401) {
                Alert.alert('Non autorisé', 'Reconnecte-toi pour accéder aux devis.');
                navigation.replace('Login');
                return;
            }

            Alert.alert('Erreur', 'Impossible de charger les devis.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const totalDevis = devis.length;
    const acceptedDevis = devis.filter((item) => item.statut === 'accepte').length;

    const handleCreateDevis = () => {
        /*
        Alert.alert('Créer un devis', 'Écran de création à brancher ici.');
        */
        navigation.replace('CreateDevis');
    };

    const handleEditDevis = (item) => {
        Alert.alert('Modifier un devis', `Devis sélectionné: ${item.numero}`);
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.appTitle}>Dashboard</Text>
                    <Text style={styles.subtitle}>Bonjour {user ? user.name : '...'}</Text>
                </View>
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.logoutText}>Déconnexion</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.companyName}>Equipement Chefchaouni</Text>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryValue}>{totalDevis}</Text>
                        <Text style={styles.summaryLabel}>Total devis</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryValue}>{acceptedDevis}</Text>
                        <Text style={styles.summaryLabel}>Acceptés</Text>
                    </View>
                </View>
            </View>

            <View style={styles.listCard}>
                <View style={styles.listHeader}>
                    <Text style={styles.sectionTitle}>Mes devis</Text>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.createButton} onPress={handleCreateDevis}>
                            <Text style={styles.createButtonText}>Créer un devis</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => loadData(true)}>
                            <Text style={styles.refreshText}>Actualiser</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color="#4f46e5" />
                    </View>
                ) : (
                <FlatList
                    data={devis}
                    keyExtractor={item => item.id.toString()}
                    refreshing={refreshing}
                    onRefresh={() => loadData(true)}
                    ListEmptyComponent={<Text style={styles.emptyText}>Aucun devis trouvé.</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.devisItem}>
                            <View style={styles.devisTopRow}>
                                <Text style={styles.devisNumber}>{item.numero}</Text>
                                <Text style={[styles.statusBadge, getStatusStyle(item.statut)]}>{item.statut}</Text>
                            </View>
                            <Text style={styles.devisMeta}>Client: {item?.client?.nom || 'N/A'}</Text>
                            <Text style={styles.devisTotal}>Total TTC: {formatTotal(item.total_ttc)}</Text>
                            <View style={styles.itemActions}>
                                <TouchableOpacity style={styles.editButton} onPress={() => handleEditDevis(item)}>
                                    <Text style={styles.editButtonText}>Modifier</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                />
                )}
            </View>
        </View>
    );
}

export default Dash;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    appTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        marginTop: 2,
    },
    logoutButton: {
        backgroundColor: '#1f2937',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    logoutText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 14,
    },
    companyName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 10,
    },
    summaryBox: {
        flex: 1,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 20,
        color: '#111827',
        fontWeight: '700',
    },
    summaryLabel: {
        marginTop: 4,
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
    },
    listCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    createButton: {
        backgroundColor: '#4f46e5',
        borderRadius: 8,
        paddingVertical: 7,
        paddingHorizontal: 10,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    refreshText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4f46e5',
    },
    loadingWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        textAlign: 'center',
        color: '#6b7280',
        marginTop: 20,
    },
    devisItem: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        backgroundColor: '#ffffff',
    },
    devisTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    devisNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    devisMeta: {
        fontSize: 14,
        color: '#4b5563',
    },
    devisTotal: {
        marginTop: 4,
        fontSize: 14,
        color: '#111827',
        fontWeight: '700',
    },
    itemActions: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    editButton: {
        borderWidth: 1,
        borderColor: '#4f46e5',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    editButtonText: {
        color: '#4f46e5',
        fontSize: 12,
        fontWeight: '700',
    },
    statusBadge: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        overflow: 'hidden',
    },
    statusDraft: {
        color: '#92400e',
        backgroundColor: '#fef3c7',
    },
    statusAccepted: {
        color: '#166534',
        backgroundColor: '#dcfce7',
    },
    statusRefused: {
        color: '#991b1b',
        backgroundColor: '#fee2e2',
    },
});