import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOW_LG, SHADOW_SM } from './utils/platformStyles';

const C = COLORS;

const navItems = [
	{ label: 'Dash', display: 'Accueil', iconType: 'ion', icon: 'home', iconActive: 'home' },
	{ label: 'Clients', display: 'Clients', iconType: 'ion', icon: 'people-outline', iconActive: 'people' },
	{ label: 'CREATE_FAB', display: '', iconType: 'fab', icon: 'add' },
	{ label: 'Products', display: 'Produits', iconType: 'ion', icon: 'cube-outline', iconActive: 'cube' },
	{ label: 'Parameters', display: 'Réglages', iconType: 'ion', icon: 'settings-outline', iconActive: 'settings' },
];

export default function Navbar({ onChange, current = 'Dash' }) {
	const [active, setActive] = useState(current);
	const insets = useSafeAreaInsets();

	useEffect(() => {
		setActive(current);
	}, [current]);

	const handlePress = (label) => {
		if (label === 'CREATE_FAB') {
			if (onChange) onChange('CreateDevis');
			return;
		}
		setActive(label);
		if (onChange) onChange(label);
	};

	return (
		<View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
			{navItems.map((item) => {
				if (item.label === 'CREATE_FAB') {
					return (
						<TouchableOpacity
							key="fab"
							style={styles.fabWrap}
							onPress={() => handlePress('CREATE_FAB')}
							activeOpacity={0.85}
						>
							<View style={styles.fab}>
								<Ionicons name="add" size={28} color={C.white} />
							</View>
						</TouchableOpacity>
					);
				}

				const isActive = active === item.label;
				const color = isActive ? C.accent : C.sub;
				const iconName = isActive ? (item.iconActive || item.icon) : item.icon;

				return (
					<TouchableOpacity
						key={item.label}
						style={styles.navItem}
						onPress={() => handlePress(item.label)}
						activeOpacity={0.7}
					>
						<View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
							<Ionicons name={iconName} size={22} color={color} />
						</View>
						<Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
							{item.display}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: C.white,
		borderTopWidth: 1,
		borderTopColor: C.border,
		paddingTop: 10,
		paddingHorizontal: 8,
		...SHADOW_SM,
	},
	navItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 2,
	},
	iconWrap: {
		width: 40,
		height: 32,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconWrapActive: {
		backgroundColor: C.accentLight,
	},
	navLabel: {
		marginTop: 2,
		fontSize: 10,
		fontWeight: '600',
		color: C.sub,
		letterSpacing: 0.2,
	},
	navLabelActive: {
		color: C.accent,
		fontWeight: '700',
	},
	fabWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: -20,
	},
	fab: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: C.accent,
		alignItems: 'center',
		justifyContent: 'center',
		...SHADOW_LG,
		borderWidth: 3,
		borderColor: C.white,
	},
});
