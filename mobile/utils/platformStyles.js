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
};

export const RADIUS = {
	sm: 8,
	md: 12,
	lg: 16,
	full: 999,
};

export const COLORS = {
	bg: '#F2F2F7',
	white: '#FFFFFF',
	accent: '#4F46E5',
	text: '#1C1C1E',
	sub: '#8E8E93',
	border: '#E5E5EA',
	danger: '#DC2626',
};

export const SHADOW_IOS = {
	shadowColor: '#000',
	shadowOpacity: 0.1,
	shadowRadius: 10,
	shadowOffset: { width: 0, height: 4 },
};

export const SHADOW_ANDROID = {
	elevation: 4,
};

export const SHADOW = isIOS ? SHADOW_IOS : SHADOW_ANDROID;

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
	return DIMENSIONS.isSmallScreen ? 44 : 48;
};

export const buttonResponsiveFontSize = () => {
	return DIMENSIONS.isSmallScreen ? 13 : 14;
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
	SHADOW,
	KEYBOARD_BEHAVIOR,
	SCROLL_INDICATOR,
	DIMENSIONS,
	buttonResponsiveHeight,
	buttonResponsiveFontSize,
	containerResponsivePadding,
	isIOS,
	isAndroid,
};
