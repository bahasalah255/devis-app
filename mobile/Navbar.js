import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';

const navItems = [
	{ label: 'Dash', iconType: 'fa', icon: 'home' },
	{ label: 'Clients', iconType: 'fa', icon: 'users' },
	{ label: 'Products', iconType: 'fa', icon: 'cube' },
	{ label: 'Parameters', iconType: 'mi', icon: 'settings' },
];

export default function Navbar({ onChange, current = 'Dash' }) {
	const [active, setActive] = useState(current);
	const insets = useSafeAreaInsets();

	useEffect(() => {
		setActive(current);
	}, [current]);

	const handlePress = (label) => {
		setActive(label);
		if (onChange) onChange(label);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={[styles.navbar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
				{navItems.map((item) => {
					const isActive = active === item.label;
					const color = isActive ? '#4F46E5' : '#8E8E93';

					return (
						<TouchableOpacity
							key={item.label}
							style={[styles.navItem, isActive && styles.navItemActive]}
							onPress={() => handlePress(item.label)}
							activeOpacity={0.8}
						>
							{item.iconType === 'fa' ? (
								<FontAwesome name={item.icon} size={20} color={color} />
							) : (
								<MaterialIcons name={item.icon} size={22} color={color} />
							)}
							<Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: {
		backgroundColor: '#F2F2F7',
		borderTopWidth: 1,
		borderTopColor: '#E5E5EA',
	},
	navbar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 10,
		paddingTop: 8,
		paddingBottom: 10,
		backgroundColor: '#FFFFFF',
	},
	navItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 6,
		borderRadius: 12,
		marginHorizontal: 4,
	},
	navItemActive: {
		backgroundColor: '#EEF2FF',
	},
	navLabel: {
		marginTop: 4,
		fontSize: 11,
		fontWeight: '600',
		color: '#8E8E93',
	},
	navLabelActive: {
		color: '#4F46E5',
		fontWeight: '700',
	},
});