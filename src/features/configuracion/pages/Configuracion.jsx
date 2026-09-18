import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useConfig } from '../../../context/ConfigContext';
import { useToast } from '../../../context/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { supabase } from '../../../lib/supabaseClient';
import { clientasService } from '../../../services/clientasService';
import { cuentasService } from '../../../services/cuentasService';
import { backupService } from '../../../services/backupService';
import { categoriasService } from '../../../services/categoriasService';
import {
  RiUserLine,
  RiStoreLine,
  RiPriceTag3Line,
  RiSunLine,
  RiLockLine,
  RiDownloadLine,
  RiTeamLine
} from 'react-icons/ri';
import TabPerfil from '../components/TabPerfil/TabPerfil';
import TabNegocio from '../components/TabNegocio/TabNegocio';
import TabCategorias from '../components/TabCategorias/TabCategorias';
import TabApariencia from '../components/TabApariencia/TabApariencia';
import TabSeguridad from '../components/TabSeguridad/TabSeguridad';
import TabBackup from '../components/TabBackup/TabBackup';
import TabEquipo from '../components/TabEquipo/TabEquipo';
import ModalCrearCategoria from '../components/ModalCrearCategoria/ModalCrearCategoria';
import ModalEditarCategoria from '../components/ModalEditarCategoria/ModalEditarCategoria';
import ModalEliminarCategoria from '../components/ModalEliminarCategoria/ModalEliminarCategoria';
import './Configuracion.css';

