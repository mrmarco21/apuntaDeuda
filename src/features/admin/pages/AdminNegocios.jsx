import React, { useState, useEffect } from 'react';
import {
  RiInfinityLine,
  RiTimeLine,
  RiErrorWarningLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiFlashlightLine,
  RiWhatsappLine,
  RiFileTextLine,
  RiRadioButtonLine,
  RiPauseCircleLine,
  RiCloseLine,
} from 'react-icons/ri';
import { useToast } from '../../../context/ToastContext';
import { negociosService } from '../../../services/negociosService';
import { superadminService } from '../../../services/superadminService';
import { presenceService } from '../../../services/presenceService';
import { formatTiempoRelativo, generarLinkWhatsApp } from '../../../utils/helpers';
import LoadingSpinner from '../../../components/ui/LoadingSpinner/LoadingSpinner';
import ModalNegocio from '../components/ModalNegocio/ModalNegocio';
import ModalDetalleNegocio from '../components/ModalDetalleNegocio/ModalDetalleNegocio';
import './AdminNegocios.css';

export default function AdminNegocios() {
  const toast = useToast();
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'online' | 'por_vencer' | 'vencidos' | 'riesgo' | 'activos' | 'inactivos'
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Modal Detalle Ficha Negocio
  const [negocioFichaId, setNegocioFichaId] = useState(null);

  // Modal Confirmación al Pausar
  const [negocioAPausar, setNegocioAPausar] = useState(null);

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formActivo, setFormActivo] = useState(true);
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formPlan, setFormPlan] = useState('mensual');
  const [formFechaVencimiento, setFormFechaVencimiento] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  // Acción de cambiar estado
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

  // Presencia en vivo
  useEffect(() => {
    const unsubscribe = presenceService.subscribePresence((users) => {
      setOnlineUsers(users);
    });
    return () => unsubscribe();
  }, []);

  const cargarNegocios = async () => {
    try {
      setLoading(true);
      const data = await superadminService.obtenerNegociosConMetricas();
      setNegocios(data);
    } catch (err) {
      console.error('Error al cargar negocios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNegocios();
  }, []);

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setNegocioSeleccionado(null);
    setFormNombre('');
    setFormLogoUrl('');
    setFormActivo(true);
    setFormWhatsapp('');
    setFormPlan('mensual');
    setFormFechaVencimiento('');
    setErrorModal('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (negocio) => {
    setModoEdicion(true);
    setNegocioSeleccionado(negocio);
    setFormNombre(negocio.nombre || '');
    setFormLogoUrl(negocio.logo_url || '');
    setFormActivo(negocio.activo !== false);
    setFormWhatsapp(negocio.whatsapp || '');
    setFormPlan(negocio.plan || 'mensual');
    setFormFechaVencimiento(negocio.fecha_vencimiento || '');
    setErrorModal('');
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalAbierto(false);
    setErrorModal('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      setErrorModal('El nombre del negocio es obligatorio');
      return;
    }

    try {
      setGuardando(true);
      setErrorModal('');

      const payload = {
        nombre: formNombre,
        logo_url: formLogoUrl,
        activo: formActivo,
        whatsapp: formWhatsapp,
        plan: formPlan,
        fecha_vencimiento: formFechaVencimiento || null,
      };

      if (modoEdicion && negocioSeleccionado) {
        await negociosService.actualizarNegocio(negocioSeleccionado.id, payload);
        mostrarAlertaExito('Negocio y suscripción actualizados con éxito');
      } else {
        await negociosService.crearNegocio(payload);
        mostrarAlertaExito('Nuevo negocio registrado exitosamente');
      }

      setModalAbierto(false);
      await cargarNegocios();
    } catch (err) {
      console.error('Error al guardar negocio:', err);
      setErrorModal(err.message || 'Ocurrió un error al guardar el negocio');
      toast.error(err.message || 'Ocurrió un error al guardar el negocio');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (negocio) => {
    const nuevoEstado = !negocio.activo;
    try {
      setCambiandoEstadoId(negocio.id);
      await negociosService.toggleEstadoNegocio(negocio.id, nuevoEstado);

      setNegocios((prev) =>
        prev.map((n) => (n.id === negocio.id ? { ...n, activo: nuevoEstado } : n))
      );
      toast.success(
        `Negocio "${negocio.nombre}" ${nuevoEstado ? 'activado' : 'desactivado'} correctamente`
      );
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error('Error al actualizar el estado: ' + err.message);
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  const mostrarAlertaExito = (msg) => {
    toast.success(msg);
  };

  // Filtrado
  const negociosFiltrados = negocios.filter((n) => {
    const coincideTexto = (n.nombre || '')
      .toLowerCase()
      .includes(filtroTexto.toLowerCase().trim());

    const estaOnline = onlineUsers.some(
      (u) => u.negocio_id === n.id || u.negocio_nombre === n.nombre
    );

    if (filtroEstado === 'online') return coincideTexto && estaOnline;
    if (filtroEstado === 'por_vencer') return coincideTexto && n.estado_suscripcion === 'por_vencer';
    if (filtroEstado === 'vencidos') return coincideTexto && n.estado_suscripcion === 'vencido';
    if (filtroEstado === 'riesgo') return coincideTexto && (n.riesgo_abandono === 'alto' || n.riesgo_abandono === 'medio');
    if (filtroEstado === 'activos') return coincideTexto && n.activo !== false;
    if (filtroEstado === 'inactivos') return coincideTexto && n.activo === false;

    return coincideTexto;
  });

  const totalNegocios = negocios.length;
  const totalActivos = negocios.filter((n) => n.activo !== false).length;
  const totalPorVencer = negocios.filter((n) => n.estado_suscripcion === 'por_vencer').length;
  const totalEnRiesgo = negocios.filter((n) => n.riesgo_abandono === 'alto' || n.riesgo_abandono === 'medio').length;
  const totalOnline = negocios.filter((n) =>
    onlineUsers.some((u) => u.negocio_id === n.id || u.negocio_nombre === n.nombre)
  ).length;

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Sin fecha';
    try {
      const fecha = new Date(fechaStr);
      return fecha.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="admin-negocios-page">
      {/* Header de la sección */}
      <div className="admin-page-header">
        <div>
          <div className="admin-badge-category">Plataforma &bull; Módulo SaaS</div>
          <h1 className="admin-page-title">Gestión de Cuentas y Suscripciones</h1>
          <p className="admin-page-desc">
            Administra los planes de suscripción, fechas de vencimiento, contacto directo por WhatsApp y alertas de riesgo de abandono.
          </p>
        </div>
        <button
          className="admin-btn-primary"
          onClick={abrirModalCrear}
          id="btn-nuevo-negocio"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nuevo Negocio</span>
        </button>
      </div>

      {/* Tarjetas de Resumen Rápido */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap icon-indigo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18"/>
              <path d="M5 21V7l8-4v18"/>
              <path d="M19 21V11l-6-4"/>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Negocios</span>
            <span className="admin-stat-value">{totalNegocios}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap icon-orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Por Vencer (7d)</span>
            <span className="admin-stat-value text-orange">{totalPorVencer}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap icon-red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Riesgo Abandono</span>
            <span className="admin-stat-value text-red">{totalEnRiesgo}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap icon-live">
            <span className="pulse-dot" />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">En Línea Ahora</span>
            <span className="admin-stat-value text-live">{totalOnline}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="admin-filters-bar">
        <div className="admin-search-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar negocio por nombre..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="admin-search-input"
          />
          {filtroTexto && (
            <button className="admin-clear-search-btn" onClick={() => setFiltroTexto('')}>
              &times;
            </button>
          )}
        </div>

        <div className="admin-estado-tabs">
          <button
            className={`admin-tab-btn ${filtroEstado === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('todos')}
          >
            Todos ({totalNegocios})
          </button>
          <button
            className={`admin-tab-btn ${filtroEstado === 'online' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('online')}
          >
            <RiRadioButtonLine size={14} className="text-success-icon" /> En Línea ({totalOnline})
          </button>
          <button
            className={`admin-tab-btn ${filtroEstado === 'por_vencer' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('por_vencer')}
          >
            <RiTimeLine size={14} className="text-warning-icon" /> Por Vencer ({totalPorVencer})
          </button>
          <button
            className={`admin-tab-btn ${filtroEstado === 'riesgo' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('riesgo')}
          >
            <RiAlertLine size={14} className="text-danger-icon" /> En Riesgo ({totalEnRiesgo})
          </button>
        </div>
      </div>

      {/* Listado de Negocios */}
      {loading ? (
        <div className="admin-loading-wrap">
          <LoadingSpinner screen="admin" text="Cargando negocios y suscripciones..." />
        </div>
      ) : negociosFiltrados.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 21h18"/>
              <path d="M5 21V7l8-4v18"/>
              <path d="M19 21V11l-6-4"/>
            </svg>
          </div>
          <h3>No se encontraron negocios</h3>
          <p>
            {filtroTexto
              ? `No hay coincidencias para "${filtroTexto}". Intenta con otro término.`
              : 'Aún no has registrado negocios en la plataforma.'}
          </p>
          {!filtroTexto && (
            <button className="admin-btn-primary" onClick={abrirModalCrear}>
              Registrar Primer Negocio
            </button>
          )}
        </div>
      ) : (
        <div className="admin-negocios-grid">
          {negociosFiltrados.map((negocio) => {
            const esActivo = negocio.activo !== false;
            const inicial = (negocio.nombre || 'N').charAt(0).toUpperCase();

            const usuariosOnline = onlineUsers.filter(
              (u) => u.negocio_id === negocio.id || u.negocio_nombre === negocio.nombre
            );
            const estaOnline = usuariosOnline.length > 0;

            const linkWs = negocio.whatsapp
              ? generarLinkWhatsApp({
                  numero: negocio.whatsapp,
                  nombreNegocio: negocio.nombre,
                  estadoSuscripcion: negocio.estado_suscripcion,
                  fechaVencimiento: negocio.fecha_vencimiento,
                })
              : null;

            return (
              <div key={negocio.id} className={`admin-negocio-card ${!esActivo ? 'inactivo' : ''}`}>
                <div className="admin-card-header">
                  <div className="admin-negocio-logo-wrap">
                    {negocio.logo_url ? (
                      <img
                        src={negocio.logo_url}
                        alt={negocio.nombre}
                        className="admin-negocio-logo-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="admin-negocio-avatar-placeholder">
                        {inicial}
                      </div>
                    )}
                  </div>

                  <div className="admin-card-badges">
                    {estaOnline ? (
                      <span className="presence-badge online" title={`Navegando en: ${usuariosOnline[0]?.current_page || '/'}`}>
                        <span className="pulse-dot" /> En Línea
                      </span>
                    ) : (
                      <span className="presence-badge offline">Offline</span>
                    )}

                    <span className={`admin-status-pill ${esActivo ? 'pill-activo' : 'pill-inactivo'}`}>
                      <span className="pill-dot" />
                      {esActivo ? 'Activo' : 'Pausado'}
                    </span>
                  </div>
                </div>

                <div className="admin-card-body">
                  <h3 className="admin-negocio-nombre" title={negocio.nombre}>
                    {negocio.nombre}
                  </h3>

                  {/* Resumen de Métricas SaaS en Card */}
                  <div className="negocio-card-kpis">
                    <div className="card-kpi-item">
                      <span className="card-kpi-val">{negocio.total_usuarios || 0}</span>
                      <span className="card-kpi-lbl">Usuarios</span>
                    </div>

                    <div className="card-kpi-item">
                      <span className="card-kpi-val">{negocio.total_clientas || 0}</span>
                      <span className="card-kpi-lbl">Clientas</span>
                    </div>

                    <div className="card-kpi-item">
                      <span className="card-kpi-val text-muted">
                        {formatTiempoRelativo(negocio.ultimo_uso, 'Sin actividad')}
                      </span>
                      <span className="card-kpi-lbl">Último Uso</span>
                    </div>
                  </div>

                  <div className="admin-negocio-meta">
                    {/* Fila de Suscripción */}
                    <div className="meta-row align-center">
                      <span className="meta-label">Suscripción:</span>
                      <div>
                        {negocio.estado_suscripcion === 'vitalicio' ? (
                          <span className="sub-badge vitalicio">
                            <RiInfinityLine size={13} /> Vitalicio
                          </span>
                        ) : negocio.estado_suscripcion === 'por_vencer' ? (
                          <span className="sub-badge por-vencer">
                            <RiTimeLine size={13} /> Vence en {negocio.dias_restantes_suscripcion}d
                          </span>
                        ) : negocio.estado_suscripcion === 'vencido' ? (
                          <span className="sub-badge vencido">
                            <RiErrorWarningLine size={13} /> Vencido
                          </span>
                        ) : (
                          <span className="sub-badge vigente">
                            <RiCheckboxCircleLine size={13} /> {formatearFecha(negocio.fecha_vencimiento)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila de Alerta de Riesgo de Abandono */}
                    {negocio.riesgo_abandono !== 'normal' && (
                      <div className="meta-row align-center margin-top-sm">
                        <span className="meta-label">Uso del sistema:</span>
                        <div>
                          {negocio.riesgo_abandono === 'alto' ? (
                            <span className="risk-badge alto" title="Más de 14 días sin usar la plataforma">
                              <RiAlertLine size={13} /> Alto (+14d inactivo)
                            </span>
                          ) : (
                            <span className="risk-badge medio" title="Entre 7 y 14 días sin usar la plataforma">
                              <RiFlashlightLine size={13} /> Medio (+7d)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="meta-row">
                      <span className="meta-label">Fecha de creación:</span>
                      <span className="meta-value">{formatearFecha(negocio.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="admin-card-footer">
                  {/* Botón WhatsApp Directo */}
                  {linkWs ? (
                    <a
                      href={linkWs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-action-btn btn-whatsapp"
                      title="Enviar mensaje directo por WhatsApp"
                    >
                      <RiWhatsappLine size={16} /> <span>WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      className="admin-action-btn btn-whatsapp disabled"
                      onClick={() => abrirModalEditar(negocio)}
                      title="Agregar número de WhatsApp para contacto directo"
                    >
                      <RiWhatsappLine size={16} /> <span>+ WhatsApp</span>
                    </button>
                  )}

                  {/* Botón Ver Ficha Detallada */}
                  <button
                    className="admin-action-btn btn-ver-ficha"
                    onClick={() => setNegocioFichaId(negocio.id)}
                    title="Ver ficha técnica completa del negocio"
                  >
                    <RiFileTextLine size={15} /> <span>Ficha</span>
                  </button>

                  {/* Botón Activar / Pausar */}
                  <button
                    className={`admin-action-btn ${esActivo ? 'btn-desactivar' : 'btn-activar'}`}
                    onClick={() => {
                      if (esActivo) {
                        setNegocioAPausar(negocio);
                      } else {
                        handleToggleEstado(negocio);
                      }
                    }}
                    disabled={cambiandoEstadoId === negocio.id}
                    title={esActivo ? 'Desactivar negocio' : 'Activar negocio'}
                  >
                    {cambiandoEstadoId === negocio.id ? (
                      <span className="admin-mini-spinner" />
                    ) : esActivo ? (
                      <span>Pausar</span>
                    ) : (
                      <span>Activar</span>
                    )}
                  </button>

                  {/* Botón Editar */}
                  <button
                    className="admin-action-btn btn-editar"
                    onClick={() => abrirModalEditar(negocio)}
                    title="Editar información del negocio"
                  >
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Negocio */}
      <ModalNegocio
        modalAbierto={modalAbierto}
        cerrarModal={cerrarModal}
        modoEdicion={modoEdicion}
        handleSubmit={handleSubmit}
        errorModal={errorModal}
        formNombre={formNombre}
        setFormNombre={setFormNombre}
        formLogoUrl={formLogoUrl}
        setFormLogoUrl={setFormLogoUrl}
        formActivo={formActivo}
        setFormActivo={setFormActivo}
        formWhatsapp={formWhatsapp}
        setFormWhatsapp={setFormWhatsapp}
        formPlan={formPlan}
        setFormPlan={setFormPlan}
        formFechaVencimiento={formFechaVencimiento}
        setFormFechaVencimiento={setFormFechaVencimiento}
        guardando={guardando}
      />

      {/* Modal Ficha Detallada de Negocio */}
      {negocioFichaId && (
        <ModalDetalleNegocio
          negocioId={negocioFichaId}
          onClose={() => setNegocioFichaId(null)}
          onlineUsers={onlineUsers}
        />
      )}

      {/* Modal de Confirmación para Pausar Negocio */}
      {negocioAPausar && (
        <div className="admin-modal-overlay" onClick={() => setNegocioAPausar(null)}>
          <div className="admin-modal-box modal-confirm-pausar" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal-header">
              <div className="confirm-modal-icon-wrap warning">
                <RiPauseCircleLine size={28} />
              </div>
              <h3>¿Pausar servicio del negocio?</h3>
              <button className="admin-modal-close" onClick={() => setNegocioAPausar(null)}>
                <RiCloseLine size={22} />
              </button>
            </div>

            <div className="confirm-modal-body">
              <p className="confirm-text">
                Estás a punto de pausar el servicio de <strong>"{negocioAPausar.nombre}"</strong>.
              </p>
              <div className="confirm-warning-box">
                <RiAlertLine size={18} className="text-warning-icon" />
                <span>
                  Los usuarios de este negocio no podrán ingresar a la plataforma ni operar hasta que el servicio sea reactivado.
                </span>
              </div>
            </div>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setNegocioAPausar(null)}
                disabled={cambiandoEstadoId === negocioAPausar.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-btn-warning"
                onClick={async () => {
                  const target = negocioAPausar;
                  setNegocioAPausar(null);
                  await handleToggleEstado(target);
                }}
                disabled={cambiandoEstadoId === negocioAPausar.id}
              >
                {cambiandoEstadoId === negocioAPausar.id ? (
                  <>
                    <span className="admin-mini-spinner" /> Pausando...
                  </>
                ) : (
                  'Sí, Pausar Servicio'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
