import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { negociosService } from '../../services/negociosService';
import LoadingSpinner from '../../components/ui/LoadingSpinner/LoadingSpinner';
import ImageUploader from '../../components/common/ImageUploader/ImageUploader';
import './AdminNegocios.css';

export default function AdminNegocios() {
  const toast = useToast();
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos'); // 'todos' | 'activos' | 'inactivos'

  // Modal Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [negocioSeleccionado, setNegocioSeleccionado] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formActivo, setFormActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');

  // Acción de cambiar estado
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

  const cargarNegocios = async () => {
    try {
      setLoading(true);
      const data = await negociosService.obtenerNegocios();
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
    setErrorModal('');
    setModalAbierto(true);
  };

  const abrirModalEditar = (negocio) => {
    setModoEdicion(true);
    setNegocioSeleccionado(negocio);
    setFormNombre(negocio.nombre || '');
    setFormLogoUrl(negocio.logo_url || '');
    setFormActivo(negocio.activo !== false);
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

      if (modoEdicion && negocioSeleccionado) {
        const actualizado = await negociosService.actualizarNegocio(negocioSeleccionado.id, {
          nombre: formNombre,
          logo_url: formLogoUrl,
          activo: formActivo,
        });

        setNegocios((prev) =>
          prev.map((n) => (n.id === negocioSeleccionado.id ? { ...n, ...actualizado } : n))
        );
        mostrarAlertaExito('Negocio actualizado con éxito');
      } else {
        const nuevo = await negociosService.crearNegocio({
          nombre: formNombre,
          logo_url: formLogoUrl,
          activo: formActivo,
        });

        setNegocios((prev) => [nuevo, ...prev]);
        mostrarAlertaExito('Nuevo negocio registrado exitosamente');
      }

      setModalAbierto(false);
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

      mostrarAlertaExito(
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

    if (filtroEstado === 'activos') {
      return coincideTexto && n.activo !== false;
    }
    if (filtroEstado === 'inactivos') {
      return coincideTexto && n.activo === false;
    }
    return coincideTexto;
  });

  const totalNegocios = negocios.length;
  const totalActivos = negocios.filter((n) => n.activo !== false).length;
  const totalInactivos = totalNegocios - totalActivos;

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
          <div className="admin-badge-category">Plataforma &bull; Módulo Principal</div>
          <h1 className="admin-page-title">Gestión de Negocios</h1>
          <p className="admin-page-desc">
            Visualiza, registra y administra todas las cuentas de negocios registradas en la plataforma.
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
          <div className="admin-stat-icon-wrap icon-green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Negocios Activos</span>
            <span className="admin-stat-value">{totalActivos}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap icon-gray">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Inactivos / Pausados</span>
            <span className="admin-stat-value">{totalInactivos}</span>
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
            <button
              className="admin-search-clear"
              onClick={() => setFiltroTexto('')}
              aria-label="Limpiar búsqueda"
            >
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
            className={`admin-tab-btn ${filtroEstado === 'activos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('activos')}
          >
            Activos ({totalActivos})
          </button>
          <button
            className={`admin-tab-btn ${filtroEstado === 'inactivos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('inactivos')}
          >
            Inactivos ({totalInactivos})
          </button>
        </div>
      </div>

      {/* Listado de Negocios */}
      {loading ? (
        <div className="admin-loading-wrap">
          <LoadingSpinner text="Cargando negocios de la plataforma..." />
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
                    <span className={`admin-status-pill ${esActivo ? 'pill-activo' : 'pill-inactivo'}`}>
                      <span className="pill-dot" />
                      {esActivo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                <div className="admin-card-body">
                  <h3 className="admin-negocio-nombre" title={negocio.nombre}>
                    {negocio.nombre}
                  </h3>

                  <div className="admin-negocio-meta">
                    <div className="meta-row">
                      <span className="meta-label">Fecha de creación:</span>
                      <span className="meta-value">{formatearFecha(negocio.created_at)}</span>
                    </div>

                    <div className="meta-row">
                      <span className="meta-label">Creado por:</span>
                      <span className="meta-value code-font" title={negocio.creado_por || 'N/A'}>
                        {negocio.creado_por
                          ? `${negocio.creado_por.substring(0, 8)}...`
                          : 'Plataforma'}
                      </span>
                    </div>

                    <div className="meta-row">
                      <span className="meta-label">ID Negocio:</span>
                      <span className="meta-value code-font" title={negocio.id}>
                        {negocio.id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-card-footer">
                  {/* Botón Activar / Desactivar */}
                  <button
                    className={`admin-action-btn ${esActivo ? 'btn-desactivar' : 'btn-activar'}`}
                    onClick={() => handleToggleEstado(negocio)}
                    disabled={cambiandoEstadoId === negocio.id}
                    title={esActivo ? 'Desactivar negocio' : 'Activar negocio'}
                  >
                    {cambiandoEstadoId === negocio.id ? (
                      <span className="admin-mini-spinner" />
                    ) : esActivo ? (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                        <span>Desactivar</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <span>Activar</span>
                      </>
                    )}
                  </button>

                  {/* Botón Editar */}
                  <button
                    className="admin-action-btn btn-editar"
                    onClick={() => abrirModalEditar(negocio)}
                    title="Editar información del negocio"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar Negocio */}
      {modalAbierto && (
        <div className="admin-modal-overlay" onClick={cerrarModal}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>{modoEdicion ? 'Editar Negocio' : 'Nuevo Negocio'}</h2>
                <p className="admin-modal-sub">
                  {modoEdicion
                    ? 'Modifica los datos del registro en la tabla negocios'
                    : 'Registra un nuevo negocio en la plataforma'}
                </p>
              </div>
              <button
                className="admin-modal-close"
                onClick={cerrarModal}
                disabled={guardando}
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-modal-form">
              {errorModal && (
                <div className="admin-modal-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{errorModal}</span>
                </div>
              )}

              {/* Nombre */}
              <div className="admin-form-group">
                <label htmlFor="negocio-nombre">
                  Nombre del Negocio <span className="req">*</span>
                </label>
                <input
                  id="negocio-nombre"
                  type="text"
                  placeholder="Ej: Tienda Modas Bella"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  required
                  autoFocus
                  className="admin-form-input"
                />
              </div>

              {/* Logo / ImageUploader */}
              <div className="admin-form-group">
                <ImageUploader
                  value={formLogoUrl}
                  onChange={(newUrl) => setFormLogoUrl(newUrl)}
                  label="Logotipo del Negocio"
                  description="Sube o ingresa la URL de la imagen del negocio (Cloudinary)."
                  fallbackSrc="/logo.png"
                  disabled={guardando}
                />
              </div>

              {/* Estado Activo / Inactivo */}
              <div className="admin-form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    className="admin-checkbox-input"
                  />
                  <div>
                    <span className="admin-check-title">Negocio Activo</span>
                    <span className="admin-check-desc">
                      Si está activo, los usuarios del negocio podrán operar con normalidad.
                    </span>
                  </div>
                </label>
              </div>

              {/* Aviso sobre Edge Functions */}
              <div className="admin-form-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <p>
                  Por ahora este formulario gestiona la información directa del negocio. La creación
                  automática del administrador de autenticación se gestionará en el siguiente paso mediante Edge Functions.
                </p>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={cerrarModal}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={guardando}
                >
                  {guardando ? (
                    <>
                      <span className="admin-mini-spinner" />
                      Guardando...
                    </>
                  ) : modoEdicion ? (
                    'Actualizar Negocio'
                  ) : (
                    'Crear Negocio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
