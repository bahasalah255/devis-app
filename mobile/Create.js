import React, { useEffect, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ScrollView,
	Alert,
	ActivityIndicator,
	Modal,
	FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

function Create({ navigation }) {
	const [clientId, setClientId] = useState('');
	const [dateEmission, setDateEmission] = useState(new Date());
	const [dateValidite, setDateValidite] = useState(new Date());
	const [lignes, setLignes] = useState([
		{ produit_id: '', nom_produit: '', description: '', quantite: '1', prix_unitaire: '', remise: '0' },
	]);
	const [clients, setClients] = useState([]);
	const [produits, setProduits] = useState([]);
	const [loadingRefs, setLoadingRefs] = useState(true);
	const [loading, setLoading] = useState(false);
	const [showEmissionPicker, setShowEmissionPicker] = useState(false);
	const [showValiditePicker, setShowValiditePicker] = useState(false);
	const [showClientModal, setShowClientModal] = useState(false);
	const [showProduitModal, setShowProduitModal] = useState(false);
	const [activeLineIndex, setActiveLineIndex] = useState(0);

	const formatDate = (date) => {
		const year = date.getFullYear();
		const month = `${date.getMonth() + 1}`.padStart(2, '0');
		const day = `${date.getDate()}`.padStart(2, '0');
		return `${year}-${month}-${day}`;
	};

	const selectedClient = clients.find((client) => String(client.id) === String(clientId));

	useEffect(() => {
		const loadReferences = async () => {
			setLoadingRefs(true);
			try {
				const token = await AsyncStorage.getItem('token');
				const headers = {
					Accept: 'application/json',
					Authorization: token ? `Bearer ${token}` : '',
				};

				const [clientsResponse, produitsResponse] = await Promise.all([
					axios.get('http://192.168.11.106:8000/api/clients', { headers }),
					axios.get('http://192.168.11.106:8000/api/produits', { headers }),
				]);

				setClients(Array.isArray(clientsResponse.data) ? clientsResponse.data : []);
				setProduits(Array.isArray(produitsResponse.data) ? produitsResponse.data : []);
			} catch (error) {
				Alert.alert('Erreur', 'Impossible de charger clients/produits.');
			} finally {
				setLoadingRefs(false);
			}
		};

		loadReferences();
	}, []);

	const handleAddLigne = () => {
		setLignes((prev) => [
			...prev,
			{ produit_id: '', nom_produit: '', description: '', quantite: '1', prix_unitaire: '', remise: '0' },
		]);
	};

	const handleRemoveLigne = (index) => {
		setLignes((prev) => prev.filter((_, i) => i !== index));
	};

	const handleLigneChange = (index, key, value) => {
		setLignes((prev) =>
			prev.map((ligne, i) => (i === index ? { ...ligne, [key]: value } : ligne))
		);
	};

	const handleCreateDevis = async () => {
		if (!clientId) {
			Alert.alert('Champs requis', 'Remplis tous les champs obligatoires.');
			return;
		}

		const hasInvalidLine = lignes.some(
			(ligne) => !ligne.nom_produit || !ligne.quantite || !ligne.prix_unitaire
		);

		if (hasInvalidLine) {
			Alert.alert('Champs requis', 'Chaque produit doit avoir description, quantité et prix unitaire.');
			return;
		}

		setLoading(true);

		try {
			const token = await AsyncStorage.getItem('token');

			if (!token) {
				Alert.alert('Session expirée', 'Reconnecte-toi.');
				navigation.replace('Login');
				return;
			}

			const payload = {
				client_id: Number(clientId),
				date_emission: formatDate(dateEmission),
				date_validite: formatDate(dateValidite),
				lignes: lignes.map((ligne) => ({
					produit_id: ligne.produit_id ? Number(ligne.produit_id) : null,
					description: ligne.description || ligne.nom_produit,
					quantite: Number(ligne.quantite),
					prix_unitaire: Number(ligne.prix_unitaire),
					remise: Number(ligne.remise || 0),
				})),
			};

			await axios.post('http://192.168.11.106:8000/api/devis', payload, {
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			});

			Alert.alert('Succès', 'Devis créé avec succès.', [
				{
					text: 'OK',
					onPress: () => navigation.replace('Dash'),
				},
			]);
		} catch (error) {
			const statusCode = error?.response?.status;

			if (statusCode === 422) {
				Alert.alert('Validation', 'Vérifie les champs saisis (client/date/ligne).');
			} else if (statusCode === 401) {
				Alert.alert('Non autorisé', 'Reconnecte-toi puis réessaie.');
				navigation.replace('Login');
			} else {
				Alert.alert('Erreur', 'Impossible de créer le devis.');
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<TouchableOpacity style={styles.backButton} onPress={() => navigation.replace('Dash')}>
				<Text style={styles.backButtonText}>← Retour au dashboard</Text>
			</TouchableOpacity>

			<Text style={styles.title}>Nouveau devis</Text>
			<Text style={styles.subtitle}>Remplis le formulaire pour créer un devis</Text>

			<View style={styles.card}>
				<Text style={styles.label}>Client *</Text>
				<TouchableOpacity style={styles.selector} onPress={() => setShowClientModal(true)} disabled={loadingRefs}>
					<Text style={styles.selectorText}>
						{selectedClient ? `${selectedClient.nom} (#${selectedClient.id})` : loadingRefs ? 'Chargement clients...' : 'Choisir un client'}
					</Text>
				</TouchableOpacity>

				<Text style={styles.label}>Date émission *</Text>
				<TouchableOpacity style={styles.selector} onPress={() => setShowEmissionPicker(true)}>
					<Text style={styles.selectorText}>{formatDate(dateEmission)}</Text>
				</TouchableOpacity>

				<Text style={styles.label}>Date validité *</Text>
				<TouchableOpacity style={styles.selector} onPress={() => setShowValiditePicker(true)}>
					<Text style={styles.selectorText}>{formatDate(dateValidite)}</Text>
				</TouchableOpacity>

				{showEmissionPicker && (
					<DateTimePicker
						value={dateEmission}
						mode="date"
						display="default"
						onChange={(_, selectedDate) => {
							setShowEmissionPicker(false);
							if (selectedDate) setDateEmission(selectedDate);
						}}
					/>
				)}

				{showValiditePicker && (
					<DateTimePicker
						value={dateValidite}
						mode="date"
						display="default"
						onChange={(_, selectedDate) => {
							setShowValiditePicker(false);
							if (selectedDate) setDateValidite(selectedDate);
						}}
					/>
				)}

				<View style={styles.sectionRow}>
					<Text style={styles.section}>Produits du devis</Text>
					<TouchableOpacity style={styles.addLineButton} onPress={handleAddLigne}>
						<Text style={styles.addLineButtonText}>+ Ajouter un produit</Text>
					</TouchableOpacity>
				</View>

				{lignes.map((ligne, index) => (
					<View key={index} style={styles.lineCard}>
						<View style={styles.lineHeader}>
							<Text style={styles.lineTitle}>Produit {index + 1}</Text>
							{lignes.length > 1 && (
								<TouchableOpacity onPress={() => handleRemoveLigne(index)}>
									<Text style={styles.removeText}>Supprimer</Text>
								</TouchableOpacity>
							)}
						</View>

						<Text style={styles.label}>Nom produit *</Text>
						<TouchableOpacity
							style={styles.selector}
							onPress={() => {
								setActiveLineIndex(index);
								setShowProduitModal(true);
							}}
							disabled={loadingRefs}
						>
							<Text style={styles.selectorText}>
								{ligne.nom_produit || (loadingRefs ? 'Chargement produits...' : 'Choisir un produit')}
							</Text>
						</TouchableOpacity>

						<Text style={styles.label}>Description (optionnel)</Text>
						<TextInput
							style={styles.input}
							placeholder="Détail du produit/service"
							value={ligne.description}
							onChangeText={(value) => handleLigneChange(index, 'description', value)}
						/>

						<Text style={styles.label}>Quantité *</Text>
						<TextInput
							style={styles.input}
							keyboardType="numeric"
							value={ligne.quantite}
							onChangeText={(value) => handleLigneChange(index, 'quantite', value)}
						/>

						<Text style={styles.label}>Prix unitaire *</Text>
						<TextInput
							style={styles.input}
							keyboardType="numeric"
							placeholder="500"
							value={ligne.prix_unitaire}
							onChangeText={(value) => handleLigneChange(index, 'prix_unitaire', value)}
						/>

						<Text style={styles.label}>Remise (%)</Text>
						<TextInput
							style={styles.input}
							keyboardType="numeric"
							placeholder="0"
							value={ligne.remise}
							onChangeText={(value) => handleLigneChange(index, 'remise', value)}
						/>
					</View>
				))}

				<TouchableOpacity
					style={styles.button}
					onPress={handleCreateDevis}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<Text style={styles.buttonText}>Créer le devis</Text>
					)}
				</TouchableOpacity>
			</View>

			<Modal visible={showClientModal} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>Choisir un client</Text>
						<FlatList
							data={clients}
							keyExtractor={(item) => item.id.toString()}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={styles.optionItem}
									onPress={() => {
										setClientId(String(item.id));
										setShowClientModal(false);
									}}
								>
									<Text style={styles.optionTitle}>{item.nom}</Text>
									<Text style={styles.optionSub}>ID: {item.id} • {item.email || 'sans email'}</Text>
								</TouchableOpacity>
							)}
						/>
						<TouchableOpacity style={styles.closeButton} onPress={() => setShowClientModal(false)}>
							<Text style={styles.closeButtonText}>Fermer</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			<Modal visible={showProduitModal} transparent animationType="slide">
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>Choisir un produit</Text>
						<FlatList
							data={produits}
							keyExtractor={(item) => item.id.toString()}
							renderItem={({ item }) => (
								<TouchableOpacity
									style={styles.optionItem}
									onPress={() => {
										handleLigneChange(activeLineIndex, 'produit_id', String(item.id));
										handleLigneChange(activeLineIndex, 'nom_produit', item.libelle || `Produit #${item.id}`);
										handleLigneChange(activeLineIndex, 'prix_unitaire', String(item.prix_unitaire || ''));
										if (!lignes[activeLineIndex]?.description) {
											handleLigneChange(activeLineIndex, 'description', item.description || item.libelle || '');
										}
										setShowProduitModal(false);
									}}
								>
									<Text style={styles.optionTitle}>{item.libelle || `Produit #${item.id}`}</Text>
									<Text style={styles.optionSub}>ID: {item.id} • {item.prix_unitaire} MAD</Text>
								</TouchableOpacity>
							)}
						/>
						<TouchableOpacity style={styles.closeButton} onPress={() => setShowProduitModal(false)}>
							<Text style={styles.closeButtonText}>Fermer</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 16,
		backgroundColor: '#f3f4f6',
		paddingBottom: 30,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: '#1a1a2e',
		marginBottom: 4,
	},
	subtitle: {
		fontSize: 14,
		color: '#6b7280',
		marginBottom: 14,
	},
	card: {
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	section: {
		marginTop: 8,
		marginBottom: 8,
		fontSize: 16,
		fontWeight: '700',
		color: '#1f2937',
	},
	sectionRow: {
		marginTop: 8,
		marginBottom: 8,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	addLineButton: {
		backgroundColor: '#eef2ff',
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 8,
	},
	addLineButtonText: {
		color: '#4f46e5',
		fontSize: 12,
		fontWeight: '700',
	},
	lineCard: {
		backgroundColor: '#f9fafb',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#e5e7eb',
		padding: 10,
		marginBottom: 10,
	},
	lineHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	lineTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#1f2937',
	},
	removeText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#b91c1c',
	},
	label: {
		fontSize: 13,
		color: '#374151',
		marginBottom: 6,
		marginTop: 6,
		fontWeight: '600',
	},
	input: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: '#f9fafb',
	},
	selector: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 12,
		backgroundColor: '#f9fafb',
	},
	selectorText: {
		fontSize: 14,
		color: '#111827',
	},
	button: {
		marginTop: 16,
		backgroundColor: '#4f46e5',
		borderRadius: 10,
		paddingVertical: 13,
		alignItems: 'center',
	},
	buttonText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 15,
	},
	backButton: {
		alignSelf: 'flex-start',
		backgroundColor: '#e5e7eb',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		marginBottom: 10,
	},
	backButtonText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1f2937',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
	},
	modalCard: {
		maxHeight: '70%',
		backgroundColor: '#fff',
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		padding: 16,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#111827',
		marginBottom: 10,
	},
	optionItem: {
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#e5e7eb',
	},
	optionTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#111827',
	},
	optionSub: {
		fontSize: 12,
		color: '#6b7280',
		marginTop: 2,
	},
	closeButton: {
		marginTop: 12,
		backgroundColor: '#111827',
		paddingVertical: 12,
		borderRadius: 10,
		alignItems: 'center',
	},
	closeButtonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '700',
	},
});

export default Create;