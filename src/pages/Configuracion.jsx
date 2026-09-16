import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabaseClient';
import { clientasService } from '../services/clientasService';
import { cuentasService } from '../services/cuentasService';
import { backupService } from '../services/backupService';
import { categoriasService } from '../services/categoriasService';
import ImageUploader from '../components/common/ImageUploader/ImageUploader';
import {
  RiUserLine,
  RiStoreLine,
  RiPriceTag3Line,
  RiSunLine,
  RiLockLine,
  RiDownloadLine,
  RiMoreLine,
  RiEditLine,
  RiToggleLine,
  RiDeleteBinLine,
  RiAddLine,
  RiRefreshLine,
  RiCheckLine,
  RiCloseLine,
  RiSaveLine,
  RiMoonLine,
} from 'react-icons/ri';
import './Configuracion.css';

export default function Configuracion() {
  const { usuario, session, negocioActual, actualizarNegocioActual, cambiarNegocio } = useAuth();
  const { isDark, setTheme } = useTheme();
  const { config: globalConfig, updateConfig } = useConfig();
  const toast = useToast();

  // Tab activo
  const [activeTab, setActiveTab] = useState('perfil');

  // Estado del perfil
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [whatsapp, setWhatsapp] = useState(negocioActual?.whatsapp || '');
  const [savingPerfil, setSavingPerfil] = useState(false);

  // Estado de preferencias del negocio
  const [nombreNegocio, setNombreNegocio] = useState(negocioActual?.nombre || globalConfig?.nombreNegocio || 'ApuntaDeuda');
  const [logoUrl, setLogoUrl] = useState(negocioActual?.logo_url || '');
  const [moneda, setMoneda] = useState(globalConfig?.moneda || 'PEN');
  const [simboloMoneda, setSimboloMoneda] = useState(globalConfig?.simboloMoneda || 'S/');
  const [mensajeCobro, setMensajeCobro] = useState(
    globalConfig?.mensajeCobro ||
      'Hola {clienta}, le recordamos que su saldo pendiente es de {saldo}. Gracias por su puntualidad.'
  );
  const [savingNegocio, setSavingNegocio] = useState(false);

  // Estado de administración de categorías
  const [categoriasList, setCategoriasList] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [filtroEstadoCat, setFiltroEstadoCat] = useState('todas'); // 'todas' | 'activas' | 'inactivas'
  const [showModalCrearCat, setShowModalCrearCat] = useState(false);
  const [formCrearCat, setFormCrearCat] = useState({ nombre: '', icono: '👕' });
  const [showModalEditarCat, setShowModalEditarCat] = useState(false);
  const [catParaEditar, setCatParaEditar] = useState(null);
  const [guardandoCat, setGuardandoCat] = useState(false);
  const [showModalEliminarCat, setShowModalEliminarCat] = useState(false);
  const [catParaEliminar, setCatParaEliminar] = useState(null);
  const [eliminandoCat, setEliminandoCat] = useState(false);
  const [alertaUsoCat, setAlertaUsoCat] = useState(null);
  const [openMenuCatId, setOpenMenuCatId] = useState(null); // Menú 3 puntos móvil
  const catMenuRef = useRef(null);

  // Estado de seguridad
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Estado de exportación
  const [exporting, setExporting] = useState(false);

  // Estado de importación
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileValidation, setFileValidation] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Notificaciones
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre || '');
      setTelefono(usuario.telefono || '');
    } else if (session?.user) {
      setNombre(session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || '');
    }

    if (negocioActual) {
      if (negocioActual.nombre) setNombreNegocio(negocioActual.nombre);
      if (negocioActual.logo_url) setLogoUrl(negocioActual.logo_url);
      if (negocioActual.whatsapp !== undefined) setWhatsapp(negocioActual.whatsapp || '');
    }

    // Consulta directa para asegurar carga de WhatsApp del negocio activo
    const activeNegId = negocioActual?.id || localStorage.getItem('active_negocio_id');
    if (activeNegId && activeNegId !== 'undefined') {
      supabase
        .from('negocios')
        .select('whatsapp')
        .eq('id', activeNegId)
        .maybeSingle()
        .then(({ data }) => {
          if (data && data.whatsapp !== undefined && data.whatsapp !== null) {
            setWhatsapp(data.whatsapp || '');
          }
        })
        .catch(() => {});
    }

    // Cargar config guardada
    try {
      const savedConfig = localStorage.getItem('@config_negocio');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.nombreNegocio && !negocioActual?.nombre) setNombreNegocio(parsed.nombreNegocio);
        if (parsed.logoUrl && !negocioActual?.logo_url) setLogoUrl(parsed.logoUrl);
        if (parsed.moneda) setMoneda(parsed.moneda);
        if (parsed.simboloMoneda) setSimboloMoneda(parsed.simboloMoneda);
        if (parsed.mensajeCobro) setMensajeCobro(parsed.mensajeCobro);
      }
    } catch (e) {
      console.error('Error cargando configuración local:', e);
    }
  }, [usuario, session, negocioActual]);

  // Cargar categorías al seleccionar la pestaña 'categorias' o al cambiar de negocio

  useEffect(() => {
    if (!openMenuCatId) return;
    const handleClickOutside = (e) => {
      if (catMenuRef.current && !catMenuRef.current.contains(e.target)) {
        setOpenMenuCatId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuCatId]);

  useEffect(() => {
    if (activeTab === 'categorias') {
      cargarCategoriasNegocio();
    }
  }, [activeTab, negocioActual]);

  const cargarCategoriasNegocio = async () => {
    try {
      setLoadingCategorias(true);
      const cats = await categoriasService.getCategorias({ incluirInactivas: true });
      setCategoriasList(cats || []);
    } catch (err) {
      console.error('Error cargando categorías en Configuración:', err);
      toast.error('Error al cargar las categorías del negocio.');
    } finally {
      setLoadingCategorias(false);
    }
  };

  const handleGuardarCrearCat = async (e) => {
    e.preventDefault();
    const nombreLimpio = (formCrearCat.nombre || '').trim();
    if (!nombreLimpio) {
      toast.warning('Ingresa un nombre para la categoría');
      return;
    }

    try {
      setGuardandoCat(true);
      await categoriasService.crearCategoria({
        nombre: nombreLimpio,
        icono: formCrearCat.icono || '🏷️'
      });

      toast.success(`Categoría "${nombreLimpio}" creada exitosamente`);
      setShowModalCrearCat(false);
      setFormCrearCat({ nombre: '', icono: '👕' });
      await cargarCategoriasNegocio();
    } catch (err) {
      console.error('Error creando categoría:', err);
      toast.error(err.message || 'Error al crear la categoría');
    } finally {
      setGuardandoCat(false);
    }
  };

  const handleAbrirEditarCat = (cat) => {
    setCatParaEditar({ ...cat });
    setShowModalEditarCat(true);
  };

  const handleGuardarEditarCat = async (e) => {
    e.preventDefault();
    if (!catParaEditar) return;
    const nombreLimpio = (catParaEditar.nombre || '').trim();
    if (!nombreLimpio) {
      toast.warning('El nombre de la categoría no puede estar vacío');
      return;
    }

    try {
      setGuardandoCat(true);
      await categoriasService.actualizarCategoria(catParaEditar.id, {
        nombre: nombreLimpio,
        icono: catParaEditar.icono || '🏷️',
        activo: Boolean(catParaEditar.activo)
      });

      toast.success(`Categoría "${nombreLimpio}" actualizada`);
      setShowModalEditarCat(false);
      setCatParaEditar(null);
      await cargarCategoriasNegocio();
    } catch (err) {
      console.error('Error actualizando categoría:', err);
      toast.error(err.message || 'Error al actualizar la categoría');
    } finally {
      setGuardandoCat(false);
    }
  };

  const handleToggleEstadoCat = async (cat) => {
    const nuevoEstado = !cat.activo;
    try {
      await categoriasService.cambiarEstadoCategoria(cat.id, nuevoEstado);
      toast.success(
        nuevoEstado
          ? `Categoría "${cat.nombre}" activada`
          : `Categoría "${cat.nombre}" desactivada`
      );
      await cargarCategoriasNegocio();
    } catch (err) {
      console.error('Error cambiando estado de categoría:', err);
      toast.error(err.message || 'Error al cambiar estado');
    }
  };

  const handleAbrirEliminarCat = async (cat) => {
    setCatParaEliminar(cat);
    setAlertaUsoCat(null);
    setShowModalEliminarCat(true);

    // Verificar si está en uso
    const { enUso, totalMovimientos } = await categoriasService.verificarUsoCategoria(cat.id, cat.nombre);
    if (enUso) {
      setAlertaUsoCat(
        `Esta categoría está siendo utilizada en movimientos históricos (${totalMovimientos || 'registros'}). ` +
        `Para proteger la integridad de tus datos contables no es posible eliminarla definitivamente, pero puedes desactivarla para que no aparezca en nuevos cargos.`
      );
    }
  };

  const handleConfirmarEliminarCat = async () => {
    if (!catParaEliminar) return;
    try {
      setEliminandoCat(true);
      await categoriasService.eliminarCategoria(catParaEliminar.id, catParaEliminar.nombre);
      toast.success(`Categoría "${catParaEliminar.nombre}" eliminada`);
      setShowModalEliminarCat(false);
      setCatParaEliminar(null);
      await cargarCategoriasNegocio();
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
      toast.error(err.message || 'Error al eliminar categoría');
    } finally {
      setEliminandoCat(false);
    }
  };

  const showMessage = (type, message) => {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'warning') {
      toast.warning(message);
    } else if (type === 'error') {
      toast.error(message);
    } else {
      toast.info(message);
    }
  };

  // Guardar datos de perfil
  const handleGuardarPerfil = async (e) => {
    e.preventDefault();
    setSavingPerfil(true);
    try {
      const whatsappLimpio = (whatsapp || '').trim();

      const { error: authError } = await supabase.auth.updateUser({
        data: { nombre, telefono, whatsapp: whatsappLimpio }
      });
      if (authError) throw authError;

      if (usuario?.id) {
        await supabase
          .from('usuarios')
          .update({ nombre, updated_at: new Date().toISOString() })
          .eq('id', usuario.id);
      }

      // Guardar WhatsApp en la tabla del negocio asociado
      const negId = negocioActual?.id || usuario?.negocio_id || localStorage.getItem('active_negocio_id');
      if (negId && negId !== 'undefined') {
        const { error: negError } = await supabase
          .from('negocios')
          .update({
            whatsapp: whatsappLimpio,
            updated_at: new Date().toISOString(),
          })
          .eq('id', negId);

        if (negError) {
          console.warn('Advertencia al guardar WhatsApp en la tabla negocios:', negError);
        } else {
          actualizarNegocioActual({
            whatsapp: whatsappLimpio,
          });
        }
      }

      showMessage('success', '¡Perfil y WhatsApp guardados con éxito!');
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      showMessage('error', 'No se pudo actualizar el perfil: ' + (error.message || 'Error desconocido'));
    } finally {
      setSavingPerfil(false);
    }
  };

  // Guardar configuración del negocio
  const handleGuardarNegocio = async (e) => {
    e.preventDefault();
    setSavingNegocio(true);
    try {
      const data = {
        nombreNegocio: nombreNegocio.trim(),
        logoUrl: logoUrl ? logoUrl.trim() : '',
        moneda,
        simboloMoneda,
        mensajeCobro
      };
      updateConfig(data);

      const negId = usuario?.negocio_id || negocioActual?.id || localStorage.getItem('active_negocio_id');
      if (negId && negId !== 'undefined') {
        const whatsappLimpio = (whatsapp || '').trim();
        const { error: errNegocio } = await supabase
          .from('negocios')
          .update({
            nombre: nombreNegocio.trim(),
            logo_url: logoUrl ? logoUrl.trim() : null,
            whatsapp: whatsappLimpio,
            updated_at: new Date().toISOString(),
          })
          .eq('id', negId);

        if (errNegocio) {
          console.warn('Advertencia al guardar negocio en Supabase:', errNegocio);
        } else {
          actualizarNegocioActual({
            nombre: nombreNegocio.trim(),
            logo_url: logoUrl ? logoUrl.trim() : null,
            whatsapp: whatsappLimpio,
          });
        }
      }

      showMessage('success', '¡Preferencias y logotipo del negocio guardados correctamente!');
    } catch (error) {
      console.error('Error guardando negocio:', error);
      showMessage('error', 'Error al guardar preferencias: ' + (error.message || ''));
    } finally {
      setSavingNegocio(false);
    }
  };

  // Cambiar contraseña
  const handleCambiarPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showMessage('error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('error', 'Las contraseñas no coinciden');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      showMessage('success', '¡Contraseña actualizada exitosamente!');
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      showMessage('error', error.message || 'Error al cambiar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  // Descargar archivo helper
  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Exportar Backup Completo JSON consultando datos reales de Supabase
  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const backup = await backupService.generarBackupCompleto();

      const nombreNegocioSanitizado = (backup.negocio?.nombre || 'control-deudas')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-');
      const dateStr = new Date().toISOString().slice(0, 10);
      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      triggerDownload(blob, `backup-${nombreNegocioSanitizado}-${dateStr}.json`);

      showMessage(
        'success',
        `Backup generado con éxito: ${backup.totalClientas} clientas, ${backup.totalCuentas} cuentas, ${backup.totalMovimientos} movimientos, ${backup.totalDetallesCargo} detalles de cargo, ${backup.totalCategorias} categorías.`
      );
    } catch (error) {
      console.error('Error exportando backup:', error);
      showMessage('error', error.message || 'Error al generar la copia de seguridad desde Supabase');
    } finally {
      setExporting(false);
    }
  };

  // Exportar Clientas CSV
  const handleExportClientasCSV = async () => {
    try {
      const clientas = await clientasService.getClientas();
      if (!clientas || clientas.length === 0) {
        showMessage('warning', 'No hay clientas para exportar');
        return;
      }

      const headers = ['Nombre', 'Teléfono', 'Dirección', 'Saldo Pendiente', 'Notas', 'Fecha Registro'];
      const rows = clientas.map(c => [
        `"${(c.nombre || '').replace(/"/g, '""')}"`,
        `"${(c.telefono || '').replace(/"/g, '""')}"`,
        `"${(c.direccion || '').replace(/"/g, '""')}"`,
        (c.saldo || 0).toFixed(2),
        `"${(c.notas || '').replace(/"/g, '""')}"`,
        c.created_at ? new Date(c.created_at).toLocaleDateString('es-PE') : ''
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const dateStr = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `clientas-${dateStr}.csv`);
      showMessage('success', `Listado de ${clientas.length} clientas exportado en CSV`);
    } catch (error) {
      console.error('Error exportando clientas:', error);
      showMessage('error', 'Error al exportar clientas a CSV');
    }
  };

  // Exportar Movimientos CSV
  const handleExportMovimientosCSV = async () => {
    try {
      const movimientos = await cuentasService.getAllMovimientos();
      if (!movimientos || movimientos.length === 0) {
        showMessage('warning', 'No hay movimientos para exportar');
        return;
      }

      const headers = ['Fecha', 'Clienta', 'Tipo', 'Monto', 'Descripción'];
      const rows = movimientos.map(m => [
        m.fecha ? new Date(m.fecha).toLocaleString('es-PE') : '',
        `"${(m.clienta_nombre || '').replace(/"/g, '""')}"`,
        m.tipo === 'venta' ? 'VENTA' : 'PAGO',
        (m.monto || 0).toFixed(2),
        `"${(m.descripcion || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const dateStr = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `movimientos-${dateStr}.csv`);
      showMessage('success', `Exportados ${movimientos.length} movimientos a CSV`);
    } catch (error) {
      console.error('Error exportando movimientos:', error);
      showMessage('error', 'Error al exportar movimientos a CSV');
    }
  };

  // =============================================
  // FLUJO DE IMPORTACIÓN DE BACKUP
  // =============================================

  // Selección y lectura de archivo JSON
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setSelectedFile({ name: file.name, size: file.size, data: null });
      setFileValidation({
        valid: false,
        message: 'El archivo seleccionado debe ser un archivo de tipo .json'
      });
      setImportError(null);
      setImportResult(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let text = event.target.result;
        // Eliminar posible BOM de UTF-8
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1);
        }

        const parsed = JSON.parse(text);

        // Validar estrictamente la estructura según requerimientos v1.2
        backupService.validarBackupJSON(parsed);

        setSelectedFile({
          name: file.name,
          size: file.size,
          data: parsed
        });

        const numClientas = parsed.totalClientas ?? parsed.datos?.clientas?.length ?? 0;
        const numMovimientos = parsed.totalMovimientos ?? parsed.datos?.movimientos?.length ?? 0;
        const numCuentas = parsed.totalCuentas ?? parsed.datos?.cuentas?.length ?? 0;
        const numDetalles = parsed.totalDetallesCargo ?? parsed.datos?.detalles_cargo?.length ?? 0;
        const numCategorias = parsed.totalCategorias ?? parsed.datos?.categorias?.length ?? 0;
        const nomNegocio = parsed.negocio?.nombre || 'Negocio';

        setFileValidation({
          valid: true,
          message: `Estructura válida (v1.2) de "${nomNegocio}": ${numClientas} clientas, ${numCuentas} cuentas, ${numMovimientos} movimientos, ${numDetalles} detalles de cargo, ${numCategorias} categorías.`
        });
        setImportError(null);
        setImportResult(null);
      } catch (err) {
        setSelectedFile({ name: file.name, size: file.size, data: null });
        setFileValidation({
          valid: false,
          message: err.message || 'El archivo no contiene un JSON válido.'
        });
        setImportError(null);
        setImportResult(null);
      }
    };

    reader.onerror = () => {
      setSelectedFile({ name: file.name, size: file.size, data: null });
      setFileValidation({
        valid: false,
        message: 'Ocurrió un error al intentar leer el archivo desde el dispositivo.'
      });
    };

    reader.readAsText(file);
  };

  const handleResetImport = () => {
    setSelectedFile(null);
    setFileValidation(null);
    setImportError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Confirmar y ejecutar RPC importar_backup
  const handleConfirmarImportacion = async () => {
    if (!selectedFile?.data || !fileValidation?.valid) return;

    setImporting(true);
    setImportError(null);

    try {
      // 1. Ejecutar RPC en Supabase
      const resultado = await backupService.importarBackup(selectedFile.data);

      setImportResult(resultado);

      // 2. Actualizar inmediatamente el AuthContext con el nuevo negocio creado
      const nuevoNegocioId = resultado.negocio_id || resultado.negocioId;
      if (nuevoNegocioId && typeof cambiarNegocio === 'function') {
        await cambiarNegocio(nuevoNegocioId);
      }

      showMessage(
        'success',
        `¡Backup importado exitosamente! Se creó el nuevo negocio (ID: ${nuevoNegocioId || 'asignado'}).`
      );
    } catch (err) {
      console.error('Error importando backup:', err);
      setImportError(err.message || 'Error desconocido al importar el backup.');
      showMessage('error', err.message || 'Error al importar el backup.');
    } finally {
      setImporting(false);
    }
  };

  const initial = (nombre || session?.user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="configuracion-page">
      {/* Header */}
      <div className="configuracion-header">
        <div className="config-header-titles">
          <h1>Configuración del Sistema</h1>
          <p className="configuracion-subtitle">
            Administra tu perfil, personalización del negocio, tema visual y respaldos
          </p>
        </div>
        <div className="config-status-badge">
          <span className="status-indicator"></span>
          <span>Supabase Conectado</span>
        </div>
      </div>

      {/* Navegación por pestañas */}
      <div className="config-tabs">
        <button
          className={`config-tab-btn ${activeTab === 'perfil' ? 'active' : ''}`}
          onClick={() => setActiveTab('perfil')}
        >
          <RiUserLine size={18} />
          Mi Perfil
        </button>

        <button
          className={`config-tab-btn ${activeTab === 'negocio' ? 'active' : ''}`}
          onClick={() => setActiveTab('negocio')}
        >
          <RiStoreLine size={18} />
          Negocio & Cobranzas
        </button>

        <button
          className={`config-tab-btn ${activeTab === 'categorias' ? 'active' : ''}`}
          onClick={() => setActiveTab('categorias')}
        >
          <RiPriceTag3Line size={18} />
          Categorías
        </button>

        <button
          className={`config-tab-btn ${activeTab === 'apariencia' ? 'active' : ''}`}
          onClick={() => setActiveTab('apariencia')}
        >
          <RiSunLine size={18} />
          Apariencia
        </button>

        <button
          className={`config-tab-btn ${activeTab === 'seguridad' ? 'active' : ''}`}
          onClick={() => setActiveTab('seguridad')}
        >
          <RiLockLine size={18} />
          Seguridad
        </button>

        <button
          className={`config-tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          <RiDownloadLine size={18} />
          Copia de Seguridad
        </button>
      </div>

      {/* Contenido de pestañas */}
      <div className="config-content">
        {/* TAB: PERFIL */}
        {activeTab === 'perfil' && (
          <div className="config-card">
            <div className="card-header">
              <div className="profile-banner">
                <div className="profile-large-avatar">{initial}</div>
                <div className="profile-banner-info">
                  <h2>{nombre || 'Usuario'}</h2>
                  <p className="profile-banner-role">
                    Rol: <strong>{usuario?.rol || 'Administrador Principal'}</strong>
                  </p>
                  <p className="profile-banner-email">{session?.user?.email}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleGuardarPerfil} className="config-form">
              <div className="form-group-grid">
                <div className="form-field">
                  <label htmlFor="nombre">Nombre Completo</label>
                  <input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Marco Aurelio"
                    required
                  />
                  <small>Nombre que se mostrará en los recibos y la interfaz.</small>
                </div>

                <div className="form-field">
                  <label htmlFor="whatsapp">WhatsApp</label>
                  <input
                    id="whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="999 999 999"
                  />
                  <small>Número de WhatsApp utilizado por el negocio (opcional).</small>
                </div>

                <div className="form-field full-width">
                  <label htmlFor="email">Correo Electrónico</label>
                  <input
                    id="email"
                    type="email"
                    value={session?.user?.email || ''}
                    disabled
                    className="input-disabled"
                  />
                  <small>El email está asociado a tu cuenta de Supabase Auth y no se puede cambiar aquí.</small>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={savingPerfil}>
                  {savingPerfil ? (
                    <>
                      <div className="btn-spinner" /> Guardando...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      Guardar Cambios de Perfil
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: NEGOCIO */}
        {activeTab === 'negocio' && (
          <div className="config-card">
            <div className="card-header">
              <h2>Preferencias del Negocio</h2>
              <p className="card-subtitle">Personaliza tu logotipo, moneda, nombre comercial y mensajes de cobranza.</p>
            </div>

            <form onSubmit={handleGuardarNegocio} className="config-form">
              <div className="form-group-grid">
                <div className="form-field full-width">
                  <ImageUploader
                    value={logoUrl}
                    onChange={(newUrl) => setLogoUrl(newUrl)}
                    label="Logotipo del Negocio"
                    description="Sube la imagen de tu negocio. Se mostrará en el menú lateral, encabezados y en toda la plataforma."
                    fallbackSrc="/logo.png"
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="negocio">Nombre Comercial</label>
                  <input
                    id="negocio"
                    type="text"
                    value={nombreNegocio}
                    onChange={(e) => setNombreNegocio(e.target.value)}
                    placeholder="Ej. Inversiones Marco - Préstamos"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="moneda">Moneda Principal</label>
                  <select
                    id="moneda"
                    value={moneda}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMoneda(val);
                      if (val === 'PEN') setSimboloMoneda('S/');
                      else if (val === 'USD' || val === 'MXN' || val === 'COP' || val === 'CLP' || val === 'ARS') setSimboloMoneda('$');
                      else if (val === 'EUR') setSimboloMoneda('€');
                      else if (val === 'BOB') setSimboloMoneda('Bs.');
                      else if (val === 'GTQ') setSimboloMoneda('Q');
                      else if (val === 'CRC') setSimboloMoneda('₡');
                      else if (val === 'HNL') setSimboloMoneda('L');
                    }}
                  >
                    <option value="PEN">Soles Peruanos (PEN - S/)</option>
                    <option value="USD">Dólar Estadounidense (USD - $)</option>
                    <option value="EUR">Euros (EUR - €)</option>
                    <option value="MXN">Pesos Mexicanos (MXN - $)</option>
                    <option value="COP">Pesos Colombianos (COP - $)</option>
                    <option value="CLP">Pesos Chilenos (CLP - $)</option>
                    <option value="ARS">Pesos Argentinos (ARS - $)</option>
                    <option value="BOB">Bolivianos (BOB - Bs.)</option>
                    <option value="GTQ">Quetzales (GTQ - Q)</option>
                    <option value="CRC">Colones Costarricenses (CRC - ₡)</option>
                    <option value="HNL">Lempiras Hondureños (HNL - L)</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="simboloMoneda">Símbolo de Moneda</label>
                  <input
                    id="simboloMoneda"
                    type="text"
                    value={simboloMoneda}
                    onChange={(e) => setSimboloMoneda(e.target.value)}
                    placeholder="Ej: S/, $, €, Bs."
                    required
                    maxLength="6"
                  />
                  <small className="help-text">
                    Símbolo visible en tarjetas, balances y reportes de toda la app.
                  </small>
                </div>

                <div className="form-field full-width">
                  <label htmlFor="mensajeCobro">Plantilla de Recordatorio de Cobro (WhatsApp)</label>
                  <textarea
                    id="mensajeCobro"
                    rows="3"
                    value={mensajeCobro}
                    onChange={(e) => setMensajeCobro(e.target.value)}
                    placeholder="Escribe el mensaje plantilla..."
                  />
                  <small className="help-text">
                    Variables disponibles: <code>{'{clienta}'}</code>, <code>{'{saldo}'}</code>
                  </small>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={savingNegocio}>
                  {savingNegocio ? 'Guardando...' : 'Guardar Preferencias'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: CATEGORÍAS */}
        {activeTab === 'categorias' && (
          <div className="config-card">
            <div className="card-header config-cat-header-split">
              <div>
                <h2>Categorías del Negocio</h2>
                <p className="card-subtitle">
                  Administra las categorías de productos disponibles para los cargos y ventas de {nombreNegocio}.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary btn-nueva-cat-top"
                onClick={() => {
                  setFormCrearCat({ nombre: '', icono: '👕', color: '#38bdf8' });
                  setShowModalCrearCat(true);
                }}
              >
                <RiAddLine size={18} />
                <span>Nueva Categoría</span>
              </button>
            </div>

            {/* Resumen de Estadísticas de Categorías */}
            <div className="config-cat-stats-grid">
              <div className="cat-stat-card">
                <span className="cat-stat-num">{categoriasList.length}</span>
                <span className="cat-stat-lbl">Total Categorías</span>
              </div>
              <div className="cat-stat-card card-stat-activas">
                <span className="cat-stat-num">{categoriasList.filter((c) => c.activo).length}</span>
                <span className="cat-stat-lbl">Activas (Visibles)</span>
              </div>
              <div className="cat-stat-card card-stat-inactivas">
                <span className="cat-stat-num">{categoriasList.filter((c) => !c.activo).length}</span>
                <span className="cat-stat-lbl">Desactivadas</span>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="config-cat-filters-bar">
              <div className="cat-filter-pills">
                <button
                  type="button"
                  className={`cat-pill ${filtroEstadoCat === 'todas' ? 'active' : ''}`}
                  onClick={() => setFiltroEstadoCat('todas')}
                >
                  Todas ({categoriasList.length})
                </button>
                <button
                  type="button"
                  className={`cat-pill ${filtroEstadoCat === 'activas' ? 'active' : ''}`}
                  onClick={() => setFiltroEstadoCat('activas')}
                >
                  Activas ({categoriasList.filter((c) => c.activo).length})
                </button>
                <button
                  type="button"
                  className={`cat-pill ${filtroEstadoCat === 'inactivas' ? 'active' : ''}`}
                  onClick={() => setFiltroEstadoCat('inactivas')}
                >
                  Inactivas ({categoriasList.filter((c) => !c.activo).length})
                </button>
              </div>

              <button
                type="button"
                className="btn-refresh-cats"
                onClick={cargarCategoriasNegocio}
                disabled={loadingCategorias}
                title="Recargar categorías desde Supabase"
              >
                <RiRefreshLine size={16} className={loadingCategorias ? 'spin-icon' : ''} />
                <span>Actualizar</span>
              </button>
            </div>

            {/* Listado de Categorías */}
            {loadingCategorias ? (
              <div className="cat-loading-box">
                <div className="btn-spinner" />
                <span>Cargando categorías del negocio...</span>
              </div>
            ) : categoriasList.length === 0 ? (
              <div className="sin-cuentas-card" style={{ padding: '2.5rem 1rem' }}>
                <div className="sin-cuentas-icon" style={{ width: '56px', height: '56px' }}>
                  🏷️
                </div>
                <h3>Sin categorías registradas</h3>
                <p>Crea tu primera categoría para organizar las prendas y productos que entregas.</p>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setFormCrearCat({ nombre: '', icono: '👕', color: '#38bdf8' });
                    setShowModalCrearCat(true);
                  }}
                >
                  + Crear primera categoría
                </button>
              </div>
            ) : (
              <div className="config-cat-list-container">
                {categoriasList
                  .filter((cat) => {
                    if (filtroEstadoCat === 'activas') return cat.activo;
                    if (filtroEstadoCat === 'inactivas') return !cat.activo;
                    return true;
                  })
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className={`config-cat-item-card ${!cat.activo ? 'cat-item-desactivada' : ''}`}
                    >
                      <div className="cat-item-left">
                        <div
                          className="cat-item-icon-circle"
                          style={{ backgroundColor: cat.color ? `${cat.color}22` : '#e0f2fe' }}
                        >
                          <span>{cat.icono || '🏷️'}</span>
                        </div>
                        <div className="cat-item-info">
                          <h4 className="cat-item-nombre">{cat.nombre}</h4>
                          <div className="cat-item-meta">
                            <span className={`cat-status-badge ${cat.activo ? 'badge-activa' : 'badge-inactiva'}`}>
                              {cat.activo ? '● Activa' : '○ Desactivada'}
                            </span>
                            <span className="cat-date-text">
                              Creada: {new Date(cat.created_at || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="cat-item-actions">
                        {/* Botones visibles en desktop */}
                        <button
                          type="button"
                          className="btn-cat-action btn-cat-edit btn-cat-desktop"
                          onClick={() => handleAbrirEditarCat(cat)}
                          title="Editar nombre e ícono"
                        >
                          <RiEditLine size={15} />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          className={`btn-cat-action btn-cat-desktop ${cat.activo ? 'btn-cat-toggle-off' : 'btn-cat-toggle-on'}`}
                          onClick={() => handleToggleEstadoCat(cat)}
                          title={cat.activo ? 'Desactivar para nuevos cargos' : 'Activar categoría'}
                        >
                          {cat.activo ? (
                            <><RiToggleLine size={15} /><span>Desactivar</span></>
                          ) : (
                            <><RiCheckLine size={15} /><span>Activar</span></>
                          )}
                        </button>

                        <button
                          type="button"
                          className="btn-cat-action btn-cat-delete btn-cat-desktop"
                          onClick={() => handleAbrirEliminarCat(cat)}
                          title="Eliminar de forma segura"
                        >
                          <RiDeleteBinLine size={15} />
                          <span>Eliminar</span>
                        </button>

                        {/* Botón 3 puntos visible solo en móvil */}
                        <div className="cat-menu-wrap" ref={openMenuCatId === cat.id ? catMenuRef : null}>
                          <button
                            type="button"
                            className="btn-cat-more"
                            onClick={() => setOpenMenuCatId(openMenuCatId === cat.id ? null : cat.id)}
                            title="Más opciones"
                            aria-label="Más opciones"
                          >
                            <RiMoreLine size={20} />
                          </button>

                          {openMenuCatId === cat.id && (
                            <div className="cat-dropdown-menu">
                              <button
                                type="button"
                                className="cat-dropdown-item"
                                onClick={() => { handleAbrirEditarCat(cat); setOpenMenuCatId(null); }}
                              >
                                <RiEditLine size={15} />
                                <span>Editar</span>
                              </button>
                              <button
                                type="button"
                                className={`cat-dropdown-item ${cat.activo ? 'item-toggle-off' : 'item-toggle-on'}`}
                                onClick={() => { handleToggleEstadoCat(cat); setOpenMenuCatId(null); }}
                              >
                                {cat.activo ? (
                                  <><RiToggleLine size={15} /><span>Desactivar</span></>
                                ) : (
                                  <><RiCheckLine size={15} /><span>Activar</span></>
                                )}
                              </button>
                              <button
                                type="button"
                                className="cat-dropdown-item item-delete"
                                onClick={() => { handleAbrirEliminarCat(cat); setOpenMenuCatId(null); }}
                              >
                                <RiDeleteBinLine size={15} />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: APARIENCIA */}
        {activeTab === 'apariencia' && (
          <div className="config-card">
            <div className="card-header">
              <h2>Apariencia y Tema Visual</h2>
              <p className="card-subtitle">
                Personaliza la apariencia para trabajar con comodidad de día o de noche.
              </p>
            </div>

            <div className="theme-selection-grid">
              {/* Tema Claro */}
              <div
                className={`theme-card ${!isDark ? 'theme-active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <div className="theme-preview theme-preview-light">
                  <div className="preview-topbar">
                    <div className="preview-dot"></div>
                    <div className="preview-dot"></div>
                    <div className="preview-dot"></div>
                  </div>
                  <div className="preview-body">
                    <div className="preview-sidebar"></div>
                    <div className="preview-content">
                      <div className="preview-box"></div>
                      <div className="preview-line"></div>
                    </div>
                  </div>
                </div>
                <div className="theme-card-footer">
                  <div className="theme-info">
                    <div className="theme-icon sun-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="5"/>
                        <line x1="12" y1="1" x2="12" y2="3"/>
                        <line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="3" y2="12"/>
                        <line x1="21" y1="12" x2="23" y2="12"/>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                      </svg>
                    </div>
                    <div>
                      <h3>Tema Claro</h3>
                      <p>Fondo blanco limpio con máximo contraste para el día</p>
                    </div>
                  </div>
                  {!isDark && <span className="theme-check-badge">Activo</span>}
                </div>
              </div>

              {/* Tema Oscuro */}
              <div
                className={`theme-card ${isDark ? 'theme-active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <div className="theme-preview theme-preview-dark">
                  <div className="preview-topbar">
                    <div className="preview-dot"></div>
                    <div className="preview-dot"></div>
                    <div className="preview-dot"></div>
                  </div>
                  <div className="preview-body">
                    <div className="preview-sidebar dark-sb"></div>
                    <div className="preview-content">
                      <div className="preview-box dark-box"></div>
                      <div className="preview-line dark-line"></div>
                    </div>
                  </div>
                </div>
                <div className="theme-card-footer">
                  <div className="theme-info">
                    <div className="theme-icon moon-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                      </svg>
                    </div>
                    <div>
                      <h3>Tema Oscuro</h3>
                      <p>Tonos oscuros elegantes que reducen la fatiga visual</p>
                    </div>
                  </div>
                  {isDark && <span className="theme-check-badge">Activo</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: SEGURIDAD */}
        {activeTab === 'seguridad' && (
          <div className="config-card">
            <div className="card-header">
              <h2>Seguridad y Acceso</h2>
              <p className="card-subtitle">Actualiza tu contraseña para mantener tu cuenta protegida.</p>
            </div>

            <form onSubmit={handleCambiarPassword} className="config-form">
              <div className="form-group-grid">
                <div className="form-field">
                  <label htmlFor="newPassword">Nueva Contraseña</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={savingPassword}>
                  {savingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: BACKUP */}
        {activeTab === 'backup' && (
          <div className="config-card">
            <div className="card-header">
              <h2>Copia de Seguridad y Exportación</h2>
              <p className="card-subtitle">
                Descarga tus datos para respaldo local o restaura una copia de seguridad en Supabase.
              </p>
            </div>

            {/* Cuadrícula de Exportación */}
            <div className="backup-options-grid">
              {/* Opción 1: JSON completo */}
              <div className="backup-box highlight">
                <div className="backup-icon json-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div className="backup-text">
                  <h3>Backup Completo (JSON)</h3>
                  <p>
                    Incluye todas las clientas, cuentas, movimientos (ventas/cobros), detalles de cargo, categorías y datos del negocio desde Supabase.
                    Ideal para guardar como copia de seguridad permanente y futura restauración.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-backup-action btn-json"
                  onClick={handleExportBackup}
                  disabled={exporting}
                >
                  {exporting ? 'Consultando Supabase...' : 'Descargar Backup Completo'}
                </button>
              </div>

              {/* Opción 2: CSV Clientas */}
              <div className="backup-box">
                <div className="backup-icon csv-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                  </svg>
                </div>
                <div className="backup-text">
                  <h3>Exportar Clientas (Excel / CSV)</h3>
                  <p>Descarga la lista de clientas con sus teléfonos, direcciones y saldos pendientes.</p>
                </div>
                <button
                  type="button"
                  className="btn-backup-action"
                  onClick={handleExportClientasCSV}
                >
                  Exportar CSV Clientas
                </button>
              </div>

              {/* Opción 3: CSV Movimientos */}
              <div className="backup-box">
                <div className="backup-icon csv-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16V4m0 0L3 8m4-4 4 4"/>
                    <path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
                  </svg>
                </div>
                <div className="backup-text">
                  <h3>Exportar Movimientos (Excel / CSV)</h3>
                  <p>Historial completo de todas las ventas y cobros realizados con fechas y montos.</p>
                </div>
                <button
                  type="button"
                  className="btn-backup-action"
                  onClick={handleExportMovimientosCSV}
                >
                  Exportar CSV Movimientos
                </button>
              </div>
            </div>

            {/* SECCIÓN: IMPORTAR BACKUP JSON */}
            <div className="import-backup-container">
              <div className="import-header">
                <div className="import-icon-wrap">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div>
                  <h3>Importar Backup JSON</h3>
                  <p>Restaura un archivo de backup previamente exportado (versión 1.2) en Supabase.</p>
                </div>
              </div>

              {/* Input de archivo oculto */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />

              {!selectedFile && (
                <div className="import-dropzone" onClick={() => fileInputRef.current?.click()}>
                  <div className="dropzone-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <polyline points="9 15 12 12 15 15" />
                    </svg>
                  </div>
                  <p className="dropzone-title">Haz clic para seleccionar un archivo .json</p>
                  <p className="dropzone-sub">Únicamente archivos de respaldo válidos (v1.2)</p>
                  <button type="button" className="btn-select-file">
                    Seleccionar Archivo JSON
                  </button>
                </div>
              )}

              {selectedFile && (
                <div className="import-file-details">
                  <div className="file-info-header">
                    <div className="file-icon-badge">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="file-meta">
                      <p className="file-name">{selectedFile.name}</p>
                      <p className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    {!importing && (
                      <button type="button" className="btn-cancel-file" onClick={handleResetImport}>
                        Cambiar archivo
                      </button>
                    )}
                  </div>

                  {/* Estado de validación */}
                  {fileValidation && (
                    <div className={`file-validation-badge ${fileValidation.valid ? 'valid' : 'invalid'}`}>
                      <div className="validation-icon">
                        {fileValidation.valid ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                        )}
                      </div>
                      <span>{fileValidation.message}</span>
                    </div>
                  )}

                  {/* Advertencia y confirmación antes de llamar al RPC */}
                  {fileValidation?.valid && !importResult && (
                    <div className="import-confirm-box">
                      <div className="confirm-notice">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <p>
                          <strong>Confirmación requerida:</strong> Esta operación creará un nuevo negocio con los datos del backup. No reemplazará el negocio actual.
                        </p>
                      </div>

                      <div className="import-actions">
                        <button
                          type="button"
                          className="btn-import-confirm"
                          onClick={handleConfirmarImportacion}
                          disabled={importing}
                        >
                          {importing ? (
                            <>
                              <div className="btn-spinner" /> Importando backup...
                            </>
                          ) : (
                            <>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Confirmar e Importar a Supabase
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Banner de error si Supabase devuelve error */}
                  {importError && (
                    <div className="import-error-banner">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      <div>
                        <strong>Error durante la importación:</strong>
                        <p>{importError}</p>
                      </div>
                    </div>
                  )}

                  {/* Resumen del resultado de importación exitosa */}
                  {importResult && (
                    <div className="import-result-card">
                      <div className="result-header">
                        <div className="result-check">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <div>
                          <h4>¡Importación exitosa!</h4>
                          <p>El nuevo negocio ha sido creado y activado en la aplicación.</p>
                        </div>
                      </div>

                      <div className="result-grid">
                        <div className="result-stat-item">
                          <span className="stat-label">Nuevo Negocio ID</span>
                          <span className="stat-value code-font">{importResult.negocio_id || importResult.negocioId || 'Generado'}</span>
                        </div>
                        <div className="result-stat-item">
                          <span className="stat-label">Clientas</span>
                          <span className="stat-value">{importResult.clientas_importadas ?? importResult.clientasImportadas ?? 0}</span>
                        </div>
                        <div className="result-stat-item">
                          <span className="stat-label">Cuentas</span>
                          <span className="stat-value">{importResult.cuentas_importadas ?? importResult.cuentasImportadas ?? 0}</span>
                        </div>
                        <div className="result-stat-item">
                          <span className="stat-label">Movimientos</span>
                          <span className="stat-value">{importResult.movimientos_importados ?? importResult.movimientosImportados ?? 0}</span>
                        </div>
                        <div className="result-stat-item">
                          <span className="stat-label">Detalles de Cargo</span>
                          <span className="stat-value">{importResult.detalles_importados ?? importResult.detallesImportados ?? 0}</span>
                        </div>
                        <div className="result-stat-item">
                          <span className="stat-label">Categorías</span>
                          <span className="stat-value">{importResult.categorias_importadas ?? importResult.categoriasImportadas ?? 0}</span>
                        </div>
                      </div>

                      <button type="button" className="btn-secondary" onClick={handleResetImport}>
                        Importar otro backup
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          MODALES DE ADMINISTRACIÓN DE CATEGORÍAS
          ======================================================== */}

      {/* 1. Modal Crear Categoría */}
      {showModalCrearCat && (
        <div className="modal-overlay" onClick={() => setShowModalCrearCat(false)}>
          <div className="modal-content modal-cat-admin-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="cat-modal-title-wrap">
                <span className="cat-modal-badge-icon">{formCrearCat.icono || '🏷️'}</span>
                <div>
                  <h3>Nueva Categoría de Negocio</h3>
                  <p className="card-subtitle">Estará disponible para nuevos cargos en {nombreNegocio}</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowModalCrearCat(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleGuardarCrearCat}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="crear-cat-nombre">Nombre de la Categoría *</label>
                <input
                  id="crear-cat-nombre"
                  type="text"
                  placeholder="Ej: Ropa deportiva, Calzado dama, Perfumería..."
                  value={formCrearCat.nombre}
                  onChange={(e) => setFormCrearCat({ ...formCrearCat, nombre: e.target.value })}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Seleccionar Ícono / Emoji</label>
                <div className="quick-cat-emojis">
                  {['👕', '👗', '👟', '✨', '👜', '💍', '💄', '👶', '📚', '🎒', '🕶️', '⌚', '🎁', '🧸', '🧴', '🛍️', '📦', '🏷️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`btn-emoji-select ${formCrearCat.icono === emoji ? 'active' : ''}`}
                      onClick={() => setFormCrearCat({ ...formCrearCat, icono: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModalCrearCat(false)}
                  disabled={guardandoCat}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guardandoCat || !formCrearCat.nombre.trim()}
                >
                  {guardandoCat ? 'Guardando...' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Editar Categoría */}
      {showModalEditarCat && catParaEditar && (
        <div className="modal-overlay" onClick={() => setShowModalEditarCat(false)}>
          <div className="modal-content modal-cat-admin-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="cat-modal-title-wrap">
                <span className="cat-modal-badge-icon">{catParaEditar.icono || '🏷️'}</span>
                <div>
                  <h3>Editar Categoría</h3>
                  <p className="card-subtitle">Modifica el nombre o icono visible</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowModalEditarCat(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleGuardarEditarCat}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="edit-cat-nombre">Nombre de la Categoría *</label>
                <input
                  id="edit-cat-nombre"
                  type="text"
                  value={catParaEditar.nombre}
                  onChange={(e) => setCatParaEditar({ ...catParaEditar, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Ícono / Emoji</label>
                <div className="quick-cat-emojis">
                  {['👕', '👗', '👟', '✨', '👜', '💍', '💄', '👶', '📚', '🎒', '🕶️', '⌚', '🎁', '🧸', '🧴', '🛍️', '📦', '🏷️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`btn-emoji-select ${catParaEditar.icono === emoji ? 'active' : ''}`}
                      onClick={() => setCatParaEditar({ ...catParaEditar, icono: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModalEditarCat(false)}
                  disabled={guardandoCat}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guardandoCat || !catParaEditar.nombre.trim()}
                >
                  {guardandoCat ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Eliminar Categoría (con comprobación de seguridad de uso) */}
      {showModalEliminarCat && catParaEliminar && (
        <div className="modal-overlay" onClick={() => setShowModalEliminarCat(false)}>
          <div className="modal-content modal-cat-delete-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="cat-modal-title-wrap">
                <span className="cat-modal-badge-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
                  ⚠️
                </span>
                <div>
                  <h3>Eliminar Categoría</h3>
                  <p className="card-subtitle">{catParaEliminar.nombre}</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowModalEliminarCat(false)}>
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1rem 0' }}>
              {alertaUsoCat ? (
                <div className="cat-in-use-alert">
                  <div className="alert-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="alert-text">
                    <h4>No se puede eliminar permanentemente</h4>
                    <p>{alertaUsoCat}</p>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--color-text, #334155)', fontSize: '0.95rem' }}>
                  ¿Estás seguro de que deseas eliminar permanentemente la categoría{' '}
                  <strong>"{catParaEliminar.nombre}"</strong>?
                  <br />
                  <small style={{ color: 'var(--color-textSecondary, #64748b)', marginTop: '0.35rem', display: 'block' }}>
                    Esta acción no se puede deshacer.
                  </small>
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowModalEliminarCat(false)}
                disabled={eliminandoCat}
              >
                Cerrar
              </button>

              {alertaUsoCat ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    await handleToggleEstadoCat(catParaEliminar);
                    setShowModalEliminarCat(false);
                  }}
                >
                  {catParaEliminar.activo ? 'Desactivar Categoría' : 'Mantener Desactivada'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleConfirmarEliminarCat}
                  disabled={eliminandoCat}
                >
                  {eliminandoCat ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer info sistema */}
      <div className="config-system-info">
        <p>Control de Deudas Web v1.2.0 • Conectado a Supabase PostgreSQL • {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
