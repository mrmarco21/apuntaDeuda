import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useConfig } from '../../../context/ConfigContext';
import { reportesService } from '../../../services/reportesService';
import { categoriasService } from '../../../services/categoriasService';
import { resumirMovimientoTexto } from '../../../utils/helpers';
import {
  RiGroupLine,
  RiArrowUpDownLine,
  RiMoneyDollarCircleLine,
  RiBarChartLine,
  RiSettings3Line,
  RiGridLine,
  RiTimeLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiShieldCheckLine,
  RiArrowRightLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import '../styles/Dashboard.css';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString || '';
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima'
  }).format(date);
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { formatCurrency } = useConfig();
  const { usuario, negocioActual, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [movimientosRecientes, setMovimientosRecientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading) {
      cargarDatos();
    }
  }, [authLoading, usuario?.negocio_id, negocioActual?.id]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resumenData, movimientos, cats] = await Promise.all([
        reportesService.getResumenGeneral(),
        reportesService.getMovimientosRecientes(),
        categoriasService.getCategorias({ incluirInactivas: true }).catch(() => [])
      ]);
      setResumen(resumenData);
      setMovimientosRecientes(movimientos || []);
      setCategorias(cats || []);
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
      setError('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const menuOptions = [
    {
      title: 'Clientas',
      subtitle: 'Ver y administrar',
      icon: <RiGroupLine />,
      color: '#29B6F6', bgColor: '#E1F5FE', to: '/clientas',
      badge: resumen?.clientasConDeuda > 0 ? resumen.clientasConDeuda : null
    },
    {
      title: 'Movimientos',
      subtitle: 'Ventas y cobros',
      icon: <RiArrowUpDownLine />,
      color: '#66BB6A', bgColor: '#E8F5E9', to: '/movimientos'
    },
    {
      title: 'Gastos',
      subtitle: 'Control de egresos',
      icon: <RiMoneyDollarCircleLine />,
      color: '#FFA726', bgColor: '#FFF3E0', to: '/gastos'
    },
    {
      title: 'Reportes',
      subtitle: 'Estadísticas e informes',
      icon: <RiBarChartLine />,
      color: '#FF6B6B', bgColor: '#FFE5E5', to: '/reportes'
    },
    {
      title: 'Configuración',
      subtitle: 'Ajustes y copias',
      icon: <RiSettings3Line />,
      color: '#8E24AA', bgColor: '#F3E5F5', to: '/configuracion'
    }
  ];

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Cargando datos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error-state">
        <RiErrorWarningLine size={48} strokeWidth={1.5} />
        <p>{error}</p>
        <button className="btn btn-primary" onClick={cargarDatos}>Reintentar</button>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* ── Encabezado de Página ── */}
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">Resumen general y métricas de tu negocio</p>
        </div>
      </div>

      {/* ── Hero / Balance Principal ── */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-label-row">
            <span className="hero-badge">Balance General</span>
            <span className="hero-live-dot" title="Sincronizado en tiempo real" />
          </div>

          <div className="hero-amount-row">
            <h1 className="hero-amount">{formatCurrency(resumen?.totalDeudas || 0)}</h1>
            <span className="hero-currency">PEN</span>
          </div>
          <p className="hero-desc">Total por cobrar a clientas</p>

          <div className="hero-metrics-bar">
            <div className="hero-metric">
              <div className="hero-metric-icon">
                <RiGroupLine size={14} color="rgba(255,255,255,0.85)" />
              </div>
              <div>
                <p className="hero-metric-value">{resumen?.clientasConDeuda || 0}</p>
                <p className="hero-metric-label">
                  {resumen?.clientasConDeuda === 1 ? 'Deudora' : 'Deudoras'}
                </p>
              </div>
            </div>

            <div className="hero-metric-sep" />

            <div className="hero-metric">
              <div className="hero-metric-icon">
                <RiGroupLine size={14} color="rgba(255,255,255,0.85)" />
              </div>
              <div>
                <p className="hero-metric-value">{resumen?.totalClientas || 0}</p>
                <p className="hero-metric-label">Total clientas</p>
              </div>
            </div>

            <div className="hero-metric-sep" />

            <Link to="/clientas" className="hero-ver-btn">
              <span>Ver detalle</span>
              <RiArrowRightLine size={12} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Accesos Rápidos ── */}
      <section className="dashboard-section">
        <div className="section-head">
          <RiGridLine size={18} />
          <h2>Accesos Rápidos</h2>
        </div>

        <div className="menu-grid">
          {menuOptions.map((option, i) => (
            <Link
              key={i}
              to={option.to}
              className="menu-card"
              style={{ '--card-color': option.color, '--card-bg': option.bgColor }}
            >
              {option.badge && (
                <div className="menu-badge" style={{ background: option.color }}>
                  {option.badge}
                </div>
              )}
              <div className="menu-icon-wrap" style={{ background: option.bgColor }}>
                {React.cloneElement(option.icon, { size: 26 })}
              </div>
              <div className="menu-text">
                <p className="menu-title">{option.title}</p>
                <p className="menu-subtitle">{option.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Quick Links ── */}
      {/* <section className="dashboard-section">
        <div className="quick-links-row">
          <Link to="/clientas" className="quick-link-card">
            <div className="quick-link-icon" style={{ background: '#EFF6FF' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <span className="quick-link-text">Nueva Clienta</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>

          <Link to="/gastos" className="quick-link-card">
            <div className="quick-link-icon" style={{ background: '#FFF3E0' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFA726" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
            <span className="quick-link-text">Nuevo Gasto</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </section> */}

      {/* ── Movimientos Recientes ── */}
      <section className="dashboard-section">
        <div className="section-head">
          <RiTimeLine size={18} />
          <h2>Movimientos Recientes</h2>
          <Link to="/movimientos" className="section-ver-todos">Ver todos</Link>
        </div>

        {movimientosRecientes.length === 0 ? (
          <div className="dashboard-empty">
            <RiTimeLine size={40} strokeWidth={1.5} />
            <p>No hay movimientos recientes</p>
            <span>Los movimientos de los últimos 7 días aparecerán aquí</span>
          </div>
        ) : (
          <div className="recent-movements-list">
            {movimientosRecientes.slice(0, 8).map((mov) => {
              const esCargo =
                mov.tipo === 'CARGO' ||
                mov.tipo === 'cargo' ||
                mov.tipo === 'venta';
              const clientaNombre =
                mov.clienta_nombre || mov.clientas?.nombre || 'Clienta';
              const detalleLimpio = resumirMovimientoTexto(mov, categorias);

              return (
                <div
                  key={mov.id || mov.movimiento_id}
                  className={`recent-mov-item recent-mov-${esCargo ? 'venta' : 'pago'}`}
                  onClick={() => {
                    const clientaId = mov.clienta_id || mov.clientas?.id;
                    if (clientaId) {
                      navigate(`/clientas/${clientaId}`);
                    } else {
                      navigate('/movimientos');
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div
                    className={`recent-mov-badge badge-${esCargo ? 'venta' : 'pago'}`}
                  >
                    {esCargo ? (
                      <RiArrowDownLine size={14} strokeWidth={2.5} />
                    ) : (
                      <RiArrowUpLine size={14} strokeWidth={2.5} />
                    )}
                  </div>
                  <div className="recent-mov-info">
                    <p className="recent-mov-name">{clientaNombre}</p>
                    <p className="recent-mov-desc">
                      {esCargo ? 'Venta' : 'Pago'}
                      {detalleLimpio && detalleLimpio !== 'Pago' && detalleLimpio !== 'Venta' && ` • ${detalleLimpio}`}
                    </p>
                  </div>
                  <div className="recent-mov-right">
                    <p
                      className={`recent-mov-amount amount-${esCargo ? 'venta' : 'pago'}`}
                    >
                      {esCargo ? '+' : '-'}
                      {formatCurrency(mov.monto)}
                    </p>
                    <p className="recent-mov-date">{formatDate(mov.fecha)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Footer de seguridad ── */}
      <section className="dashboard-section">
        <div className="dashboard-security-footer">
          <div className="security-icon-wrap">
            <RiShieldCheckLine size={20} color="#4CAF50" />
          </div>
          <div>
            <p className="security-title">Sistema seguro y confiable</p>
            <p className="security-subtitle">Datos sincronizados en la nube.</p>
          </div>
        </div>
      </section>

      <div style={{ height: 24 }} />
    </div>
  );
}
