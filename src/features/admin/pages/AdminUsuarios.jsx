import React, { useState, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { usuariosService } from '../../../services/usuariosService';
import { negociosService } from '../../../services/negociosService';
import UserStats from '../components/UserStats/UserStats';
import UserFilters from '../components/UserFilters/UserFilters';
import UserTable from '../components/UserTable/UserTable';
import ModalCrearUsuario from '../components/ModalCrearUsuario/ModalCrearUsuario';
import ModalEditarUsuario from '../components/ModalEditarUsuario/ModalEditarUsuario';
import ModalPasswordUsuario from '../components/ModalPasswordUsuario/ModalPasswordUsuario';
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

      await usuariosService.crearUsuario({
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
      <UserStats
        totalUsuarios={totalUsuarios}
        totalAdmins={totalAdmins}
        totalActivos={totalActivos}
        totalInactivos={totalInactivos}
      />

      {/* Barra de Filtros */}
      <UserFilters
        filtroTexto={filtroTexto}
        setFiltroTexto={setFiltroTexto}
        filtroNegocio={filtroNegocio}
        setFiltroNegocio={setFiltroNegocio}
        filtroRol={filtroRol}
        setFiltroRol={setFiltroRol}
        filtroEstado={filtroEstado}
        setFiltroEstado={setFiltroEstado}
        negocios={negocios}
      />

      {/* Tabla de Usuarios */}
      <UserTable
        loading={loading}
        usuariosFiltrados={usuariosFiltrados}
        filtroTexto={filtroTexto}
        filtroNegocio={filtroNegocio}
        filtroRol={filtroRol}
        filtroEstado={filtroEstado}
        abrirModalCrear={abrirModalCrear}
        handleToggleEstado={handleToggleEstado}
        cambiandoEstadoId={cambiandoEstadoId}
        abrirModalPassword={abrirModalPassword}
        abrirModalEditar={abrirModalEditar}
        formatearFecha={formatearFecha}
      />

      {/* MODALES */}
      <ModalCrearUsuario
        modalCrearAbierto={modalCrearAbierto}
        cerrarModales={cerrarModales}
        guardando={guardando}
        handleCrearUsuario={handleCrearUsuario}
        errorModal={errorModal}
        formNombre={formNombre}
        setFormNombre={setFormNombre}
        formEmail={formEmail}
        setFormEmail={setFormEmail}
        formPassword={formPassword}
        setFormPassword={setFormPassword}
        mostrarPassword={mostrarPassword}
        setMostrarPassword={setMostrarPassword}
        formNegocioId={formNegocioId}
        setFormNegocioId={setFormNegocioId}
        formRol={formRol}
        setFormRol={setFormRol}
        negocios={negocios}
      />

      <ModalEditarUsuario
        modalEditarAbierto={modalEditarAbierto}
        usuarioSeleccionado={usuarioSeleccionado}
        cerrarModales={cerrarModales}
        guardando={guardando}
        handleEditarUsuario={handleEditarUsuario}
        errorModal={errorModal}
        editNombre={editNombre}
        setEditNombre={setEditNombre}
        editNegocioId={editNegocioId}
        setEditNegocioId={setEditNegocioId}
        editRol={editRol}
        setEditRol={setEditRol}
        editActivo={editActivo}
        setEditActivo={setEditActivo}
        negocios={negocios}
      />

      <ModalPasswordUsuario
        modalPasswordAbierto={modalPasswordAbierto}
        usuarioPasswordSeleccionado={usuarioPasswordSeleccionado}
        cerrarModales={cerrarModales}
        guardandoPassword={guardandoPassword}
        handleCambiarPassword={handleCambiarPassword}
        errorModalPassword={errorModalPassword}
        nuevoPassword={nuevoPassword}
        setNuevoPassword={setNuevoPassword}
        mostrarNuevoPassword={mostrarNuevoPassword}
        setMostrarNuevoPassword={setMostrarNuevoPassword}
        generarPasswordAleatorio={generarPasswordAleatorio}
        copiarPassword={copiarPassword}
        copiadoPassword={copiadoPassword}
      />
    </div>
  );
}
