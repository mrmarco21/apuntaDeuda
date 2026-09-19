import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Receipt,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useConfig } from '../../../context/ConfigContext';
import { useToast } from '../../../context/ToastContext';
import { clientasService } from '../../../services/clientasService';
import { cuentasService } from '../../../services/cuentasService';
import { categoriasService } from '../../../services/categoriasService';
import {
  parsearPrendas as parsearPrendasHelper,
  obtenerNombreCategoria as obtenerNombreCategoriaHelper,
  resumirMovimientoCuentaActiva,
  formatearFechaCorta,
  limpiarDescripcionTexto
} from '../../../utils/helpers';
import LoadingSpinner from '../../../components/ui/LoadingSpinner/LoadingSpinner';
import CuentaCard from '../components/CuentaCard/CuentaCard';
import ModalDetalleMovimiento from '../components/ModalDetalleMovimiento/ModalDetalleMovimiento';
import ModalNotaCuenta from '../components/ModalNotaCuenta/ModalNotaCuenta';
import { cacheManager } from '../../../lib/cacheManager';
import './HistorialCuentasPage.css';

export default function HistorialCuentasPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency, simboloMoneda } = useConfig();

  const resolverClientaInicial = (clientaId) => {
    if (!clientaId) return null;
    const directa = cacheManager.getRawData(`clienta_${clientaId}`);
    if (directa) return directa;

    const negocioId = localStorage.getItem('active_negocio_id');
    if (negocioId) {
      const lista = cacheManager.getRawData(`clientas_${negocioId}`);
      if (Array.isArray(lista)) {
        const encontrada = lista.find((c) => c.id === clientaId || c.clienta_id === clientaId);
        if (encontrada) {
          cacheManager.set(`clienta_${clientaId}`, encontrada);
          return encontrada;
        }
      }
    }

    const listaGen = cacheManager.getRawData('clientas');
    if (Array.isArray(listaGen)) {
      const encontrada = listaGen.find((c) => c.id === clientaId || c.clienta_id === clientaId);
      if (encontrada) {
        cacheManager.set(`clienta_${clientaId}`, encontrada);
        return encontrada;
      }
    }

    return null;
  };

  const cachedDetalle = cacheManager.getRawData(`cuentas_detalle_${id}`);
  const cachedClienta = resolverClientaInicial(id);

  const [clienta, setClienta] = useState(() => cachedClienta || null);
  const [cuentasCerradas, setCuentasCerradas] = useState(() => {
    const todas = cachedDetalle?.cuentas || [];
    return todas.filter((c) => Number(c.saldo || 0) === 0);
  });
  const [loading, setLoading] = useState(() => !(cachedClienta && cachedDetalle));
  const [error, setError] = useState(null);

  const [todasCategorias, setTodasCategorias] = useState([]);

  // Estados de acordiones
  const [cuentasExpandidas, setCuentasExpandidas] = useState({});
  const [movimientosExpandidos, setMovimientosExpandidos] = useState({});

  // Modales
  const [modalDetalleMov, setModalDetalleMov] = useState(null);
  const [anulandoMovimiento, setAnulandoMovimiento] = useState(false);

  // Modal Editar Nota
  const [cuentaEditandoNota, setCuentaEditandoNota] = useState(null);
  const [inputEditarNota, setInputEditarNota] = useState('');
  const [guardandoEditarNota, setGuardandoEditarNota] = useState(false);

  useEffect(() => {
    const tieneCacheCompleto = Boolean(cachedClienta && cachedDetalle);
    cargarDatos(tieneCacheCompleto);
  }, [id]);

  const cargarDatos = async (isBackground = false) => {
    try {
      if (!isBackground || !clienta) {
        setLoading(true);
      }
      setError(null);

      const [clientaData, cuentasData, categoriasData] = await Promise.all([
        clientasService.getById(id),
        cuentasService.getCuentasDetalleByClientaId(id, isBackground),
        categoriasService.getCategorias({ incluirInactivas: true }).catch((err) => {
          console.warn('Error cargando categorías:', err);
          return [];
        })
      ]);

      if (!clientaData) {
        setError('Clienta no encontrada');
      } else {
        setClienta(clientaData);
        cacheManager.set(`clienta_${id}`, clientaData);
      }

      setTodasCategorias(categoriasData || []);

      const todas = cuentasData?.cuentas || [];
      const cerradas = todas.filter((c) => Number(c.saldo || 0) === 0);
      setCuentasCerradas(cerradas);

      // Expandir todas las cuentas cerradas por defecto en esta vista
      const initialExpand = {};
      cerradas.forEach((c) => {
        initialExpand[c.id] = true;
      });
      setCuentasExpandidas(initialExpand);
    } catch (err) {
      console.error('Error al cargar historial de cuentas:', err);
      if (!clienta) {
        setError('Error al cargar el historial de cuentas');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCuentaExpandida = (cuentaId) => {
    setCuentasExpandidas((prev) => ({
      ...prev,
      [cuentaId]: !prev[cuentaId]
    }));
  };

  const toggleMostrarTodosMovs = (cuentaId) => {
    setMovimientosExpandidos((prev) => ({
      ...prev,
      [cuentaId]: !prev[cuentaId]
    }));
  };

  const formatDate = (dateString) => {
    return formatearFechaCorta(dateString);
  };

  const parsearPrendas = (comentario, fechaFallback = null) => {
    return parsearPrendasHelper(comentario, fechaFallback, todasCategorias);
  };

  const obtenerNombreCategoria = (catKey) => {
    return obtenerNombreCategoriaHelper(catKey, todasCategorias);
  };

  const extraerDescripcionLimpia = (comentario, tipo) => {
    return resumirMovimientoCuentaActiva({ comentario, tipo }, todasCategorias);
  };

  const extraerNotaAbonoParaEdicion = (texto) => {
    if (!texto) return '';
    let limpio = String(texto)
      .replace(/\s*\[\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\]\s*$/g, '')
      .replace(/\[\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\]/g, '')
      .trim();
    if (limpio.toLowerCase() === 'pago' || limpio.toLowerCase() === 'abono') {
      return '';
    }
    return limpio;
  };

  const handleVolver = () => {
    navigate(`/clientas/${id}`, { replace: true });
  };

  // Editar Nota Cuenta
  const abrirModalEditarNotaCuenta = (cuenta) => {
    setCuentaEditandoNota(cuenta);
    setInputEditarNota(cuenta.nota || '');
  };

  const handleGuardarEditarNotaCuenta = async (e) => {
    if (e) e.preventDefault();
    if (!cuentaEditandoNota) return;

    try {
      setGuardandoEditarNota(true);
      await cuentasService.actualizarNotaCuenta(cuentaEditandoNota.id, inputEditarNota);
      toast.success(
        inputEditarNota.trim()
          ? `Nota de Cuenta #${cuentaEditandoNota.numeroCuenta} actualizada`
          : `Nota de Cuenta #${cuentaEditandoNota.numeroCuenta} eliminada`
      );
      setCuentaEditandoNota(null);
      setInputEditarNota('');
      await cargarDatos();
    } catch (err) {
      console.error('Error al actualizar nota de cuenta:', err);
      toast.error('Error al guardar nota: ' + (err.message || ''));
    } finally {
      setGuardandoEditarNota(false);
    }
  };

  // Anular Movimiento
  const handleAnularMovimiento = async (mov) => {
    if (
      !window.confirm(
        `¿Seguro que deseas eliminar este movimiento de ${simboloMoneda || 'S/'} ${Number(mov.monto).toFixed(2)}? El saldo de la cuenta se recalculará automáticamente.`
      )
    ) {
      return;
    }

    try {
      setAnulandoMovimiento(true);
      await cuentasService.anularMovimiento(mov.id, mov.cuenta_id);
      toast.success('Movimiento eliminado y saldo recalculado');
      setModalDetalleMov(null);
      await cargarDatos();
    } catch (err) {
      console.error('Error al eliminar movimiento:', err);
      toast.error('Error al eliminar: ' + (err.message || ''));
    } finally {
      setAnulandoMovimiento(false);
    }
  };

  if (loading || (!clienta && !error)) {
    return <LoadingSpinner screen="historial" fullPage />;
  }

  if (error || !clienta) {
    return (
      <div className="historial-cuentas-error">
        <AlertCircle size={44} className="text-danger" />
        <p>{error || 'Clienta no encontrada'}</p>
        <button onClick={handleVolver} className="btn-primary">
          Volver a Detalle
        </button>
      </div>
    );
  }

  // Calcular total de cargos de cuentas cerradas
  const totalMontoCerradas = cuentasCerradas.reduce((acc, cta) => {
    const movs = cta.movimientos || [];
    const cargos = movs.filter(
      (m) => !m.anulado && (m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta')
    );
    return acc + cargos.reduce((s, m) => s + Number(m.monto || 0), 0);
  }, 0);

  return (
    <div className="historial-cuentas-page animate-fadeIn">
      {/* TOPBAR */}
      <div className="historial-topbar">
        <button onClick={handleVolver} className="btn-back" title="Volver al detalle de la clienta">
          <ArrowLeft size={18} strokeWidth={2.5} />
          <span>Volver a Detalle</span>
        </button>

        <div className="historial-header-badge">
          <Clock size={18} strokeWidth={2.2} />
          <span>Historial de Cuentas Saldadas</span>
        </div>
      </div>

      {/* HEADER DE CLIENTA */}
      <div className="historial-clienta-banner">
        <div className="historial-avatar">
          {clienta.nombre ? clienta.nombre.charAt(0).toUpperCase() : 'C'}
        </div>
        <div className="historial-clienta-info">
          <h1>{clienta.nombre}</h1>
          <p>
            Historial de cuentas totalmente pagadas y saldadas
          </p>
        </div>
      </div>

      {/* RESUMEN DE HISTORIAL */}
      <div className="historial-resumen-grid">
        <div className="resumen-historial-card">
          <div className="historial-card-icon icon-verde">
            <CheckCircle2 size={24} strokeWidth={2.2} />
          </div>
          <div>
            <span className="historial-card-label">CUENTAS SALDADAS</span>
            <span className="historial-card-valor text-verde">
              {cuentasCerradas.length} {cuentasCerradas.length === 1 ? 'cuenta' : 'cuentas'}
            </span>
          </div>
        </div>

        <div className="resumen-historial-card">
          <div className="historial-card-icon icon-azul">
            <Receipt size={24} strokeWidth={2.2} />
          </div>
          <div>
            <span className="historial-card-label">TOTAL HISTÓRICO CANCELADO</span>
            <span className="historial-card-valor text-azul">
              {formatCurrency(totalMontoCerradas)}
            </span>
          </div>
        </div>
      </div>

      {/* LISTA DE CUENTAS CERRADAS */}
      <div className="historial-cuentas-content">
        <h2 className="historial-seccion-titulo">
          Cuentas Completadas ({cuentasCerradas.length})
        </h2>

        {cuentasCerradas.length === 0 ? (
          <div className="historial-vacio-card">
            <Receipt size={48} strokeWidth={1.5} className="vacio-icon" />
            <h3>Sin cuentas en el historial</h3>
            <p>
              Esta clienta aún no tiene cuentas cerradas o totalmente saldadas. Las cuentas pasarán aquí automáticamente cuando su saldo pendiente llegue a {simboloMoneda || 'S/'} 0.00.
            </p>
            <button className="btn-primary btn-volver-detalle" onClick={handleVolver}>
              <ArrowLeft size={16} strokeWidth={2.2} />
              <span>Ir a Cuentas Activas</span>
            </button>
          </div>
        ) : (
          <div className="cuentas-cerradas-grid">
            {cuentasCerradas.map((cuenta, idx) => {
              const numeroCuenta = cuenta.numeroCuenta || idx + 1;
              return (
                <CuentaCard
                  key={cuenta.id}
                  cuenta={cuenta}
                  numeroCuenta={numeroCuenta}
                  abrirModalEditarNotaCuenta={abrirModalEditarNotaCuenta}
                  formatDate={formatDate}
                  formatCurrency={formatCurrency}
                  cuentasExpandidas={cuentasExpandidas}
                  toggleCuentaExpandida={toggleCuentaExpandida}
                  movimientosExpandidos={movimientosExpandidos}
                  toggleMostrarTodosMovs={toggleMostrarTodosMovs}
                  extraerDescripcionLimpia={extraerDescripcionLimpia}
                  setModalDetalleMov={setModalDetalleMov}
                  esCerrada={true}
                  simboloMoneda={simboloMoneda}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* MODALES */}
      <ModalDetalleMovimiento
        modalDetalleMov={modalDetalleMov}
        setModalDetalleMov={setModalDetalleMov}
        anulandoMovimiento={anulandoMovimiento}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        parsearPrendas={parsearPrendas}
        obtenerNombreCategoria={obtenerNombreCategoria}
        extraerNotaAbonoParaEdicion={extraerNotaAbonoParaEdicion}
        handleAnularMovimiento={handleAnularMovimiento}
      />

      <ModalNotaCuenta
        cuentaEditandoNota={cuentaEditandoNota}
        setCuentaEditandoNota={setCuentaEditandoNota}
        clienta={clienta}
        inputEditarNota={inputEditarNota}
        setInputEditarNota={setInputEditarNota}
        handleGuardarEditarNotaCuenta={handleGuardarEditarNotaCuenta}
        guardandoEditarNota={guardandoEditarNota}
      />
    </div>
  );
}
