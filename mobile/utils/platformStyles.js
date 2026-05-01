import { Platform, Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';

export const SPACING = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	xxl: 24,
	xxxl: 32,
};

export const RADIUS = {
	xs: 6,
	sm: 10,
	md: 14,
	lg: 18,
	xl: 24,
	full: 999,
};

export const COLORS = {
	bg: '#F5F5F7',
	bgCard: '#FFFFFF',
	white: '#FFFFFF',

	accent: '#4F46E5',
	accentLight: '#EEF2FF',
	accentMid: '#C7D2FE',
	accentDark: '#3730A3',

	text: '#111827',
	textMid: '#374151',
	sub: '#9CA3AF',
	subLight: '#D1D5DB',

	border: '#E5E7EB',
	borderFocus: '#A5B4FC',

	success: '#059669',
	successLight: '#D1FAE5',
	successText: '#065F46',

	warning: '#D97706',
	warningLight: '#FEF3C7',
	warningText: '#92400E',

	danger: '#DC2626',
	dangerLight: '#FEE2E2',
	dangerText: '#991B1B',

	whatsapp: '#25D366',
	whatsappLight: '#DCFCE7',
};

export const STATUS = {
	brouillon: {
		bg: '#F3F4F6',
		text: '#6B7280',
		dot: '#9CA3AF',
		label: 'Brouillon',
	},
	envoye: {
		bg: '#EDE9FE',
		text: '#6D28D9',
		dot: '#8B5CF6',
		label: 'Envoyé',
	},
	accepte: {
		bg: '#D1FAE5',
		text: '#065F46',
		dot: '#059669',
		label: 'Accepté',
	},
	refuse: {
		bg: '#FEE2E2',
		text: '#991B1B',
		dot: '#DC2626',
		label: 'Refusé',
	},
};

export const FONT = {
	xs: 11,
	sm: 13,
	md: 15,
	lg: 17,
	xl: 20,
	xxl: 24,
	xxxl: 30,
};

export const SHADOW_SM = isIOS
	? { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }
	: { elevation: 2 };

export const SHADOW = isIOS
	? { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }
	: { elevation: 4 };

export const SHADOW_LG = isIOS
	? { shadowColor: '#4F46E5', shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }
	: { elevation: 8 };

export const SHADOW_IOS = {
	shadowColor: '#000',
	shadowOpacity: 0.1,
	shadowRadius: 10,
	shadowOffset: { width: 0, height: 4 },
};

export const SHADOW_ANDROID = {
	elevation: 4,
};

export const SAFE_PADDING = {
	paddingTop: isIOS ? 8 : 12,
	paddingBottom: isIOS ? 8 : 12,
	paddingHorizontal: SPACING.lg,
};

export const KEYBOARD_BEHAVIOR = isIOS ? 'padding' : 'height';

export const SCROLL_INDICATOR = isAndroid ? true : false;

export const DIMENSIONS = {
	screenWidth,
	screenHeight,
	isSmallScreen: screenWidth < 375,
	isMediumScreen: screenWidth >= 375 && screenWidth < 768,
	isLargeScreen: screenWidth >= 768,
};

export const buttonResponsiveHeight = () => {
	return DIMENSIONS.isSmallScreen ? 46 : 52;
};

export const buttonResponsiveFontSize = () => {
	return DIMENSIONS.isSmallScreen ? 14 : 15;
};

export const containerResponsivePadding = () => {
	return {
		paddingHorizontal: isAndroid ? SPACING.md : SPACING.lg,
		paddingVertical: SPACING.md,
	};
};

export default {
	SPACING,
	RADIUS,
	COLORS,
	STATUS,
	FONT,
	SHADOW,
	SHADOW_SM,
	SHADOW_LG,
	KEYBOARD_BEHAVIOR,
	SCROLL_INDICATOR,
	DIMENSIONS,
	buttonResponsiveHeight,
	buttonResponsiveFontSize,
	containerResponsivePadding,
	isIOS,
	isAndroid,
};
