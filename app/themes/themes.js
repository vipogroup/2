/**
 * Theme System - 6 Ready-to-use themes inspired by popular e-commerce sites
 * Each theme includes colors, gradients, buttons, and layout preferences
 */

export const THEMES = {
  amazon: {
    id: 'amazon',
    name: 'Amazon Style',
    nameHe: 'סגנון אמזון',
    description: 'Clean, professional design with orange accents',
    descriptionHe: 'עיצוב נקי ומקצועי עם נגיעות כתום',
    icon: '[PKG]',

    // Colors
    primary: '#FF9900', // Amazon Orange
    secondary: '#232F3E', // Amazon Dark Blue
    accent: '#146EB4', // Amazon Blue
    success: '#067D62',
    warning: '#F08804',
    danger: '#C7511F',

    // Backgrounds
    bgGradient: 'from-gray-50 to-white',
    headerBg: 'bg-gray-900',
    cardBg: 'bg-white',

    // Buttons
    primaryButton: 'bg-[#FF9900] hover:bg-[#F08804] text-gray-900 font-semibold',
    secondaryButton: 'bg-[#FFA41C] hover:bg-[#FF9900] text-gray-900',
    buyButton: 'bg-[#FF9900] hover:bg-[#FA8900] text-gray-900 font-bold',
    addToCartButton: 'bg-[#FFA41C] hover:bg-[#FF9900] text-gray-900',

    // Typography
    headingFont: 'font-bold',
    bodyFont: 'font-normal',

    // Layout
    borderRadius: 'rounded-lg',
    shadow: 'shadow-md',
    spacing: 'space-y-4',
  },

  aliexpress: {
    id: 'aliexpress',
    name: 'AliExpress Style',
    nameHe: 'סגנון אליאקספרס',
    description: 'Vibrant red with modern accents',
    descriptionHe: 'אדום תוסס עם נגיעות מודרניות',
    icon: '[CART]',

    primary: '#FF4747', // AliExpress Red
    secondary: '#FF6F61',
    accent: '#FF9100',
    success: '#52C41A',
    warning: '#FAAD14',
    danger: '#FF4747',

    bgGradient: 'from-red-50 via-orange-50 to-yellow-50',
    headerBg: 'bg-red-600',
    cardBg: 'bg-white',

    primaryButton: 'bg-[#FF4747] hover:bg-[#E63939] text-white font-bold',
    secondaryButton: 'bg-[#FF6F61] hover:bg-[#FF5B4D] text-white',
    buyButton: 'bg-gradient-to-r from-[#FF4747] to-[#FF6F61] hover:opacity-90 text-white font-bold',
    addToCartButton: 'bg-[#FF9100] hover:bg-[#FF8000] text-white',

    headingFont: 'font-extrabold',
    bodyFont: 'font-normal',

    borderRadius: 'rounded-xl',
    shadow: 'shadow-lg',
    spacing: 'space-y-6',
  },

  alibaba: {
    id: 'alibaba',
    name: 'Alibaba Style',
    nameHe: 'סגנון אליבאבא',
    description: 'Professional orange and blue theme',
    descriptionHe: 'ערכה מקצועית כתום וכחול',
    icon: '[BIZ]',

    primary: '#FF6A00', // Alibaba Orange
    secondary: '#0C7EAF', // Alibaba Blue
    accent: '#FF8500',
    success: '#5BC236',
    warning: '#FFB800',
    danger: '#FF3B30',

    bgGradient: 'from-blue-50 via-orange-50 to-yellow-50',
    headerBg: 'bg-[#0C7EAF]',
    cardBg: 'bg-white',

    primaryButton: 'bg-[#FF6A00] hover:bg-[#E65F00] text-white font-bold',
    secondaryButton: 'bg-[#0C7EAF] hover:bg-[#0A6A94] text-white',
    buyButton: 'bg-gradient-to-r from-[#FF6A00] to-[#FF8500] hover:opacity-90 text-white font-bold',
    addToCartButton: 'bg-[#FFB800] hover:bg-[#FFA500] text-gray-900',

    headingFont: 'font-bold',
    bodyFont: 'font-normal',

    borderRadius: 'rounded-2xl',
    shadow: 'shadow-xl',
    spacing: 'space-y-5',
  },

  temu: {
    id: 'temu',
    name: 'Temu Style',
    nameHe: 'סגנון טמו',
    description: 'Fun, colorful shopping experience',
    descriptionHe: 'חוויית קניות צבעונית ומהנה',
    icon: '[ART]',

    primary: '#FF5E00', // Temu Orange
    secondary: '#00B4D8', // Temu Blue
    accent: '#FF006E',
    success: '#06FFA5',
    warning: '#FFD60A',
    danger: '#FF006E',

    bgGradient: 'from-purple-100 via-pink-100 to-orange-100',
    headerBg: 'bg-gradient-to-r from-[#FF5E00] to-[#FF006E]',
    cardBg: 'bg-white',

    primaryButton:
      'bg-gradient-to-r from-[#FF5E00] to-[#FF006E] hover:opacity-90 text-white font-bold',
    secondaryButton: 'bg-[#00B4D8] hover:bg-[#0096C7] text-white',
    buyButton:
      'bg-gradient-to-r from-[#FF006E] to-[#FF5E00] hover:scale-105 text-white font-extrabold transform transition',
    addToCartButton: 'bg-[#FFD60A] hover:bg-[#FFC300] text-gray-900 font-bold',

    headingFont: 'font-extrabold',
    bodyFont: 'font-medium',

    borderRadius: 'rounded-3xl',
    shadow: 'shadow-2xl',
    spacing: 'space-y-6',
  },

  shein: {
    id: 'shein',
    name: 'Shein Style',
    nameHe: 'סגנון שיין',
    description: 'Fashion-forward pink and black',
    descriptionHe: 'מודרני ורוד ושחור',
    icon: '👗',

    primary: '#000000', // Shein Black
    secondary: '#E91E63', // Shein Pink
    accent: '#FF69B4',
    success: '#4CAF50',
    warning: '#FFC107',
    danger: '#F44336',

    bgGradient: 'from-pink-50 via-purple-50 to-gray-50',
    headerBg: 'bg-black',
    cardBg: 'bg-white',

    primaryButton: 'bg-black hover:bg-gray-900 text-white font-bold',
    secondaryButton: 'bg-[#E91E63] hover:bg-[#C2185B] text-white',
    buyButton: 'bg-black hover:bg-gray-800 text-white font-bold uppercase tracking-wide',
    addToCartButton: 'bg-[#E91E63] hover:bg-[#D81B60] text-white font-bold',

    headingFont: 'font-bold uppercase',
    bodyFont: 'font-light',

    borderRadius: 'rounded-none',
    shadow: 'shadow-md',
    spacing: 'space-y-4',
  },

  vipo: {
    id: 'vipo',
    name: 'VIPO Custom',
    nameHe: 'VIPO סגנון כחול',
    description: 'Clean blue gradient inspired by VIPO branding',
    descriptionHe: 'מראה כחול מודרני עם טיפוגרפיה נקייה',
    icon: '[GEM]',

    primary: '#3498db',
    secondary: '#2980b9',
    accent: '#5dade2',
    success: '#3498db',
    warning: '#5dade2',
    danger: '#e74c3c',

    bgGradient: 'from-sky-200 via-sky-300 to-blue-300',
    headerBg: 'bg-gradient-to-r from-sky-500 to-blue-600',
    cardBg: 'bg-white',

    primaryButton:
      'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold',
    secondaryButton:
      'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white',
    buyButton:
      'bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-600 hover:to-sky-600 text-white font-semibold',
    addToCartButton:
      'bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-500 hover:to-sky-600 text-white font-semibold',

    headingFont: 'font-bold',
    bodyFont: 'font-normal',

    borderRadius: 'rounded-2xl',
    shadow: 'shadow-xl',
    spacing: 'space-y-6',
  },
};

/**
 * Get theme by ID
 */
export function getTheme(themeId = 'vipo') {
  return THEMES[themeId] || THEMES.vipo;
}

/**
 * Get all available themes
 */
export function getAllThemes() {
  return Object.values(THEMES);
}

/**
 * Get theme names for dropdown
 */
export function getThemeOptions() {
  return Object.values(THEMES).map((theme) => ({
    value: theme.id,
    label: `${theme.icon} ${theme.nameHe}`,
    description: theme.descriptionHe,
  }));
}
