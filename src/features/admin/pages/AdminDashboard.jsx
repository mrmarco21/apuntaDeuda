import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  RiRefreshLine,
  RiBuilding4Line,
  RiTimeLine,
  RiAlertLine,
  RiSignalTowerLine,
  RiWhatsappLine,
  RiFileTextLine,
  RiInfinityLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiFlashlightLine,
  RiShieldKeyholeLine,
  RiStore2Line,
  RiMapPinLine,
  RiPhoneLine,
  RiMore2Line,
  RiUser3Line,
} from 'react-icons/ri';
import { superadminService } from '../../../services/superadminService';
import { presenceService } from '../../../services/presenceService';
import { auditService } from '../../../services/auditService';
import { formatTiempoRelativo, generarLinkWhatsApp } from '../../../utils/helpers';
import LoadingSpinner from '../../../components/ui/LoadingSpinner/LoadingSpinner';
import ModalDetalleNegocio from '../components/ModalDetalleNegocio/ModalDetalleNegocio';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalNegocios: 0,
    negociosActivos: 0,
    negociosInactivos: 0,
    totalUsuariosSystem: 0,
    totalClientasRegistradas: 0,
    porVencerCount: 0,
    vencidosCount: 0,
    enRiesgoCount: 0,
    negocios: [],
  });
  const [loginsRecientes, setLoginsRecientes] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [negocioSeleccionadoId, setNegocioSeleccionadoId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [openMenuId]);

  // Escuchar cambios de presencia en tiempo real
  useEffect(() => {
    const unsubscribe = presenceService.subscribePresence((users) => {
      setOnlineUsers(users);
    });

    const interval = setInterval(() => {
      setOnlineUsers(presenceService.getOnlineUsers());
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const cargarDashboard = async () => {
    try {
      setLoading(true);
      const [consolidados, logs] = await Promise.all([
        superadminService.obtenerEstadisticasConsolidadas(),
        auditService.obtenerUltimosAccesos(8),
      ]);
      setStats(consolidados);
      setLoginsRecientes(logs);
    } catch (err) {
      console.error('Error al cargar datos del dashboard superadmin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDashboard();
  }, []);

  const negocios = stats.negocios || [];
  const ultimosNegocios = negocios.slice(0, 6);

  return (
    <div className="admin-dashboard-page">
      {/* Header del Dashboard Superadmin */}
      <div className="admin-dash-header">
        <div>
          <span className="admin-dash-badge">Panel General Superadmin</span>
          <h1 className="admin-dash-title">Gestión General de la Plataforma SaaS</h1>
          <p className="admin-dash-desc">
            Supervisa suscripciones, riesgo de abandono de tiendas, presencia en tiempo real e inicios de sesión.
          </p>
        </div>
        <div className="admin-dash-actions">
          <button onClick={cargarDashboard} className="admin-btn-secondary" title="Recargar métricas">
            <RiRefreshLine size={18} />
            <span>Actualizar Datos</span>
          </button>

          <Link to="/admin/negocios" className="admin-btn-primary">
            <RiBuilding4Line size={18} />
            <span>Gestionar Negocios</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="admin-dash-loading">
          <LoadingSpinner screen="admin" text="Cargando resumen de la plataforma..." />
        </div>
      ) : (
        <>
          {/* Métricas / KPIs Principales para SaaS */}
          <div className="admin-dash-kpis">
            <div className="admin-kpi-card indigo">
              <div className="kpi-icon indigo">
                <RiBuilding4Line size={24} />
              </div>
              <div className="kpi-content">
                <span className="kpi-title">Negocios Registrados</span>
                <span className="kpi-number">{stats.totalNegocios}</span>
                <span className="kpi-hint">
                  {stats.negociosActivos} activos • {stats.totalClientasRegistradas || 0} clientas en total
                </span>
              </div>
            </div>

            <div className="admin-kpi-card orange">
              <div className="kpi-icon orange">
                <RiTimeLine size={24} />
              </div>
              <div className="kpi-content">
                <span className="kpi-title">Suscripciones Por Vencer</span>
                <span className="kpi-number">{stats.porVencerCount}</span>
                <span className="kpi-hint">Vencen en los próximos 7 días</span>
              </div>
            </div>

            <div className="admin-kpi-card red">
              <div className="kpi-icon red">
                <RiAlertLine size={24} />
              </div>
              <div className="kpi-content">
                <span className="kpi-title">Riesgo de Abandono</span>
                <span className="kpi-number">{stats.enRiesgoCount}</span>
                <span className="kpi-hint">Sin uso en +7 o +14 días</span>
              </div>
            </div>

            <div className="admin-kpi-card live-card">
              <div className="kpi-icon live">
                <span className="kpi-live-dot" />
              </div>
              <div className="kpi-content">
                <span className="kpi-title">Tiendas Navegando Ahora</span>
                <span className="kpi-number text-live">{onlineUsers.length}</span>
                <span className="kpi-hint flex-icon-hint">
                  <RiSignalTowerLine size={14} className="live-icon-inline" /> En línea en tiempo real
                </span>
              </div>
            </div>
          </div>

          {/* Grid de Secciones */}
          <div className="admin-dash-grid">
            {/* Columna Izquierda: Negocios y Estado de Servicio */}
            <div className="admin-dash-main-col">
              <div className="admin-dash-section">
                <div className="section-header">
                  <div>
                    <h2>Cuentas de Negocio Registradas</h2>
                    <p className="section-sub">
                      Suscripción, alertas de riesgo de abandono y presencia en tiempo real.
                    </p>
                  </div>
                  <Link to="/admin/negocios" className="section-link">
                    Ver todos ({negocios.length}) &rarr;
                  </Link>
                </div>

                {ultimosNegocios.length === 0 ? (
                  <div className="admin-dash-empty">
                    <p>No hay negocios registrados aún.</p>
                  </div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Negocio</th>
                          <th>Clientes</th>
                          <th>Presencia</th>
                          <th>Suscripción</th>
                          <th>Riesgo Abandono</th>
                          <th>Último Uso</th>
                          <th className="th-actions-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ultimosNegocios.map((n, index) => {
                          const usuariosOnline = onlineUsers.filter(
                            (u) =>
                              (u.negocio_id && n.id && String(u.negocio_id).toLowerCase() === String(n.id).toLowerCase()) ||
                              (u.negocio_nombre && n.nombre && String(u.negocio_nombre).trim().toLowerCase() === String(n.nombre).trim().toLowerCase())
                          );
                          const estaOnline = usuariosOnline.length > 0;
                          const linkWs = n.whatsapp
                            ? generarLinkWhatsApp({
                                numero: n.whatsapp,
                                nombreNegocio: n.nombre,
                                estadoSuscripcion: n.estado_suscripcion,
                                fechaVencimiento: n.fecha_vencimiento,
                              })
                            : null;

                          return (
                            <tr key={n.id}>
                              <td>
                                <div className="table-negocio-cell">
                                  <div className="table-avatar">
                                    {(n.nombre || 'N').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="table-negocio-info">
                                    <span className="table-negocio-name">{n.nombre}</span>
                                    {n.whatsapp && (
                                      <span className="table-negocio-sub">
                                        <RiPhoneLine size={12} /> {n.whatsapp}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="table-clientes-badge" title={`${n.total_clientas || 0} clientas registradas`}>
                                  <RiUser3Line size={13} />
                                  <span>{n.total_clientas || 0}</span>
                                </span>
                              </td>
                              <td>
                                {estaOnline ? (
                                  <span className="presence-badge online" title={`Navegando en: ${usuariosOnline[0]?.current_page || '/'}`}>
                                    <span className="pulse-dot" /> En Línea
                                  </span>
                                ) : (
                                  <span className="presence-badge offline">Offline</span>
                                )}
                              </td>
                              <td>
                                {n.estado_suscripcion === 'vitalicio' ? (
                                  <span className="sub-badge vitalicio">
                                    <RiInfinityLine size={13} /> Vitalicio
                                  </span>
                                ) : n.estado_suscripcion === 'por_vencer' ? (
                                  <span className="sub-badge por-vencer">
                                    <RiTimeLine size={13} /> Vence en {n.dias_restantes_suscripcion}d
                                  </span>
                                ) : n.estado_suscripcion === 'vencido' ? (
                                  <span className="sub-badge vencido">
                                    <RiErrorWarningLine size={13} /> Vencido
                                  </span>
                                ) : (
                                  <span className="sub-badge vigente">
                                    <RiCheckboxCircleLine size={13} /> Vigente
                                  </span>
                                )}
                              </td>
                              <td>
                                {n.riesgo_abandono === 'alto' ? (
                                  <span className="risk-badge alto" title="Más de 14 días sin usar el sistema">
                                    <RiAlertLine size={13} /> Alto (+14d)
                                  </span>
                                ) : n.riesgo_abandono === 'medio' ? (
                                  <span className="risk-badge medio" title="Entre 7 y 14 días sin usar el sistema">
                                    <RiFlashlightLine size={13} /> Medio (+7d)
                                  </span>
                                ) : (
                                  <span className="risk-badge normal">
                                    <RiCheckboxCircleLine size={13} /> Normal
                                  </span>
                                )}
                              </td>
                              <td>
                                <span className="table-tiempo-relativo" title={n.ultimo_uso ? new Date(n.ultimo_uso).toLocaleString('es-PE') : ''}>
                                  {formatTiempoRelativo(n.ultimo_uso, 'Sin actividad')}
                                </span>
                              </td>
                              <td className="table-actions-td">
                                <div
                                  className="table-menu-wrap"
                                  ref={openMenuId === n.id ? menuRef : null}
                                >
                                  <button
                                    type="button"
                                    className={`btn-table-dots ${openMenuId === n.id ? 'active' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === n.id ? null : n.id);
                                    }}
                                    title="Más opciones"
                                    aria-label={`Opciones de ${n.nombre}`}
                                  >
                                    <RiMore2Line size={18} />
                                  </button>

                                  {openMenuId === n.id && (
                                    <div
                                      className={`table-dropdown-menu ${index >= 3 ? 'dropdown-up' : 'dropdown-down'}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {linkWs ? (
                                        <a
                                          href={linkWs}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="table-dropdown-item item-ws"
                                          onClick={() => setOpenMenuId(null)}
                                        >
                                          <RiWhatsappLine size={16} />
                                          <span>WhatsApp</span>
                                        </a>
                                      ) : (
                                        <div
                                          className="table-dropdown-item item-ws disabled"
                                          title="No tiene número de WhatsApp registrado"
                                        >
                                          <RiWhatsappLine size={16} />
                                          <span>WhatsApp (Sin número)</span>
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        className="table-dropdown-item item-ficha"
                                        onClick={() => {
                                          setNegocioSeleccionadoId(n.id);
                                          setOpenMenuId(null);
                                        }}
                                      >
                                        <RiFileTextLine size={16} />
                                        <span>Ver Ficha</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Presencia e Historial de Inicios de Sesión */}
            <div className="admin-dash-side-col">
              {/* Panel de Presencia en Vivo */}
              <div className="side-card presence-side-card">
                <div className="side-card-header">
                  <h3 className="flex-icon-title">
                    <RiSignalTowerLine size={16} className="text-live-icon" /> Navegando en Tiempo Real
                  </h3>
                  <span className="live-counter-badge">{onlineUsers.length} online</span>
                </div>

                {onlineUsers.length === 0 ? (
                  <div className="side-card-empty">
                    <p>No hay usuarios o tiendas navegando en este momento.</p>
                  </div>
                ) : (
                  <div className="side-online-list">
                    {onlineUsers.map((u, idx) => (
                      <div className="side-online-item" key={idx}>
                        <div className="side-online-avatar">
                          {(u.nombre || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="side-online-info">
                          <span className="side-online-user">{u.nombre || u.email}</span>
                          <span className="side-online-store">
                            <RiStore2Line size={12} /> {u.negocio_nombre}
                          </span>
                          <span className="side-online-path">
                            <RiMapPinLine size={11} /> <code>{u.current_page || '/'}</code>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Panel de Inicios de Sesión Recientes (Login Audit Log) */}
              <div className="side-card log-side-card">
                <div className="side-card-header">
                  <h3 className="flex-icon-title">
                    <RiShieldKeyholeLine size={16} className="text-indigo-icon" /> Inicios de Sesión Recientes
                  </h3>
                  <span className="side-card-badge">Auditoría</span>
                </div>

                {loginsRecientes.length === 0 ? (
                  <div className="side-card-empty">
                    <p>No hay inicios de sesión registrados aún.</p>
                  </div>
                ) : (
                  <div className="side-logs-list">
                    {loginsRecientes.map((log) => (
                      <div className="side-log-item" key={log.id}>
                        <div className="side-log-avatar">
                          {(log.nombre || log.email || 'L').charAt(0).toUpperCase()}
                        </div>
                        <div className="side-log-info">
                          <span className="side-log-user">{log.nombre || log.email}</span>
                          <span className="side-log-store">
                            <RiStore2Line size={12} /> {log.negocioNombre}
                          </span>
                          <span className="side-log-time">{formatTiempoRelativo(log.fecha)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Detalle de Negocio */}
      {negocioSeleccionadoId && (
        <ModalDetalleNegocio
          negocioId={negocioSeleccionadoId}
          onClose={() => setNegocioSeleccionadoId(null)}
          onlineUsers={onlineUsers}
        />
      )}
    </div>
  );
}

