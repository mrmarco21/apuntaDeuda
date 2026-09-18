import React, { useEffect, useState } from 'react';
import {
  RiCloseLine,
  RiFileTextLine,
  RiUser3Line,
  RiShieldKeyholeLine,
  RiWhatsappLine,
  RiSignalTowerLine,
  RiRadioButtonLine,
  RiAlertLine,
  RiFlashlightLine,
  RiCheckboxCircleLine,
  RiMapPinLine,
  RiGlobalLine,
} from 'react-icons/ri';
import { superadminService } from '../../../../services/superadminService';
import { auditService } from '../../../../services/auditService';
import { formatTiempoRelativo, generarLinkWhatsApp, obtenerInfoNavegador } from '../../../../utils/helpers';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner/LoadingSpinner';
import './ModalDetalleNegocio.css';

export default function ModalDetalleNegocio({ negocioId, onClose, onlineUsers = [] }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [accesos, setAccesos] = useState([]);
  const [tabActiva, setTabActiva] = useState('resumen'); // 'resumen' | 'usuarios' | 'logins'

  useEffect(() => {
    async function loadData() {
      if (!negocioId) return;
      try {
        setLoading(true);
        const [res, logList] = await Promise.all([
          superadminService.obtenerDetalleNegocioAmpliado(negocioId),
          auditService.obtenerAccesosPorNegocio(negocioId, 15),
        ]);
        setData(res);
        setAccesos(logList);
      } catch (err) {
        console.error('Error al cargar detalle de negocio:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [negocioId]);

  if (!negocioId) return null;

  const negocio = data?.negocio;
  const usuarios = data?.usuarios || [];
  const totalClientas = data?.totalClientas || 0;
  const ultimoUso = data?.ultimoUso;

  // Verificar si algún usuario del negocio está online
  const usuariosOnlineNegocio = onlineUsers.filter(
    (u) => u.negocio_id === negocioId || u.negocio_nombre === negocio?.nombre
  );
  const estaOnline = usuariosOnlineNegocio.length > 0;

  const linkWs = negocio?.whatsapp
    ? generarLinkWhatsApp({
        numero: negocio.whatsapp,
        nombreNegocio: negocio.nombre,
        estadoSuscripcion: negocio.estado_suscripcion,
        fechaVencimiento: negocio.fecha_vencimiento,
      })
    : null;

  return (
    <div className="modal-overlay modal-detalle-negocio-overlay" onClick={onClose}>
      <div className="modal-card modal-detalle-negocio-card" onClick={(e) => e.stopPropagation()}>
        {/* Header del Modal */}
        <div className="modal-header-detalle">
          <div className="negocio-header-info">
            <div className="negocio-header-avatar">
              {(negocio?.nombre || 'N').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="negocio-header-title-row">
                <h2 className="negocio-header-title">
                  {negocio?.nombre || (loading ? 'Cargando Negocio...' : 'Negocio')}
                </h2>
                <span
                  className={`admin-status-pill ${
                    negocio?.activo !== false ? 'pill-activo' : 'pill-inactivo'
                  }`}
                >
                  {negocio?.activo !== false ? 'Servicio Activo' : 'Pausado'}
                </span>

                {estaOnline ? (
                  <span className="presence-badge online" title="Usuarios navegando en este negocio">
                    <span className="pulse-dot" /> En Línea ({usuariosOnlineNegocio.length})
                  </span>
                ) : (
                  <span className="presence-badge offline">Offline</span>
                )}
              </div>
              <p className="negocio-header-sub">
                ID Referencia: <code>{negocioId}</code> • Registrado el:{' '}
                {negocio?.created_at ? new Date(negocio.created_at).toLocaleDateString('es-PE') : 'N/A'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
            <RiCloseLine size={24} />
          </button>
        </div>

        {loading ? (
          <div className="modal-detalle-loading">
            <LoadingSpinner screen="modal" text="Cargando ficha técnica del negocio..." />
          </div>
        ) : (
          <>
            {/* Navegación por pestañas */}
            <div className="modal-tabs-nav">
              <button
                className={`tab-btn ${tabActiva === 'resumen' ? 'active' : ''}`}
                onClick={() => setTabActiva('resumen')}
              >
                <RiFileTextLine size={16} /> <span>Ficha y Suscripción</span>
              </button>
              <button
                className={`tab-btn ${tabActiva === 'usuarios' ? 'active' : ''}`}
                onClick={() => setTabActiva('usuarios')}
              >
                <RiUser3Line size={16} /> <span>Usuarios ({usuarios.length})</span>
              </button>
              <button
                className={`tab-btn ${tabActiva === 'logins' ? 'active' : ''}`}
                onClick={() => setTabActiva('logins')}
              >
                <RiShieldKeyholeLine size={16} /> <span>Historial de Logins ({accesos.length})</span>
              </button>
            </div>

            {/* Contenido según pestaña */}
            <div className="modal-tabs-content">
              {tabActiva === 'resumen' && (
                <div className="tab-pane-resumen">
                  <div className="kpis-grid-mini">
                    <div className="kpi-mini-card indigo">
                      <span className="kpi-label">Plan / Suscripción</span>
                      <span className="kpi-val text-capitalize">{negocio?.plan || 'Mensual'}</span>
                      <span className="kpi-sub">
                        {negocio?.estado_suscripcion === 'vitalicio'
                          ? 'Acceso Ilimitado'
                          : negocio?.fecha_vencimiento
                          ? `Vence: ${new Date(negocio.fecha_vencimiento).toLocaleDateString('es-PE')}`
                          : 'Sin fecha límite'}
                      </span>
                    </div>

                    <div className="kpi-mini-card green">
                      <span className="kpi-label">Volumen de Adopción</span>
                      <span className="kpi-val">{totalClientas} clientas</span>
                      <span className="kpi-sub">Registradas en el negocio</span>
                    </div>

                    <div className="kpi-mini-card orange">
                      <span className="kpi-label">Último Uso del Sistema</span>
                      <span className="kpi-val">
                        {formatTiempoRelativo(ultimoUso, 'Sin actividad')}
                      </span>
                      <span className="kpi-sub flex-icon-sub">
                        {negocio?.riesgo_abandono === 'alto' ? (
                          <>
                            <RiAlertLine size={13} className="text-danger-icon" /> Riesgo Alto (+14d inactivo)
                          </>
                        ) : negocio?.riesgo_abandono === 'medio' ? (
                          <>
                            <RiFlashlightLine size={13} className="text-warning-icon" /> Riesgo Medio (+7d inactivo)
                          </>
                        ) : (
                          <>
                            <RiCheckboxCircleLine size={13} className="text-success-icon" /> Uso Normal
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Sección de Contacto por WhatsApp */}
                  <div className="presence-section-card margin-bottom-md">
                    <h3 className="flex-card-title">
                      <RiWhatsappLine size={18} className="icon-ws-title" /> Contacto Comercial Directo
                    </h3>
                    {negocio?.whatsapp ? (
                      <div className="ws-contact-row">
                        <span>Número de WhatsApp registrado: <strong>+{negocio.whatsapp}</strong></span>
                        <a
                          href={linkWs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ws-modal"
                        >
                          <RiWhatsappLine size={18} /> Enviar Mensaje por WhatsApp
                        </a>
                      </div>
                    ) : (
                      <p className="no-users-online">
                        Este negocio no tiene registrado número de WhatsApp de contacto. Puedes agregarlo desde la opción de Editar.
                      </p>
                    )}
                  </div>

                  {/* Estado de Presencia en Vivo */}
                  <div className="presence-section-card">
                    <h3 className="flex-card-title">
                      <RiSignalTowerLine size={18} className="icon-live-title" /> Usuarios Conectados Actualmente
                    </h3>
                    {usuariosOnlineNegocio.length === 0 ? (
                      <p className="no-users-online">
                        Ningún usuario de este negocio está navegando en este momento.
                      </p>
                    ) : (
                      <div className="online-users-list">
                        {usuariosOnlineNegocio.map((u, idx) => (
                          <div className="online-user-item" key={idx}>
                            <div className="online-avatar">{(u.nombre || u.email || 'U').charAt(0).toUpperCase()}</div>
                            <div className="online-details">
                              <span className="online-name">{u.nombre || u.email}</span>
                              <div className="online-sub-info">
                                <span className="online-page">
                                  Navegando en: <code>{u.current_page || '/'}</code>
                                </span>
                                {u.user_agent && (
                                  <span className="online-browser" title={u.user_agent}>
                                    <RiGlobalLine size={13} /> {obtenerInfoNavegador(u.user_agent)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="online-badge-live">
                              <RiRadioButtonLine size={12} className="pulse-icon" /> En vivo
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tabActiva === 'usuarios' && (
                <div className="tab-pane-usuarios">
                  {usuarios.length === 0 ? (
                    <div className="empty-tab">No hay usuarios creados para este negocio.</div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th>Rol</th>
                          <th>Estado Cuenta</th>
                          <th>Conexión Actual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.map((u) => {
                          const userOnline = onlineUsers.some((ou) => ou.user_id === u.auth_user_id || ou.email === u.nombre);
                          return (
                            <tr key={u.id}>
                              <td>
                                <div className="table-user-cell">
                                  <div className="table-avatar">{(u.nombre || 'U').charAt(0).toUpperCase()}</div>
                                  <div>
                                    <span className="user-name">{u.nombre}</span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`role-badge ${u.rol}`}>{u.rol || 'admin'}</span>
                              </td>
                              <td>
                                <span className={`admin-status-pill ${u.activo !== false ? 'pill-activo' : 'pill-inactivo'}`}>
                                  {u.activo !== false ? 'Habilitado' : 'Desactivado'}
                                </span>
                              </td>
                              <td>
                                {userOnline ? (
                                  <span className="presence-badge online"><span className="pulse-dot"/> En línea</span>
                                ) : (
                                  <span className="presence-badge offline">Desconectado</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {tabActiva === 'logins' && (
                <div className="tab-pane-logins">
                  {accesos.length === 0 ? (
                    <div className="empty-tab">
                      No se han registrado accesos recientes para esta tienda.
                    </div>
                  ) : (
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Usuario / Email</th>
                          <th>Fecha y Hora</th>
                          <th>Navegador / Agente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accesos.map((acc) => (
                          <tr key={acc.id}>
                            <td>
                              <span className="user-name">{acc.nombre_usuario || acc.email}</span>
                            </td>
                            <td>
                              {new Date(acc.created_at).toLocaleString('es-PE', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td>
                              <span className="agent-text flex-icon-sub" title={acc.user_agent}>
                                <RiGlobalLine size={14} /> {acc.user_agent ? obtenerInfoNavegador(acc.user_agent) : 'Navegador Web'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

