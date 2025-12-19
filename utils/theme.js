// Centralized theme palettes and helpers
export const lightPalette = {
  primary: '#D32F2F',
  accent: '#FFD700',
  background: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111827',
  textSecondary: '#4B5563',
  border: '#E5E7EB',
  success: '#4CAF50',
  danger: '#E53935',
  surfaceGradientStart: 'rgba(211,47,47,0.98)',
  surfaceGradientMid: 'rgba(255,215,0,0.15)',
  surfaceGradientEnd: 'rgba(211,47,47,0.98)',
  headerStart: '#FFD700',
  headerEnd: '#FFA000',
  onPrimary: '#000000',
  placeholder: '#cc9a00',
  fabStart: '#FFD700',
  fabEnd: '#FFA000',
};

export const darkPalette = {
  primary: '#FFA726', // Cam nhạt dễ nhìn
  accent: '#FFD700', // Vàng vẫn giữ
  background: '#0F1419', // Đen rất nhẹ, dễ nhìn
  surface: '#1A1F2E', // Card surface tối nhưng sáng đủ
  card: '#252C3C', // Card tối nhưng có depth
  text: '#E8E8E8', // Trắng dịu nhàng
  textSecondary: '#A8A8A8', // Xám sáng
  textDisabled: '#666666', // Xám tối cho disabled
  border: '#3A4555', // Border xám vừa phải
  success: '#66BB6A', // Xanh lá sáng
  danger: '#FF6B6B', // Đỏ nhạt dễ nhìn
  surfaceGradientStart: 'rgba(30, 35, 50, 0.95)', // Xám tím nhạt
  surfaceGradientMid: 'rgba(255, 215, 0, 0.05)', // Vàng rất nhẹ
  surfaceGradientEnd: 'rgba(30, 35, 50, 0.95)', // Xám tím nhạt
  headerStart: '#1A1F2E',
  headerEnd: '#0F1419',
  onPrimary: '#FFFFFF',
  placeholder: '#7A7A7A',
  fabStart: '#FFD700',
  fabEnd: '#FFA726',
};

export const getPalette = (isDark) => (isDark ? darkPalette : lightPalette);

export const chartConfigForTheme = (isDark) => ({
  backgroundGradientFrom: isDark ? '#071021' : '#ffffff',
  backgroundGradientTo: isDark ? '#071021' : '#ffffff',
  color: (opacity = 1) => `rgba(123,97,255, ${opacity})`,
  labelColor: () => (isDark ? '#cbd5e1' : '#333'),
  decimalPlaces: 1,
});