export default function Configuracion() {
  const { usuario, session, negocioActual, actualizarNegocioActual, cambiarNegocio } = useAuth();
  const { isAdmin } = usePermissions();
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

        // Validar la estructura según los formatos soportados (Android v1.0 o Web v1.2)
        const info = backupService.validarBackupJSON(parsed);

        setSelectedFile({
          name: file.name,
          size: file.size,
          data: parsed,
          info
        });

        if (info.formato === 'ANDROID_V1') {
          setFileValidation({
            valid: true,
            message: `✅ Backup de APK Android (v1.0) detectado: ${info.totalClientas} clientas, ${info.totalCuentas} cuentas, ${info.totalMovimientos} movimientos del negocio "${info.nombreNegocio}".`
          });
        } else {
          setFileValidation({
            valid: true,
            message: `✅ Backup Web (v1.2) detectado: ${info.totalClientas} clientas, ${info.totalCuentas} cuentas, ${info.totalMovimientos} movimientos, ${info.totalCategorias} categorías de "${info.nombreNegocio}".`
          });
        }
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

  // Confirmar y ejecutar importación
  const handleConfirmarImportacion = async () => {
    if (!selectedFile?.data || !fileValidation?.valid) return;

    setImporting(true);
    setImportError(null);

    try {
      // 1. Ejecutar importación en Supabase
      const resultado = await backupService.importarBackup(selectedFile.data);

      setImportResult(resultado);

      // 2. Actualizar inmediatamente el AuthContext con el negocio actualizado
      const nuevoNegocioId = resultado.negocio_id || resultado.negocioId;
      if (nuevoNegocioId && typeof cambiarNegocio === 'function') {
        await cambiarNegocio(nuevoNegocioId);
      }

      const totalCli = resultado.totalClientas || 0;
      const totalCta = resultado.totalCuentas || 0;
      const totalMov = resultado.totalMovimientos || 0;
      const nomNeg = resultado.nombreNegocio || nombreNegocio || 'tu negocio';

      showMessage(
        'success',
        `¡Backup importado exitosamente! Se importaron ${totalCli} clientas, ${totalCta} cuentas y ${totalMov} movimientos a "${nomNeg}".`
      );

      // Recargar datos locales del negocio
      if (resultado.nombreNegocio) {
        setNombreNegocio(resultado.nombreNegocio);
      }
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

        {isAdmin && (
          <button
            className={`config-tab-btn ${activeTab === 'equipo' ? 'active' : ''}`}
            onClick={() => setActiveTab('equipo')}
          >
            <RiTeamLine size={18} />
            Mi Equipo
          </button>
        )}
      </div>

      {/* Contenido de pestañas */}
      <div className="config-content">
        {/* TAB: PERFIL */}
        {activeTab === 'perfil' && (
          <TabPerfil
            initial={initial}
            nombre={nombre}
            setNombre={setNombre}
            telefono={telefono}
            setTelefono={setTelefono}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            usuario={usuario}
            session={session}
            handleGuardarPerfil={handleGuardarPerfil}
            savingPerfil={savingPerfil}
          />
        )}

        {/* TAB: NEGOCIO */}
        {activeTab === 'negocio' && (
          <TabNegocio
            nombreNegocio={nombreNegocio}
            setNombreNegocio={setNombreNegocio}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            moneda={moneda}
            setMoneda={setMoneda}
            simboloMoneda={simboloMoneda}
            setSimboloMoneda={setSimboloMoneda}
            mensajeCobro={mensajeCobro}
            setMensajeCobro={setMensajeCobro}
            handleGuardarNegocio={handleGuardarNegocio}
            savingNegocio={savingNegocio}
          />
        )}

        {/* TAB: CATEGORÍAS */}
        {activeTab === 'categorias' && (
          <TabCategorias
            nombreNegocio={nombreNegocio}
            setShowModalCrearCat={setShowModalCrearCat}
            setFormCrearCat={setFormCrearCat}
            categoriasList={categoriasList}
            filtroEstadoCat={filtroEstadoCat}
            setFiltroEstadoCat={setFiltroEstadoCat}
            cargarCategoriasNegocio={cargarCategoriasNegocio}
            loadingCategorias={loadingCategorias}
            handleAbrirEditarCat={handleAbrirEditarCat}
            handleToggleEstadoCat={handleToggleEstadoCat}
            handleAbrirEliminarCat={handleAbrirEliminarCat}
            openMenuCatId={openMenuCatId}
            setOpenMenuCatId={setOpenMenuCatId}
            catMenuRef={catMenuRef}
          />
        )}

        {/* TAB: APARIENCIA */}
        {activeTab === 'apariencia' && (
          <TabApariencia
            isDark={isDark}
            setTheme={setTheme}
          />
        )}

        {/* TAB: SEGURIDAD */}
        {activeTab === 'seguridad' && (
          <TabSeguridad
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            handleCambiarPassword={handleCambiarPassword}
            savingPassword={savingPassword}
          />
        )}

        {/* TAB: BACKUP */}
        {activeTab === 'backup' && (
          <TabBackup
            handleExportBackup={handleExportBackup}
            exporting={exporting}
            handleExportClientasCSV={handleExportClientasCSV}
            handleExportMovimientosCSV={handleExportMovimientosCSV}
            fileInputRef={fileInputRef}
            selectedFile={selectedFile}
            handleFileSelected={handleFileSelected}
            handleResetImport={handleResetImport}
            fileValidation={fileValidation}
            importResult={importResult}
            importError={importError}
            importing={importing}
            handleConfirmarImportacion={handleConfirmarImportacion}
          />
        )}

        {/* TAB: MI EQUIPO */}
        {activeTab === 'equipo' && isAdmin && (
          <TabEquipo />
        )}
      </div>

      {/* MODALES DE ADMINISTRACIÓN DE CATEGORÍAS */}
      <ModalCrearCategoria
        showModalCrearCat={showModalCrearCat}
        setShowModalCrearCat={setShowModalCrearCat}
        formCrearCat={formCrearCat}
        setFormCrearCat={setFormCrearCat}
        handleGuardarCrearCat={handleGuardarCrearCat}
        guardandoCat={guardandoCat}
        nombreNegocio={nombreNegocio}
      />

      <ModalEditarCategoria
        showModalEditarCat={showModalEditarCat}
        setShowModalEditarCat={setShowModalEditarCat}
        catParaEditar={catParaEditar}
        setCatParaEditar={setCatParaEditar}
        handleGuardarEditarCat={handleGuardarEditarCat}
        guardandoCat={guardandoCat}
      />

      <ModalEliminarCategoria
        showModalEliminarCat={showModalEliminarCat}
        setShowModalEliminarCat={setShowModalEliminarCat}
        catParaEliminar={catParaEliminar}
        alertaUsoCat={alertaUsoCat}
        eliminandoCat={eliminandoCat}
        handleConfirmarEliminarCat={handleConfirmarEliminarCat}
        handleToggleEstadoCat={handleToggleEstadoCat}
      />

      {/* Footer info sistema */}
      <div className="config-system-info">
        <p>Control de Deudas Web v1.2.0 • Conectado a Supabase PostgreSQL • {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
