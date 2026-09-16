import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { usuariosService } from '../../services/usuariosService';
import { negociosService } from '../../services/negociosService';
import LoadingSpinner from '../../components/ui/LoadingSpinner/LoadingSpinner';
import './AdminUsuarios.css';

export default function AdminUsuarios() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState([]);
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroNegocio, setFiltroNegocio] = useState('todos');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Modales
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [usuarioPasswordSeleccionado, setUsuarioPasswordSeleccionado] = useState(null);

  // Formulario Crear
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNegocioId, setFormNegocioId] = useState('');
  const [formRol, setFormRol] = useState('admin');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Formulario Editar
  const [editNombre, setEditNombre] = useState('');
  const [editNegocioId, setEditNegocioId] = useState('');
  const [editRol, setEditRol] = useState('admin');
  const [editActivo, setEditActivo] = useState(true);

  // Formulario Cambiar Contraseña
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [mostrarNuevoPassword, setMostrarNuevoPassword] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [errorModalPassword, setErrorModalPassword] = useState('');
  const [copiadoPassword, setCopiadoPassword] = useState(false);

  // Estados de proceso y feedback
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [listaUsuarios, listaNegocios] = await Promise.all([
        usuariosService.obtenerUsuarios(),
        negociosService.obtenerNegocios(),
      ]);
      setUsuarios(listaUsuarios);
      setNegocios(listaNegocios);
      const listaActivos = listaNegocios.filter((n) => n.activo !== false);
      if (listaNegocios.length > 0 && !formNegocioId) {
        setFormNegocioId(listaActivos[0]?.id || listaNegocios[0].id);
      }
    } catch (err) {
      console.error('Error al cargar datos de usuarios o negocios:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const abrirModalCrear = () => {
    setFormNombre('');
    setFormEmail('');
    setFormPassword('');
    setFormRol('admin');
    const negocioActivo = negocios.find((n) => n.activo !== false) || negocios[0];
    if (negocioActivo) {
      setFormNegocioId(negocioActivo.id);
    }
    setErrorModal('');
    setModalCrearAbierto(true);
  };

  const abrirModalEditar = (u) => {
    setUsuarioSeleccionado(u);
    setEditNombre(u.nombre || '');
    setEditNegocioId(u.negocio_id || (negocios[0]?.id || ''));
    setEditRol(u.rol || 'admin');
    setEditActivo(u.activo !== false);
    setErrorModal('');
    setModalEditarAbierto(true);
  };

  const abrirModalPassword = (u) => {
    setUsuarioPasswordSeleccionado(u);
    setNuevoPassword('');
    setMostrarNuevoPassword(false);
    setErrorModalPassword('');
    setCopiadoPassword(false);
    setModalPasswordAbierto(true);
  };

  const generarPasswordAleatorio = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNuevoPassword(pass);
    setMostrarNuevoPassword(true);
  };

  const copiarPassword = () => {
    if (!nuevoPassword) return;
    navigator.clipboard.writeText(nuevoPassword);
    setCopiadoPassword(true);
    toast.success('Contraseña copiada al portapapeles');
    setTimeout(() => setCopiadoPassword(false), 2500);
  };

  const cerrarModales = () => {
    if (guardando || guardandoPassword) return;
    setModalCrearAbierto(false);
    setModalEditarAbierto(false);
    setModalPasswordAbierto(false);
    setErrorModal('');
    setErrorModalPassword('');
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (!formNombre.trim() || !formEmail.trim() || !formPassword || !formNegocioId) {
      setErrorModal('Por favor completa todos los campos requeridos.');
      return;
    }

    if (formPassword.length < 6) {
      setErrorModal('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const negocioElegido = negocios.find((n) => n.id === formNegocioId);
    if (negocioElegido && negocioElegido.activo === false) {
      setErrorModal('No se pueden crear usuarios en un negocio inactivo. Por favor activa el negocio primero en el módulo de Negocios.');
      return;
    }

    try {
      setGuardando(true);
      setErrorModal('');

      const nuevoUsuario = await usuariosService.crearUsuario({
        nombre: formNombre,
        email: formEmail,
        password: formPassword,
        rol: formRol,
        negocio_id: formNegocioId,
      });

      // Recargar lista para asegurar sincronización completa
      await cargarDatos();

      setModalCrearAbierto(false);
      mostrarAlertaExito(`Usuario "${formNombre}" registrado exitosamente.`);
    } catch (err) {
      console.error('Error al crear usuario:', err);
      setErrorModal(err.message || 'Ocurrió un error al registrar el usuario.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarUsuario = async (e) => {
    e.preventDefault();
    if (!editNombre.trim() || !editNegocioId) {
      setErrorModal('El nombre y el negocio son obligatorios.');
      return;
    }

    try {
      setGuardando(true);
      setErrorModal('');

      const actualizado = await usuariosService.actualizarUsuario(usuarioSeleccionado.id, {
        nombre: editNombre,
        negocio_id: editNegocioId,
        rol: editRol,
        activo: editActivo,
      });

      setUsuarios((prev) =>
        prev.map((u) => (u.id === usuarioSeleccionado.id ? { ...u, ...actualizado } : u))
      );

      setModalEditarAbierto(false);
      mostrarAlertaExito('Datos del usuario actualizados correctamente.');
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      setErrorModal(err.message || 'Error al actualizar el usuario.');
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (!nuevoPassword || nuevoPassword.length < 6) {
      setErrorModalPassword('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      setGuardandoPassword(true);
      setErrorModalPassword('');

      await usuariosService.cambiarPasswordUsuario({
        authUserId: usuarioPasswordSeleccionado.auth_user_id,
        password: nuevoPassword,
      });

      setModalPasswordAbierto(false);
      mostrarAlertaExito(`Contraseña actualizada exitosamente para "${usuarioPasswordSeleccionado.nombre || 'el usuario'}".`);
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      setErrorModalPassword(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setGuardandoPassword(false);
    }
  };

  const handleToggleEstado = async (u) => {
    const nuevoEstado = !u.activo;
    try {
      setCambiandoEstadoId(u.id);
      await usuariosService.toggleEstadoUsuario(u.id, nuevoEstado);

      setUsuarios((prev) =>
        prev.map((item) => (item.id === u.id ? { ...item, activo: nuevoEstado } : item))
      );

      mostrarAlertaExito(
        `Usuario "${u.nombre || 'sin nombre'}" ${nuevoEstado ? 'activado' : 'desactivado'}.`
      );
    } catch (err) {
      console.error('Error al cambiar estado de usuario:', err);
      toast.error('Error al cambiar estado: ' + err.message);
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  const mostrarAlertaExito = (msg) => {
    toast.success(msg);
  };

  // KPIs
  const totalUsuarios = usuarios.length;
  const totalAdmins = usuarios.filter((u) => u.rol === 'admin').length;
  const totalActivos = usuarios.filter((u) => u.activo !== false).length;
  const totalInactivos = totalUsuarios - totalActivos;

  // Filtrado reactivo
  const usuariosFiltrados = usuarios.filter((u) => {
    const termino = filtroTexto.toLowerCase().trim();
    const coincideNombre = (u.nombre || '').toLowerCase().includes(termino);
    const coincideEmail = (u.email || '').toLowerCase().includes(termino);
    const coincideTexto = coincideNombre || coincideEmail;

    const coincideNegocio =
      filtroNegocio === 'todos' || u.negocio_id === filtroNegocio;

    const coincideRol =
      filtroRol === 'todos' || u.rol === filtroRol;

    const coincideEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'activos' && u.activo !== false) ||
      (filtroEstado === 'inactivos' && u.activo === false);

    return coincideTexto && coincideNegocio && coincideRol && coincideEstado;
  });

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'N/A';
    try {
      return new Date(fechaStr).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      });
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="admin-usuarios-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <span className="admin-badge-category">Plataforma &bull; Módulo de Acceso</span>
          <h1 className="admin-page-title">Usuarios de la Plataforma</h1>
          <p className="admin-page-desc">
            Administra administradores y usuarios de todos los negocios.
          </p>
        </div>
        <button
          className="admin-btn-primary"
          onClick={abrirModalCrear}
          id="btn-nuevo-usuario"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Crear Usuario</span>
        </button>
      </div>

      {/* Tarjetas / Resumen (KPIs) */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap icon-indigo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Usuarios Totales</span>
            <span className="admin-stat-value">{totalUsuarios}</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap icon-purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Administradores</span>
            <span className="admin-stat-value">{totalAdmins}</span>
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
            <span className="admin-stat-label">Usuarios Activos</span>
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
            <span className="admin-stat-label">Usuarios Inactivos</span>
            <span className="admin-stat-value">{totalInactivos}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="admin-filters-bar usuarios-filters-bar">
        {/* Buscador */}
        <div className="admin-search-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
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

        <div className="usuarios-select-filters">
          {/* Filtro por Negocio */}
          <div className="select-filter-wrap">
            <label htmlFor="filtro-negocio">Negocio:</label>
            <select
              id="filtro-negocio"
              value={filtroNegocio}
              onChange={(e) => setFiltroNegocio(e.target.value)}
              className="admin-select"
            >
              <option value="todos">Todos los negocios</option>
              {negocios.map((neg) => (
                <option key={neg.id} value={neg.id}>
                  {neg.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Rol */}
          <div className="select-filter-wrap">
            <label htmlFor="filtro-rol">Rol:</label>
            <select
              id="filtro-rol"
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="admin-select"
            >
              <option value="todos">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="usuario">Usuario normal</option>
            </select>
          </div>

          {/* Filtro por Estado */}
          <div className="select-filter-wrap">
            <label htmlFor="filtro-estado">Estado:</label>
            <select
              id="filtro-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="admin-select"
            >
              <option value="todos">Todos los estados</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      {loading ? (
        <div className="admin-loading-wrap">
          <LoadingSpinner text="Cargando usuarios de la plataforma..." />
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="admin-empty-state">
          <div className="admin-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <h3>No se encontraron usuarios</h3>
          <p>
            {filtroTexto || filtroNegocio !== 'todos' || filtroRol !== 'todos' || filtroEstado !== 'todos'
              ? 'No hay registros que coincidan con los filtros aplicados.'
              : 'Aún no se han registrado usuarios en los negocios.'}
          </p>
          {!filtroTexto && (
            <button className="admin-btn-primary" onClick={abrirModalCrear}>
              Registrar Primer Usuario
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-card">
          <div className="admin-table-responsive">
            <table className="admin-usuarios-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Negocio</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha de Creación</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const esAdmin = u.rol === 'admin';
                  const esActivo = u.activo !== false;
                  const inicial = (u.nombre || u.email || 'U').charAt(0).toUpperCase();
                  const nombreNegocio = u.negocios?.nombre || 'Negocio asignado';

                  return (
                    <tr key={u.id} className={!esActivo ? 'row-inactivo' : ''}>
                      {/* Usuario */}
                      <td>
                        <div className="user-cell">
                          <div className={`user-avatar ${esAdmin ? 'avatar-admin' : 'avatar-user'}`}>
                            {inicial}
                          </div>
                          <div className="user-cell-info">
                            <span className="user-name">{u.nombre || 'Sin nombre'}</span>
                            {esAdmin && (
                              <span className="user-badge-principal">
                                Admin Principal
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Correo */}
                      <td>
                        <span className="user-email-text">
                          {u.email ? (
                            u.email
                          ) : (
                            <span className="user-email-empty">—</span>
                          )}
                        </span>
                      </td>

                      {/* Negocio */}
                      <td>
                        <div className="negocio-cell">
                          <span className="negocio-name-text">
                            {nombreNegocio}
                          </span>
                          <span className="negocio-id-sub" title={u.negocio_id}>
                            {u.negocio_id}
                          </span>
                        </div>
                      </td>

                      {/* Rol */}
                      <td>
                        <span className={`role-pill ${esAdmin ? 'role-admin' : 'role-user'}`}>
                          {esAdmin ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                              <span>Admin</span>
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                              <span>Usuario</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Estado */}
                      <td>
                        <span className={`admin-status-pill ${esActivo ? 'pill-activo' : 'pill-inactivo'}`}>
                          <span className="pill-dot" />
                          {esActivo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Fecha de Creación */}
                      <td>
                        <span className="date-text">{formatearFecha(u.created_at)}</span>
                      </td>

                      {/* Acciones */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                          {/* Toggle Activar / Desactivar */}
                          <button
                            className={`table-btn-action ${esActivo ? 'btn-toggle-off' : 'btn-toggle-on'}`}
                            onClick={() => handleToggleEstado(u)}
                            disabled={cambiandoEstadoId === u.id}
                            title={esActivo ? 'Desactivar usuario' : 'Activar usuario'}
                          >
                            {cambiandoEstadoId === u.id ? (
                              <span className="admin-mini-spinner" />
                            ) : esActivo ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                              </svg>
                            )}
                          </button>

                          {/* Cambiar Contraseña */}
                          <button
                            className="table-btn-action btn-password"
                            onClick={() => abrirModalPassword(u)}
                            title="Cambiar contraseña de acceso"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </button>

                          {/* Editar */}
                          <button
                            className="table-btn-action btn-edit"
                            onClick={() => abrirModalEditar(u)}
                            title="Editar usuario"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Crear Usuario */}
      {modalCrearAbierto && (
        <div className="admin-modal-overlay" onClick={cerrarModales}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Crear Nuevo Usuario</h2>
                <p className="admin-modal-sub">
                  Registra la cuenta Auth y vincúlala con su negocio y rol correspondiente.
                </p>
              </div>
              <button
                className="admin-modal-close"
                onClick={cerrarModales}
                disabled={guardando}
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCrearUsuario} className="admin-modal-form">
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
                <label htmlFor="user-nombre">
                  Nombre Completo <span className="req">*</span>
                </label>
                <input
                  id="user-nombre"
                  type="text"
                  placeholder="Ej: Laura Gómez"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  required
                  autoFocus
                  className="admin-form-input"
                />
              </div>

              {/* Correo */}
              <div className="admin-form-group">
                <label htmlFor="user-email">
                  Correo Electrónico (Auth) <span className="req">*</span>
                </label>
                <input
                  id="user-email"
                  type="email"
                  placeholder="usuario@negocio.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="admin-form-input"
                />
              </div>

              {/* Contraseña */}
              <div className="admin-form-group">
                <label htmlFor="user-password">
                  Contraseña Inicial <span className="req">*</span>
                </label>
                <div className="admin-input-pass-wrap">
                  <input
                    id="user-password"
                    type={mostrarPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    minLength={6}
                    className="admin-form-input"
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    tabIndex={-1}
                  >
                    {mostrarPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                <span className="admin-form-hint">
                  Esta contraseña servirá para el primer acceso del usuario a su negocio.
                </span>
              </div>

              {/* Negocio */}
              <div className="admin-form-group">
                <label htmlFor="user-negocio">
                  Negocio Asignado <span className="req">*</span>
                </label>
                <select
                  id="user-negocio"
                  value={formNegocioId}
                  onChange={(e) => setFormNegocioId(e.target.value)}
                  required
                  className="admin-form-input admin-select-input"
                >
                  {negocios.map((neg) => (
                    <option key={neg.id} value={neg.id} disabled={neg.activo === false}>
                      {neg.nombre} {neg.activo === false ? '(Inactivo - No permite usuarios)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rol */}
              <div className="admin-form-group">
                <label htmlFor="user-rol">
                  Rol en el Negocio <span className="req">*</span>
                </label>
                <select
                  id="user-rol"
                  value={formRol}
                  onChange={(e) => setFormRol(e.target.value)}
                  className="admin-form-input admin-select-input"
                >
                  <option value="admin">Administrador (Control total del negocio)</option>
                  <option value="usuario">Usuario (Operador habitual de cobros y clientes)</option>
                </select>
                <span className="admin-form-hint">
                  {formRol === 'admin'
                    ? 'Tendrá facultades para gestionar cobros, gastos y configuraciones del negocio.'
                    : 'Podrá consultar y registrar movimientos del negocio asignado.'}
                </span>
              </div>

              {/* Nota de seguridad */}
              <div className="admin-form-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <p>
                  La creación de la cuenta se realiza de manera segura mediante la Edge Function de Supabase,
                  asegurando el aislamiento RLS sin exponer claves maestras.
                </p>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={cerrarModales}
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
                      Creando Cuenta...
                    </>
                  ) : (
                    'Crear Usuario'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Usuario */}
      {modalEditarAbierto && usuarioSeleccionado && (
        <div className="admin-modal-overlay" onClick={cerrarModales}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Editar Usuario</h2>
                <p className="admin-modal-sub">
                  Modifica la información y el rol en el negocio.
                </p>
              </div>
              <button
                className="admin-modal-close"
                onClick={cerrarModales}
                disabled={guardando}
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditarUsuario} className="admin-modal-form">
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
                <label htmlFor="edit-user-nombre">
                  Nombre Completo <span className="req">*</span>
                </label>
                <input
                  id="edit-user-nombre"
                  type="text"
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  required
                  className="admin-form-input"
                />
              </div>

              {/* Negocio */}
              <div className="admin-form-group">
                <label htmlFor="edit-user-negocio">
                  Negocio Asignado <span className="req">*</span>
                </label>
                <select
                  id="edit-user-negocio"
                  value={editNegocioId}
                  onChange={(e) => setEditNegocioId(e.target.value)}
                  required
                  className="admin-form-input admin-select-input"
                >
                  {negocios.map((neg) => (
                    <option key={neg.id} value={neg.id}>
                      {neg.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rol */}
              <div className="admin-form-group">
                <label htmlFor="edit-user-rol">
                  Rol en el Negocio <span className="req">*</span>
                </label>
                <select
                  id="edit-user-rol"
                  value={editRol}
                  onChange={(e) => setEditRol(e.target.value)}
                  className="admin-form-input admin-select-input"
                >
                  <option value="admin">Administrador</option>
                  <option value="usuario">Usuario</option>
                </select>
              </div>

              {/* Estado Activo */}
              <div className="admin-form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editActivo}
                    onChange={(e) => setEditActivo(e.target.checked)}
                    className="admin-checkbox-input"
                  />
                  <div>
                    <span className="admin-check-title">Usuario Activo</span>
                    <span className="admin-check-desc">
                      Si se desmarca, el usuario no podrá acceder a la plataforma.
                    </span>
                  </div>
                </label>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={cerrarModales}
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
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cambiar Contraseña de Usuario */}
      {modalPasswordAbierto && usuarioPasswordSeleccionado && (
        <div className="admin-modal-overlay" onClick={cerrarModales}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Cambiar Contraseña</h2>
                <p className="admin-modal-sub">
                  Establece una nueva clave de acceso para el usuario en Supabase Auth.
                </p>
              </div>
              <button
                className="admin-modal-close"
                onClick={cerrarModales}
                disabled={guardandoPassword}
                aria-label="Cerrar modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCambiarPassword} className="admin-modal-form">
              {errorModalPassword && (
                <div className="admin-modal-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{errorModalPassword}</span>
                </div>
              )}

              {/* Ficha resumida del usuario */}
              <div className="admin-user-summary-card">
                <div className="admin-user-summary-avatar">
                  {(usuarioPasswordSeleccionado.nombre || usuarioPasswordSeleccionado.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="admin-user-summary-info">
                  <span className="admin-user-summary-name">{usuarioPasswordSeleccionado.nombre || 'Sin nombre'}</span>
                  <span className="admin-user-summary-sub">
                    {usuarioPasswordSeleccionado.email || 'Sin correo registrado'} &bull; {usuarioPasswordSeleccionado.negocios?.nombre || 'Negocio asignado'}
                  </span>
                </div>
              </div>

              {/* Campo Nueva Contraseña */}
              <div className="admin-form-group">
                <label htmlFor="user-new-password">
                  Nueva Contraseña <span className="req">*</span>
                </label>
                <div className="admin-input-pass-wrap">
                  <input
                    id="user-new-password"
                    type={mostrarNuevoPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={nuevoPassword}
                    onChange={(e) => setNuevoPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                    className="admin-form-input"
                  />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setMostrarNuevoPassword(!mostrarNuevoPassword)}
                    tabIndex={-1}
                  >
                    {mostrarNuevoPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>

                {/* Herramientas de Contraseña */}
                <div className="admin-pass-tools">
                  <button
                    type="button"
                    className="admin-btn-tool"
                    onClick={generarPasswordAleatorio}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                    </svg>
                    <span>Generar Aleatoria</span>
                  </button>

                  {nuevoPassword && (
                    <button
                      type="button"
                      className={`admin-btn-tool ${copiadoPassword ? 'btn-copied' : ''}`}
                      onClick={copiarPassword}
                    >
                      {copiadoPassword ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span>¡Copiada!</span>
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Aviso de seguridad */}
              <div className="admin-form-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <p>
                  El cambio se aplicará de inmediato en Supabase Auth. El usuario podrá iniciar sesión con su nueva clave sin necesidad de confirmación previa por correo.
                </p>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={cerrarModales}
                  disabled={guardandoPassword}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={guardandoPassword}
                >
                  {guardandoPassword ? (
                    <>
                      <span className="admin-mini-spinner" />
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Contraseña'
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
