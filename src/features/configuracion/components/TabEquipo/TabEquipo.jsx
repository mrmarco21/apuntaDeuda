import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { usuariosService } from '../../../../services/usuariosService';
import { ROLE_LABELS } from '../../../../hooks/usePermissions';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner/LoadingSpinner';
import { RiUserAddLine, RiShieldUserLine, RiTimeLine, RiUserUnfollowLine, RiUserFollowLine } from 'react-icons/ri';
import './TabEquipo.css';

export default function TabEquipo() {
  const { negocioActual, usuario: usuarioActual } = useAuth();
  const toast = useToast();
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Formulario de creación
  const [formNombre, setFormNombre] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRol, setFormRol] = useState('cajero');
  const [formFechaExpiracion, setFormFechaExpiracion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState(null);

  const cargarEmpleados = async () => {
    if (!negocioActual?.id) return;
    try {
      setLoading(true);
      const lista = await usuariosService.obtenerUsuariosPorNegocio(negocioActual.id);
      setEmpleados(lista);
    } catch (err) {
      console.error('Error al cargar equipo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEmpleados();
  }, [negocioActual?.id]);

  const abrirModalCrear = () => {
    setFormNombre('');
    setFormEmail('');
    setFormPassword('');
    setFormRol('cajero');
    setFormFechaExpiracion('');
    setErrorModal('');
    setModalAbierto(true);
  };

  const handleCrearEmpleado = async (e) => {
    e.preventDefault();
    if (!formNombre.trim() || !formEmail.trim() || !formPassword.trim()) {
      setErrorModal('Por favor completa todos los campos obligatorios.');
      return;
    }

    try {
      setGuardando(true);
      setErrorModal('');

      await usuariosService.crearUsuario({
        email: formEmail,
        password: formPassword,
        nombre: formNombre,
        rol: formRol,
        negocio_id: negocioActual.id,
        fecha_expiracion_acceso: formRol === 'temporal' && formFechaExpiracion ? formFechaExpiracion : null,
      });

      toast.success(`Cuenta para "${formNombre}" creada exitosamente.`);
      setModalAbierto(false);
      await cargarEmpleados();
    } catch (err) {
      console.error('Error al crear empleado:', err);
      setErrorModal(err.message || 'Error al crear la cuenta del empleado.');
    } finally {
      setGuardando(false);
    }
  };

  const handleToggleEstado = async (emp) => {
    const nuevoEstado = !emp.activo;
    try {
      setCambiandoEstadoId(emp.id);
      await usuariosService.actualizarUsuario(emp.id, {
        nombre: emp.nombre,
        rol: emp.rol,
        negocio_id: emp.negocio_id,
        activo: nuevoEstado,
        fecha_expiracion_acceso: emp.fecha_expiracion_acceso,
      });

      setEmpleados((prev) =>
        prev.map((u) => (u.id === emp.id ? { ...u, activo: nuevoEstado } : u))
      );
      toast.success(`Cuenta de ${emp.nombre} ${nuevoEstado ? 'activada' : 'desactivada'}.`);
    } catch (err) {
      console.error('Error al cambiar estado de empleado:', err);
      toast.error('No se pudo actualizar el estado del usuario.');
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  return (
    <div className="config-card">
      <div className="card-header flex-header">
        <div>
          <h2>Gestión de Equipo y Permisos</h2>
          <p className="card-subtitle">
            Crea cuentas individuales para tus empleados (Cajeros, Encargados) con accesos delimitados.
          </p>
        </div>
        <button className="btn-primary flex-btn" onClick={abrirModalCrear}>
          <RiUserAddLine size={18} />
          <span>+ Nuevo Empleado</span>
        </button>
      </div>

      {loading ? (
        <div className="tab-loading-wrap">
          <LoadingSpinner screen="modal" text="Cargando usuarios del negocio..." />
        </div>
      ) : empleados.length === 0 ? (
        <div className="equipo-empty-state">
          <RiShieldUserLine size={48} className="empty-icon" />
          <h3>No hay empleados registrados</h3>
          <p>Crea cuentas para tu personal con roles restringidos para operar la tienda con seguridad.</p>
          <button className="btn-primary" onClick={abrirModalCrear}>
            Registrar Primer Empleado
          </button>
        </div>
      ) : (
        <div className="equipo-grid">
          {empleados.map((emp) => {
            const esMismoUsuario = emp.id === usuarioActual?.id;
            const esActivo = emp.activo !== false;
            const esTemporal = emp.rol === 'temporal';
            const fechaExp = emp.fecha_expiracion_acceso ? new Date(emp.fecha_expiracion_acceso) : null;
            const estaExpirado = esTemporal && fechaExp && fechaExp < new Date();

            return (
              <div key={emp.id} className={`empleado-card ${!esActivo || estaExpirado ? 'inactivo' : ''}`}>
                <div className="empleado-card-header">
                  <div className="empleado-avatar">
                    {(emp.nombre || 'E').charAt(0).toUpperCase()}
                  </div>
                  <div className="empleado-badges">
                    <span className={`emp-role-pill ${emp.rol}`}>
                      {ROLE_LABELS[emp.rol] || emp.rol || 'Empleado'}
                    </span>
                    <span className={`admin-status-pill ${esActivo && !estaExpirado ? 'pill-activo' : 'pill-inactivo'}`}>
                      {estaExpirado ? 'Acceso Expirado' : esActivo ? 'Habilitado' : 'Desactivado'}
                    </span>
                  </div>
                </div>

                <div className="empleado-card-body">
                  <h3 className="empleado-nombre">{emp.nombre}</h3>
                  <span className="empleado-email">{emp.email || 'Credencial registrada'}</span>

                  {esTemporal && fechaExp && (
                    <div className="empleado-exp-notice">
                      <RiTimeLine size={14} />
                      <span>
                        {estaExpirado ? 'Acceso venció el: ' : 'Expira el: '}
                        <strong>{fechaExp.toLocaleDateString('es-PE')}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {!esMismoUsuario && (
                  <div className="empleado-card-footer">
                    <button
                      className={`btn-emp-action ${esActivo ? 'btn-disable' : 'btn-enable'}`}
                      onClick={() => handleToggleEstado(emp)}
                      disabled={cambiandoEstadoId === emp.id}
                    >
                      {cambiandoEstadoId === emp.id ? (
                        <span>Procesando...</span>
                      ) : esActivo ? (
                        <>
                          <RiUserUnfollowLine size={15} />
                          <span>Desactivar Acceso</span>
                        </>
                      ) : (
                        <>
                          <RiUserFollowLine size={15} />
                          <span>Habilitar Acceso</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Empleado */}
      {modalAbierto && (
        <div className="admin-modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Registrar Nuevo Empleado</h2>
                <p className="admin-modal-sub">Crea las credenciales de acceso para un miembro del personal</p>
              </div>
              <button className="admin-modal-close" onClick={() => setModalAbierto(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCrearEmpleado} className="admin-modal-form">
              {errorModal && (
                <div className="admin-modal-error">
                  <span>{errorModal}</span>
                </div>
              )}

              <div className="admin-form-group">
                <label>Nombre del Empleado *</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez (Cajero)"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  required
                  autoFocus
                  className="admin-form-input"
                />
              </div>

              <div className="admin-form-group">
                <label>Correo Electrónico de Login *</label>
                <input
                  type="email"
                  placeholder="ejemplo: juan@tienda.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  required
                  className="admin-form-input"
                />
              </div>

              <div className="admin-form-group">
                <label>Contraseña de Acceso *</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required
                  minLength={6}
                  className="admin-form-input"
                />
              </div>

              <div className="admin-form-group">
                <label>Rol y Nivel de Permisos *</label>
                <select
                  value={formRol}
                  onChange={(e) => setFormRol(e.target.value)}
                  className="admin-form-input"
                >
                  <option value="cajero">🛒 Cajero (Fiados y Abonos diarios - Sin Reportes/Gastos)</option>
                  <option value="encargado">👔 Encargado de Tienda (Ventas, Abonos, Gastos y Reportes)</option>
                  <option value="asistente">📋 Asistente de Ventas (Solo búsqueda y fiados)</option>
                  <option value="temporal">⏳ Encargado Temporal (Con fecha de expiración)</option>
                  <option value="admin">👑 Administrador Completo</option>
                </select>
              </div>

              {formRol === 'temporal' && (
                <div className="admin-form-group">
                  <label>Fecha Límite de Acceso *</label>
                  <input
                    type="date"
                    value={formFechaExpiracion}
                    onChange={(e) => setFormFechaExpiracion(e.target.value)}
                    required
                    className="admin-form-input"
                  />
                  <span className="admin-form-hint">
                    Al llegar esta fecha, la cuenta de este empleado se desactivará automáticamente.
                  </span>
                </div>
              )}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setModalAbierto(false)}
                  disabled={guardando}
                >
                  Cancelar
                </button>
                <button type="submit" className="admin-btn-primary" disabled={guardando}>
                  {guardando ? 'Creando Cuenta...' : 'Crear Cuenta Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
