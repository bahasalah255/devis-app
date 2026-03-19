
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';

function Dash({ navigation }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const getData = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsed = JSON.parse(userData);
                setUser(parsed);
            }
        };

        getData();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.appTitle}>Devis App</Text>
            <Text style={styles.subtitle}>Tableau de bord</Text>

            <View style={styles.card}>
                <Text style={styles.companyName}>Equipement Chefchaouni</Text>
                <Text style={styles.greeting}>Bonjour {user ? user.name : '...'}</Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.buttonText}>Déconnexion</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default Dash;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        paddingHorizontal: 15,
    },
    appTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a2e',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    companyName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a2e',
        textAlign: 'center',
        marginBottom: 10,
    },
    greeting: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#4f46e5',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    }
});