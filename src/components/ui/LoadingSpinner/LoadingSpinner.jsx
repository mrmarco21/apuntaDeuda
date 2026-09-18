import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  RiHome5Line,
  RiGroupLine,
  RiUser3Line,
  RiHistoryLine,
  RiArrowUpDownLine,
  RiMoneyDollarCircleLine,
  RiBarChartLine,
  RiSettings3Line,
  RiAppsLine,
  RiStore2Line,
} from 'react-icons/ri';
import './LoadingSpinner.css';

const SCREEN_CONFIGS = {
  dashboard: {
    icon: RiHome5Line,
    defaultText: 'Cargando panel principal...',
    accentColor: '#6366F1',
    subtext: 'Obteniendo resumen de ventas y saldos',
  },
  inicio: {
    icon: RiHome5Line,
    defaultText: 'Cargando panel principal...',
    accentColor: '#6366F1',
    subtext: 'Obteniendo resumen de ventas y saldos',
  },
  clientas: {
    icon: RiGroupLine,
    defaultText: 'Cargando directorio de clientas...',
    accentColor: '#059669',
    subtext: 'Sincronizando deudas y saldos de clientes',
  },
  'clienta-detalle': {
    icon: RiUser3Line,
    defaultText: 'Cargando expediente de la clienta...',
    accentColor: '#0284C7',
    subtext: 'Obteniendo cuentas, abonos y créditos',
  },
  historial: {
    icon: RiHistoryLine,
    defaultText: 'Cargando historial de cuentas...',
    accentColor: '#D97706',
    subtext: 'Recuperando registros archivados',
  },
  movimientos: {
    icon: RiArrowUpDownLine,
    defaultText: 'Cargando registro de movimientos...',
    accentColor: '#2563EB',
    subtext: 'Obteniendo abonos y cargos recientes',
  },
  gastos: {
    icon: RiMoneyDollarCircleLine,
    defaultText: 'Cargando registro de gastos...',
    accentColor: '#E11D48',
    subtext: 'Calculando egresos del negocio',
  },
  reportes: {
    icon: RiBarChartLine,
    defaultText: 'Generando balance y reportes...',
    accentColor: '#8B5CF6',
    subtext: 'Procesando estadísticas financieras',
  },
  configuracion: {
    icon: RiSettings3Line,
    defaultText: 'Cargando opciones de configuración...',
    accentColor: '#64748B',
    subtext: 'Obteniendo datos del negocio y catálogo',
  },
  admin: {
    icon: RiAppsLine,
    defaultText: 'Cargando panel de administración...',
    accentColor: '#4F46E5',
    subtext: 'Gestionando negocios y plataforma',
  },
  auth: {
    icon: RiStore2Line,
    defaultText: 'Validando permisos de acceso...',
    accentColor: '#6366F1',
    subtext: 'Iniciando sesión segura',
  },
  default: {
    icon: RiStore2Line,
    defaultText: 'Cargando información...',
    accentColor: '#6366F1',
    subtext: 'Un momento por favor',
  },
};

export default function LoadingSpinner({
  screen = 'default',
  text,
  size = 'medium',
  fullPage = false,
  className = '',
}) {
  let negocioActual = null;
  try {
    const auth = useAuth();
    negocioActual = auth?.negocioActual;
  } catch (e) {
    // Si se usa fuera del AuthProvider
  }

  const screenKey = SCREEN_CONFIGS[screen] ? screen : 'default';
  const config = SCREEN_CONFIGS[screenKey];
  const IconComponent = config.icon;
  const displayText = text || config.defaultText;

  // Si el negocio tiene logo_url se usa; de lo contrario se usa el logo por defecto (/logo.png)
  const logoSrc = negocioActual?.logo_url || '/logo.png';
  const nombreNegocio = negocioActual?.nombre || 'ApuntaDeuda';

  return (
    <div
      className={`loading-spinner-container ${fullPage ? 'full-page' : ''} screen-${screenKey} size-${size} ${className}`}
    >
      {/* Bloque central de carga animado */}
      <div className="loader-core">
        {/* Únicamente la Imagen del Logo (Logo de la tienda o Logo de la aplicación) */}
        <div className="loader-logo-header">
          <img
            src={logoSrc}
            alt={nombreNegocio}
            className="loader-logo-clean-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/logo.png';
            }}
          />
        </div>

        {/* Anillo de Carga e Icono Dinámico de Pantalla */}
        <div
          className="loader-ring-wrapper"
          style={{ '--screen-accent': config.accentColor }}
        >
          <div className="loader-pulse-aura" />
          <div className="loader-ring-outer" />
          <div className="loader-ring-inner" />
          <div className="loader-icon-badge">
            <IconComponent size={size === 'large' ? 32 : size === 'small' ? 18 : 24} />
          </div>
        </div>

        {/* Textos contextuales de estado */}
        <div className="loader-text-wrap">
          <p className="loader-main-text">{displayText}</p>
          {config.subtext && <span className="loader-subtext">{config.subtext}</span>}
        </div>
      </div>
    </div>
  );
}
