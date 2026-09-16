// Paleta de colores para tema claro y oscuro

export const lightTheme = {
  // Colores principales
  primary: '#45beffff',
  primaryDark: '#2c95cdff',
  primaryLight: '#E1F5FE',
  
  // Fondos
  background: '#F5F6F8',
  card: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F8F9FA',
  
  // Textos
  text: '#2D3436',
  textSecondary: '#636E72',
  textTertiary: '#95A5A6',
  textInverse: '#FFFFFF',
  
  // Bordes y divisores
  border: '#F5F6F8',
  borderLight: '#F0F0F0',
  divider: '#E0E0E0',
  
  // Estados
  success: '#4CAF50',
  successLight: '#E8F5E9',
  error: '#FF6B6B',
  errorLight: '#FFE5E5',
  warning: '#FF9800',
  warningLight: '#FFF3E0',
  info: '#2196F3',
  infoLight: '#E3F2FD',
  
  // Categorías (mantener consistentes)
  categoryBlusas: '#E91E63',
  categoryPantalones: '#3F51B5',
  categoryVestidos: '#9C27B0',
  categoryFaldas: '#FF5722',
  categoryChompas: '#00BCD4',
  categoryAccesorios: '#FFC107',
  categoryZapatos: '#795548',
  categoryOtros: '#607D8B',
  
  // Sombras
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Cards especiales
  cardDeuda: '#FFE5E5',
  cardSinDeuda: '#E8F5E9',
  cardActiva: '#E1F5FE',
  
  // StatusBar
  statusBar: 'dark',
};

export const darkTheme = {
  // Colores principales
  primary: '#45beffff',
  primaryDark: '#2c95cdff',
  primaryLight: '#1a4d6d',
  
  // Fondos
  background: '#121212',
  card: '#1E1E1E',
  surface: '#1E1E1E',
  surfaceVariant: '#2C2C2C',
  
  // Textos
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  textInverse: '#000000',
  
  // Bordes y divisores
  border: '#2C2C2C',
  borderLight: '#3A3A3A',
  divider: '#404040',
  
  // Estados
  success: '#66BB6A',
  successLight: '#1B5E20',
  error: '#EF5350',
  errorLight: '#B71C1C',
  warning: '#FFA726',
  warningLight: '#E65100',
  info: '#42A5F5',
  infoLight: '#0D47A1',
  
  // Categorías (versiones más brillantes para dark mode)
  categoryBlusas: '#F06292',
  categoryPantalones: '#5C6BC0',
  categoryVestidos: '#AB47BC',
  categoryFaldas: '#FF7043',
  categoryChompas: '#26C6DA',
  categoryAccesorios: '#FFCA28',
  categoryZapatos: '#A1887F',
  categoryOtros: '#78909C',
  
  // Sombras (más sutiles en dark mode)
  shadow: 'rgba(0, 0, 0, 0.4)',
  shadowDark: 'rgba(0, 0, 0, 0.6)',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
  
  // Cards especiales
  cardDeuda: '#3D1F1F',
  cardSinDeuda: '#1F3D1F',
  cardActiva: '#1F2F3D',
  
  // StatusBar
  statusBar: 'light',
};

// Función helper para obtener color de categoría
export const getCategoryColor = (categoryId, isDark = false) => {
  const theme = isDark ? darkTheme : lightTheme;
  const colorMap = {
    'ropa-blusas': theme.categoryBlusas,
    'ropa-pantalones': theme.categoryPantalones,
    'ropa-vestidos': theme.categoryVestidos,
    'ropa-faldas': theme.categoryFaldas,
    'ropa-chompas': theme.categoryChompas,
    'ropa-accesorios': theme.categoryAccesorios,
    'ropa-zapatos': theme.categoryZapatos,
    'ropa-otros': theme.categoryOtros,
  };
  return colorMap[categoryId] || theme.categoryOtros;
};
