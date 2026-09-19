import React from 'react';
import {
  Shirt,
  Footprints,
  Sparkles,
  ShoppingBag,
  Gem,
  BookOpen,
  Palette,
  Watch,
  Glasses,
  Gift,
  Package,
  Heart,
  Crown,
  Flower2,
  Briefcase,
  Tag
} from 'lucide-react';
import './CategoriaIcon.css';

/**
 * Catálogo de iconos profesionales para categorías de negocios.
 */
export const ICONOS_DISPONIBLES = [
  { id: 'shirt', label: 'Ropa', Icon: Shirt, color: '#2563eb', bg: '#eff6ff' },
  { id: 'footprints', label: 'Calzado', Icon: Footprints, color: '#d97706', bg: '#fffbeb' },
  { id: 'sparkles', label: 'Perfumes', Icon: Sparkles, color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'bag', label: 'Carteras', Icon: ShoppingBag, color: '#db2777', bg: '#fdf2f8' },
  { id: 'gem', label: 'Joyería / Accesorios', Icon: Gem, color: '#0891b2', bg: '#ecfeff' },
  { id: 'book', label: 'Útiles / Librería', Icon: BookOpen, color: '#059669', bg: '#ecfdf5' },
  { id: 'palette', label: 'Cosméticos', Icon: Palette, color: '#e11d48', bg: '#fff1f2' },
  { id: 'watch', label: 'Relojería', Icon: Watch, color: '#4f46e5', bg: '#eef2ff' },
  { id: 'glasses', label: 'Lentes / Óptica', Icon: Glasses, color: '#0284c7', bg: '#f0f9ff' },
  { id: 'gift', label: 'Regalos', Icon: Gift, color: '#dc2626', bg: '#fef2f2' },
  { id: 'box', label: 'Mercadería / Paquetes', Icon: Package, color: '#b45309', bg: '#fffbeb' },
  { id: 'heart', label: 'Infantil / Cuidados', Icon: Heart, color: '#ea580c', bg: '#fff7ed' },
  { id: 'crown', label: 'Premium / Exclusivo', Icon: Crown, color: '#ca8a04', bg: '#fefce8' },
  { id: 'flower', label: 'Fragancias / Flores', Icon: Flower2, color: '#0d9488', bg: '#f0fdfa' },
  { id: 'briefcase', label: 'Oficina / Maletines', Icon: Briefcase, color: '#475569', bg: '#f1f5f9' },
  { id: 'tag', label: 'General / Etiquetas', Icon: Tag, color: '#64748b', bg: '#f8fafc' }
];

/**
 * Mapeo para interpretar emojis existentes en la base de datos
 * y transformarlos automáticamente en iconos vectoriales profesionales.
 */
export const EMOJI_TO_ICON_ID = {
  // Ropa
  '👕': 'shirt',
  '👗': 'shirt',
  '👔': 'shirt',
  '👚': 'shirt',
  // Calzado
  '👟': 'footprints',
  '👠': 'footprints',
  '👞': 'footprints',
  '👡': 'footprints',
  '👢': 'footprints',
  // Perfumes
  '✨': 'sparkles',
  '🧴': 'sparkles',
  // Carteras
  '👜': 'bag',
  '🛍️': 'bag',
  '🎒': 'bag',
  // Joyería
  '💍': 'gem',
  '💎': 'gem',
  // Útiles
  '📚': 'book',
  '📖': 'book',
  '✏️': 'book',
  // Cosméticos
  '💄': 'palette',
  // Accesorios
  '⌚': 'watch',
  '🕶️': 'glasses',
  '👓': 'glasses',
  // Regalos
  '🎁': 'gift',
  '🧸': 'gift',
  // Paquetes
  '📦': 'box',
  // Infantil
  '👶': 'heart',
  // Flores
  '🌸': 'flower',
  '🌹': 'flower',
  // General
  '🏷️': 'tag'
};

/**
 * Resuelve el descriptor del icono a partir de un ID, nombre o emoji histórico.
 */
export function obtenerInfoIcono(iconoValor) {
  if (!iconoValor) {
    return ICONOS_DISPONIBLES.find((i) => i.id === 'shirt') || ICONOS_DISPONIBLES[0];
  }

  const limpio = String(iconoValor).trim().toLowerCase();

  // 1. Coincidencia directa por ID
  const porId = ICONOS_DISPONIBLES.find((i) => i.id === limpio);
  if (porId) return porId;

  // 2. Coincidencia por emoji histórico
  const mapeado = EMOJI_TO_ICON_ID[iconoValor.trim()];
  if (mapeado) {
    const iconMapeado = ICONOS_DISPONIBLES.find((i) => i.id === mapeado);
    if (iconMapeado) return iconMapeado;
  }

  // 3. Coincidencia por coincidencia parcial de texto o slug
  if (limpio.includes('ropa') || limpio.includes('shirt')) return ICONOS_DISPONIBLES[0];
  if (limpio.includes('calzad') || limpio.includes('zapato') || limpio.includes('foot')) return ICONOS_DISPONIBLES[1];
  if (limpio.includes('perfum') || limpio.includes('spark')) return ICONOS_DISPONIBLES[2];
  if (limpio.includes('carter') || limpio.includes('bolso') || limpio.includes('bag')) return ICONOS_DISPONIBLES[3];
  if (limpio.includes('joya') || limpio.includes('accesorio') || limpio.includes('gem')) return ICONOS_DISPONIBLES[4];
  if (limpio.includes('util') || limpio.includes('libr') || limpio.includes('book')) return ICONOS_DISPONIBLES[5];
  if (limpio.includes('cosmet') || limpio.includes('maquill') || limpio.includes('palette')) return ICONOS_DISPONIBLES[6];

  // Fallback a Tag
  return ICONOS_DISPONIBLES.find((i) => i.id === 'tag') || ICONOS_DISPONIBLES[0];
}

/**
 * Componente que renderiza el icono profesional correspondiente para una categoría.
 */
export default function CategoriaIcon({
  icono,
  size = 18,
  strokeWidth = 2,
  className = '',
  style = {},
  colorCustom = null
}) {
  const info = obtenerInfoIcono(icono);
  const IconComponent = info.Icon || Tag;
  const strokeColor = colorCustom || info.color;

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      color={strokeColor}
      className={`cat-vector-icon ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
    />
  );
}

/**
 * Selector interactivo de iconos profesionales para usar dentro de formularios/modales.
 */
export function SelectorIconoCategoria({ valorSeleccionado, onSeleccionar, className = '' }) {
  const seleccionadoInfo = obtenerInfoIcono(valorSeleccionado);

  return (
    <div className={`selector-iconos-profesional ${className}`}>
      <div className="grid-iconos-categoria">
        {ICONOS_DISPONIBLES.map((item) => {
          const esActivo = seleccionadoInfo.id === item.id;
          const { Icon } = item;

          return (
            <button
              key={item.id}
              type="button"
              className={`btn-icono-categoria-card ${esActivo ? 'activo' : ''}`}
              onClick={() => onSeleccionar(item.id)}
              title={item.label}
              style={{
                '--icon-color': item.color,
                '--icon-bg': item.bg
              }}
            >
              <div className="icono-card-preview">
                <Icon size={20} strokeWidth={esActivo ? 2.3 : 1.9} color={item.color} />
              </div>
              <span className="icono-card-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
