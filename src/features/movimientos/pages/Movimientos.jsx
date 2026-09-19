import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Calendar, AlertCircle, ExternalLink, X, Receipt, ShoppingBag, Filter, Search, RotateCcw } from 'lucide-react';
import { useConfig } from '../../../context/ConfigContext';
import { cuentasService } from '../../../services/cuentasService';
import { categoriasService } from '../../../services/categoriasService';
import { gastosService } from '../../../services/gastosService';
import { cacheManager } from '../../../lib/cacheManager';
import {
  parsearPrendas,
  obtenerNombreCategoria,
  limpiarDescripcionTexto,
  getFechaHoyLocal,
  obtenerFechaInput
} from '../../../utils/helpers';
import ModalFiltrosMovimientos from '../components/ModalFiltrosMovimientos/ModalFiltrosMovimientos';
import LoadingSpinner from '../../../components/ui/LoadingSpinner/LoadingSpinner';
import '../styles/Movimientos.css';

const getFechaLunesSemana = () => {
  const d = new Date();
  const diaSemana = d.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  // Si hoy es Lunes (1), tomar desde el último Lunes pasado (hace 7 días) para que no sea idéntico a Hoy
  // Si hoy es Domingo (0), el lunes pasado fue hace 6 días
  // Si hoy es Martes a Sábado (2..6), restamos (diaSemana - 1)
  const diasARestar = diaSemana === 1 ? 7 : (diaSemana === 0 ? 6 : diaSemana - 1);
  d.setDate(d.getDate() - diasARestar);
  return obtenerFechaInput(d);
};

const getFechaPrimerDiaMes = () => {
  const d = new Date();
  d.setDate(1);
  return obtenerFechaInput(d);
};

const getFechaInicioMes = getFechaPrimerDiaMes;

const normalizarFechaAString = (f) => {
  if (!f) return null;
  return obtenerFechaInput(f);
};

const fechaEnRango = (fechaVal, inicioStr, finStr) => {
  try {
    const fechaStr = normalizarFechaAString(fechaVal);
    if (!fechaStr) return false;
    if (inicioStr && fechaStr < inicioStr) return false;
    if (finStr && fechaStr > finStr) return false;
    return true;
  } catch {
    return false;
  }
};

const estaEnRangoFechas = fechaEnRango;

export default function Movimientos() {
  const navigate = useNavigate();
  const { formatCurrency } = useConfig();

  const activeNegocioId = localStorage.getItem('active_negocio_id');
  const cachedMovs = cacheManager.getRawData(`movimientos_${activeNegocioId}`);

  const [movimientos, setMovimientos] = useState(() => cachedMovs || []);
  const [categorias, setCategorias] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(() => !cachedMovs || cachedMovs.length === 0);
  const [error, setError] = useState(null);

  const [showModalFiltros, setShowModalFiltros] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState(getFechaHoyLocal());
  const [filtroFechaFin, setFiltroFechaFin] = useState(getFechaHoyLocal());
  const [busquedaClienta, setBusquedaClienta] = useState('');
  const [limiteVisible, setLimiteVisible] = useState(30);

  useEffect(() => {
    const tieneCache = Boolean(cachedMovs && cachedMovs.length > 0);
    cargarMovimientos(tieneCache);
  }, []);

  const cargarMovimientos = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);

      const [data, cats, gastosData] = await Promise.all([
        cuentasService.getAllMovimientos(true),
        categoriasService.getCategorias({ incluirInactivas: true }).catch(() => []),
        gastosService.getGastos().catch(() => [])
      ]);

      setMovimientos(data || []);
      setCategorias(cats || []);
      setGastos(gastosData || []);
    } catch (err) {
      console.error('Error cargando movimientos:', err);
      if (!isBackground) {
        setError(
          err?.message ||
          'Error al cargar los movimientos'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFechaInicioChange = (val) => {
    const hoy = getFechaHoyLocal();
    const fechaAjustada = val && val > hoy ? hoy : val;
    setFiltroFechaInicio(fechaAjustada);
    setLimiteVisible(30);
  };

  const handleFechaFinChange = (val) => {
    setFiltroFechaFin(val);
    setLimiteVisible(30);
  };

  const handleFiltroTipoChange = (tipo) => {
    setFiltroTipo(tipo);
    setLimiteVisible(30);
  };

  const handleBusquedaClientaChange = (val) => {
    setBusquedaClienta(val);
    setLimiteVisible(30);
  };

  const limpiarFiltros = () => {
    setFiltroTipo('todos');
    setBusquedaClienta('');
    setFiltroFechaInicio(getFechaHoyLocal());
    setFiltroFechaFin(getFechaHoyLocal());
    setLimiteVisible(30);
  };

  const hayFiltrosActivos =
    filtroTipo !== 'todos' ||
    busquedaClienta.trim() !== '' ||
    filtroFechaInicio !== getFechaHoyLocal() ||
    filtroFechaFin !== getFechaHoyLocal();

  const aplicarFiltros = () => {
    let resultado = [...movimientos];

    // -----------------------------
    // FILTRO POR TIPO
    // -----------------------------

    if (filtroTipo === 'cargos') {
      resultado = resultado.filter(
        (m) => m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta'
      );
    }

    if (filtroTipo === 'abonos') {
      resultado = resultado.filter(
        (m) => m.tipo === 'ABONO' || m.tipo === 'abono' || m.tipo === 'pago'
      );
    }

    // -----------------------------
    // FILTRO POR FECHA
    // -----------------------------

    if (filtroFechaInicio || filtroFechaFin) {
      resultado = resultado.filter((m) =>
        estaEnRangoFechas(m.fecha, filtroFechaInicio, filtroFechaFin)
      );
    }

    // -----------------------------
    // BUSCAR CLIENTA
    // -----------------------------

    if (busquedaClienta.trim()) {
      const termino =
        busquedaClienta.trim().toLowerCase();

      resultado = resultado.filter((m) =>
        m.clienta_nombre
          ?.toLowerCase()
          .includes(termino)
      );
    }

    return resultado;
  };

  const agruparPorFecha = (lista) => {
    const grupos = {};

    lista.forEach((mov) => {
      let fechaObj;
      const str = String(mov.fecha || '').trim();
      const matchSimple = str.split(/[T\s]/)[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchSimple && (str.length <= 10 || str.includes('T00:00:00') || str.includes(' 00:00:00'))) {
        const [, y, m, d] = matchSimple;
        fechaObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 12, 0, 0);
      } else {
        fechaObj = new Date(mov.fecha);
      }

      const fechaKey = isNaN(fechaObj.getTime())
        ? 'Fecha sin definir'
        : fechaObj.toLocaleDateString(
            'es-PE',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'America/Lima'
            }
          );

      if (!grupos[fechaKey]) {
        grupos[fechaKey] = [];
      }

      grupos[fechaKey].push(mov);
    });

    return grupos;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const str = String(dateString).trim();
    if (str.length <= 10 || str.includes('T00:00:00') || str.includes(' 00:00:00')) {
      return '';
    }

    const date = new Date(str);
    if (isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima'
    }).format(date);
  };

  const movimientosFiltrados = aplicarFiltros();

  const movimientosVisibles = movimientosFiltrados.slice(0, limiteVisible);

  const movimientosAgrupados =
    agruparPorFecha(movimientosVisibles);

  const hayMasMovimientos = movimientosFiltrados.length > limiteVisible;


  // -----------------------------
  // GASTOS FILTRADOS
  // -----------------------------
  const gastosFiltrados = gastos.filter((g) =>
    estaEnRangoFechas(g.fecha, filtroFechaInicio, filtroFechaFin)
  );

  const totalGastos = gastosFiltrados.reduce(
    (sum, g) => sum + Number(g.monto || 0),
    0
  );

  // -----------------------------
  // ESTADÍSTICAS HERO (del rango de fechas y clienta)
  // -----------------------------
  const movimientosBaseHero = movimientos.filter((m) => {
    if (!estaEnRangoFechas(m.fecha, filtroFechaInicio, filtroFechaFin)) return false;
    if (busquedaClienta.trim()) {
      const termino = busquedaClienta.trim().toLowerCase();
      if (!m.clienta_nombre?.toLowerCase().includes(termino)) return false;
    }
    return true;
  });

  const cargosHero = movimientosBaseHero.filter(
    (m) => (m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta') && !m.anulado
  );

  const abonosHero = movimientosBaseHero.filter(
    (m) => (m.tipo === 'ABONO' || m.tipo === 'abono' || m.tipo === 'pago') && !m.anulado
  );

  const totalCargos = cargosHero.reduce(
    (sum, m) => sum + Number(m.monto || 0),
    0
  );

  const totalAbonos = abonosHero.reduce(
    (sum, m) => sum + Number(m.monto || 0),
    0
  );

  // Total cobrado neto: Monto cobrado (pagos) menos gastos
  const cobradoNeto = totalAbonos - totalGastos;

  // Desglose por método de pago para abonos
  const totalEfectivo = abonosHero.reduce((sum, m) => {
    if (m.monto_efectivo && Number(m.monto_efectivo) > 0) return sum + Number(m.monto_efectivo);
    const metodo = String(m.metodo_pago || '').toUpperCase();
    if (metodo === 'EFECTIVO') return sum + Number(m.monto || 0);
    return sum;
  }, 0);

  const totalYape = abonosHero.reduce((sum, m) => {
    if (m.monto_yape && Number(m.monto_yape) > 0) return sum + Number(m.monto_yape);
    const metodo = String(m.metodo_pago || '').toUpperCase();
    if (metodo === 'YAPE' || metodo === 'PLIN') return sum + Number(m.monto || 0);
    return sum;
  }, 0);

  // -----------------------------
  // LOADING
  // -----------------------------

  if (loading) {
    return <LoadingSpinner screen="movimientos" fullPage />;
  }

  return (
    <div className="movimientos-page">

      {/* HEADER */}

      <div className="movimientos-header">
        <div>
          <h1>Movimientos</h1>

          <p className="movimientos-subtitle">
            Historial completo de ventas y pagos
          </p>
        </div>
      </div>

      {/* RESUMEN HERO PRINCIPAL */}
      <div className="movimientos-hero-resumen">
        <div className="resumen-hero-header">
          <div className="resumen-hero-header-left">
            <div className="resumen-hero-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <circle cx="16" cy="15" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div className="resumen-hero-header-info">
              <span className="resumen-hero-label">Cobrado Neto (Caja)</span>
              <span className="resumen-hero-sub">
                {!filtroFechaInicio && !filtroFechaFin
                  ? 'Historial completo de pagos menos gastos'
                  : filtroFechaInicio === getFechaHoyLocal() && filtroFechaFin === getFechaHoyLocal()
                    ? 'Pagos cobrados hoy menos gastos'
                    : 'Pagos cobrados menos gastos del período'}
              </span>
            </div>
          </div>

          {/* ACCIONES SUPERIOR DERECHA: RECARGAR Y FILTRAR */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <button
              type="button"
              className="btn-hero-filter"
              onClick={() => cargarMovimientos(false)}
              aria-label="Actualizar movimientos"
              title="Actualizar movimientos"
              disabled={loading}
              style={{ padding: '0.5rem 0.65rem' }}
            >
              <RotateCcw size={16} strokeWidth={2.3} className={loading ? 'spinning' : ''} />
            </button>
            <button
              type="button"
              className={`btn-hero-filter ${hayFiltrosActivos ? 'has-active-filters' : ''}`}
              onClick={() => setShowModalFiltros(true)}
              aria-label="Abrir filtros de movimientos"
              title="Filtrar movimientos"
            >
              <Filter size={17} strokeWidth={2.3} />
              <span className="btn-hero-filter-text">Filtros</span>
              {hayFiltrosActivos && <span className="btn-hero-filter-badge" />}
            </button>
          </div>
        </div>

        {/* NÚMERO GRANDE: TOTAL COBRADO MENOS GASTOS */}
        <div className="resumen-hero-monto-wrap">
          <span className={`resumen-hero-monto ${cobradoNeto < 0 ? 'monto-neto-negativo' : 'monto-neto-positivo'}`}>
            {formatCurrency(cobradoNeto)}
          </span>
          <span className="resumen-hero-monto-caption">
            {cobradoNeto >= 0 ? 'Total neto cobrado en caja' : 'Déficit en caja'}
          </span>
        </div>

        <div className="resumen-hero-divisor"></div>

        {/* FILA 1: PAGOS Y GASTOS */}
        <div className="resumen-hero-grid">
          <div className="resumen-grid-item">
            <div className="resumen-grid-icono icono-abono">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
            <div className="resumen-grid-texts">
              <span className="resumen-grid-label">Pagos ({abonosHero.length})</span>
              <span className="resumen-grid-monto monto-abono-hero">{formatCurrency(totalAbonos)}</span>
            </div>
          </div>

          <div className="resumen-grid-divisor"></div>

          <div className="resumen-grid-item">
            <div className="resumen-grid-icono icono-gasto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                <line x1="16" y1="8" x2="8" y2="8" />
                <line x1="16" y1="12" x2="8" y2="12" />
                <line x1="10" y1="16" x2="8" y2="16" />
              </svg>
            </div>
            <div className="resumen-grid-texts">
              <span className="resumen-grid-label">Gastos ({gastosFiltrados.length})</span>
              <span className="resumen-grid-monto monto-gasto-hero">{formatCurrency(totalGastos)}</span>
            </div>
          </div>
        </div>

        <div className="resumen-hero-divisor"></div>

        {/* FILA 2: VENTAS A CRÉDITO */}
        <div className="resumen-ventas-credito-card">
          <div className="ventas-credito-left">
            <div className="resumen-grid-icono icono-cargo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            </div>
            <div className="ventas-credito-info">
              <span className="ventas-credito-label">Ventas a crédito</span>
              <span className="ventas-credito-sub">
                {cargosHero.length} {cargosHero.length === 1 ? 'venta registrada' : 'ventas registradas'}
              </span>
            </div>
          </div>
          <div className="ventas-credito-right">
            <span className="ventas-credito-monto monto-cargo-hero">{formatCurrency(totalCargos)}</span>
          </div>
        </div>

        {/* Desglose por método de pago */}
        {(totalEfectivo > 0 || totalYape > 0) && (
          <>
            <div className="resumen-hero-divisor"></div>
            <div className="resumen-metodos-section">
              <span className="resumen-metodos-titulo">Por método de pago (Cobros)</span>
              <div className="resumen-metodos-grid">
                {totalEfectivo > 0 && (
                  <div className="metodo-chip-row">
                    <div className="metodo-chip-left">
                      <span className="metodo-dot dot-efectivo"></span>
                      <span className="metodo-nombre">Efectivo</span>
                    </div>
                    <span className="metodo-monto">{formatCurrency(totalEfectivo)}</span>
                  </div>
                )}
                {totalYape > 0 && (
                  <div className="metodo-chip-row">
                    <div className="metodo-chip-left">
                      <span className="metodo-dot dot-yape"></span>
                      <span className="metodo-nombre">Yape / Digital</span>
                    </div>
                    <span className="metodo-monto">{formatCurrency(totalYape)}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* BARRA COMPACTA DE FILTROS ACTIVOS */}
      {hayFiltrosActivos && (
        <div className="filtros-activos-banner">
          <div className="filtros-activos-chips">
            <span className="filtros-activos-title">Filtros:</span>
            {filtroTipo !== 'todos' && (
              <span className="chip-filtro-item">
                {filtroTipo === 'cargos' ? 'Solo Ventas' : 'Solo Pagos'}
                <button type="button" onClick={() => handleFiltroTipoChange('todos')} title="Quitar filtro de tipo">&times;</button>
              </span>
            )}
            {busquedaClienta.trim() && (
              <span className="chip-filtro-item">
                Clienta: "{busquedaClienta}"
                <button type="button" onClick={() => handleBusquedaClientaChange('')} title="Quitar búsqueda">&times;</button>
              </span>
            )}
            {(filtroFechaInicio !== getFechaHoyLocal() || filtroFechaFin !== getFechaHoyLocal()) && (
              <span className="chip-filtro-item">
                {!filtroFechaInicio && !filtroFechaFin
                  ? 'Histórico (Todos los movimientos)'
                  : filtroFechaInicio === getFechaLunesSemana() && filtroFechaFin === getFechaHoyLocal()
                    ? 'Esta semana'
                    : filtroFechaInicio === getFechaPrimerDiaMes() && filtroFechaFin === getFechaHoyLocal()
                      ? 'Este mes'
                      : filtroFechaInicio && filtroFechaFin
                        ? `${filtroFechaInicio} → ${filtroFechaFin}`
                        : filtroFechaInicio
                          ? `Desde ${filtroFechaInicio}`
                          : `Hasta ${filtroFechaFin}`}
                <button
                  type="button"
                  onClick={() => {
                    setFiltroFechaInicio(getFechaHoyLocal());
                    setFiltroFechaFin(getFechaHoyLocal());
                    setLimiteVisible(30);
                  }}
                  title="Restablecer fechas a hoy"
                >
                  &times;
                </button>
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-limpiar-activos"
            onClick={limpiarFiltros}
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* SIN MOVIMIENTOS */}

      {movimientosFiltrados.length === 0 ? (

        <div className="empty-state">

          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />

            <path d="M12 8v4l2 2" />
          </svg>

          <p>
            {filtroFechaInicio === getFechaHoyLocal() && filtroFechaFin === getFechaHoyLocal()
              ? 'No hay movimientos registrados hoy'
              : 'No hay movimientos que mostrar'}
          </p>

          <p className="empty-state-hint">
            {filtroFechaInicio === getFechaHoyLocal() && filtroFechaFin === getFechaHoyLocal()
              ? 'Puedes cambiar las fechas para revisar movimientos de otros días'
              : 'Intenta ajustar los filtros de búsqueda o fechas'}
          </p>

        </div>

      ) : (

        /* LISTA */

        <div className="movimientos-timeline">

          {Object.entries(
            movimientosAgrupados
          ).map(([fecha, movs]) => (

            <div
              key={fecha}
              className="timeline-grupo"
            >

              <div className="timeline-fecha">

                <h3>
                  {fecha}
                </h3>

                <span className="timeline-cantidad">
                  {movs.length}{' '}
                  movimiento
                  {movs.length !== 1
                    ? 's'
                    : ''}
                </span>

              </div>

              <div className="timeline-items">
                {movs.map((mov) => {
                  const esCargo =
                    mov.tipo === 'CARGO' || mov.tipo === 'cargo' || mov.tipo === 'venta';
                  const movimientoKey = mov.id || mov.movimiento_id;

                  // Obtener items de la venta de forma estructurada
                  const itemsVenta = esCargo
                    ? (Array.isArray(mov.detalles) && mov.detalles.length > 0
                        ? mov.detalles.map((d) => ({
                            descripcion: d.descripcion || d.concepto || d.producto || 'Item',
                            monto:
                              d.subtotal ||
                              d.monto ||
                              (d.cantidad && d.precio_unitario ? d.cantidad * d.precio_unitario : null),
                            cantidad: d.cantidad || 1,
                            categoria: d.categoria_id || d.categoria,
                            categoriaNombre: obtenerNombreCategoria(d.categoria_id || d.categoria, categorias)
                          }))
                        : parsearPrendas(mov.comentario || mov.descripcion, mov.fecha, categorias)
                      )
                    : [];

                  const clientaId = mov.clienta_id || mov.clienta?.id || mov.clientas?.id;

                  return (
                    <div
                      key={movimientoKey}
                      className={`movimiento-card-compact movimiento-${
                        esCargo ? 'venta' : 'pago'
                      } ${mov.anulado ? 'movimiento-anulado' : ''}`}
                      onClick={() => {
                        if (clientaId) {
                          navigate(`/clientas/${clientaId}`);
                        }
                      }}
                    >
                      <div className="movimiento-indicador"></div>

                      <div className="movimiento-compact-left">
                        <div className={`mov-badge-icon badge-${esCargo ? 'venta' : 'pago'}`}>
                          {esCargo ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <polyline points="5 12 12 19 19 12" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="19" x2="12" y2="5" />
                              <polyline points="5 12 12 5 19 12" />
                            </svg>
                          )}
                        </div>

                        <div className="mov-compact-body">
                          <div className="mov-compact-top">
                            <h4
                              className="mov-clienta-name"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (clientaId) {
                                  navigate(`/clientas/${clientaId}`);
                                }
                              }}
                            >
                              {mov.clienta_nombre}
                            </h4>
                            {mov.anulado && (
                              <span className="badge-anulado-mini">
                                ANULADO
                              </span>
                            )}
                            <span className="mov-hora-text">
                              {formatTime(mov.fecha)}
                            </span>
                          </div>

                          {/* Descripción compacta: productos (sin mostrar categoría en las tarjetas de movimientos) */}
                          {esCargo && itemsVenta.length > 0 ? (
                            <div className="mov-compact-items">
                              {itemsVenta.map((item, idx) => (
                                <span key={idx} className="mov-item-inline">
                                  <span
                                    className={`item-name ${
                                      mov.anulado ? 'desc-anulado monto-anulado' : ''
                                    }`}
                                  >
                                    {item.cantidad && item.cantidad > 1 ? `${item.cantidad}x ` : ''}
                                    {item.descripcion}
                                  </span>
                                  {idx < itemsVenta.length - 1 && <span className="item-dot">•</span>}
                                </span>
                              ))}
                            </div>
                          ) : (
                            (mov.comentario || mov.descripcion) && (
                              <p
                                className={`mov-desc-text ${
                                  mov.anulado ? 'desc-anulado monto-anulado' : ''
                                }`}
                              >
                                {limpiarDescripcionTexto(
                                  mov.comentario || mov.descripcion,
                                  esCargo ? 'VENTA' : 'ABONO'
                                )}
                              </p>
                            )
                          )}

                          {mov.anulado && mov.motivo_anulacion && (
                            <p className="movimiento-motivo-anulacion">
                              Motivo: {mov.motivo_anulacion}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="movimiento-compact-right">
                        <div className="mov-monto-block">
                          <span
                            className={`mov-monto-text amount-${
                              esCargo ? 'venta' : 'pago'
                            } ${mov.anulado ? 'monto-anulado' : ''}`}
                          >
                            {esCargo ? '+' : '-'}
                            {formatCurrency(mov.monto)}
                          </span>

                          {mov.metodo_pago && (
                            <span className="tag-metodo-mini">
                              {mov.metodo_pago}
                            </span>
                          )}
                        </div>

                        <span
                          className="mov-ver-detalle-hint"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (clientaId) {
                              navigate(`/clientas/${clientaId}`);
                            }
                          }}
                        >
                          Ver detalle
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* BOTÓN MOSTRAR MÁS / PAGINACIÓN */}
          {hayMasMovimientos && (
            <div className="cargar-mas-container">
              <button
                type="button"
                className="btn-cargar-mas"
                onClick={() => setLimiteVisible((prev) => prev + 30)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
                <span>
                  Mostrar más movimientos ({movimientosVisibles.length} de{' '}
                  {movimientosFiltrados.length})
                </span>
              </button>
            </div>
          )}

          {!hayMasMovimientos && movimientosFiltrados.length > 30 && (
            <div className="fin-lista-indicador">
              <span>✓ Mostrando todos los {movimientosFiltrados.length} movimientos</span>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE FILTROS */}
      <ModalFiltrosMovimientos
        showModalFiltros={showModalFiltros}
        setShowModalFiltros={setShowModalFiltros}
        filtroTipo={filtroTipo}
        filtroFechaInicio={filtroFechaInicio}
        filtroFechaFin={filtroFechaFin}
        busquedaClienta={busquedaClienta}
        hayFiltrosActivos={hayFiltrosActivos}
        movimientosFiltradosCount={movimientosFiltrados.length}
        handleFiltroTipoChange={handleFiltroTipoChange}
        handleFechaInicioChange={handleFechaInicioChange}
        handleFechaFinChange={handleFechaFinChange}
        handleBusquedaClientaChange={handleBusquedaClientaChange}
        limpiarFiltros={limpiarFiltros}
        setFiltroFechaInicio={setFiltroFechaInicio}
        setFiltroFechaFin={setFiltroFechaFin}
        setLimiteVisible={setLimiteVisible}
        getFechaHoyLocal={getFechaHoyLocal}
        getFechaLunesSemana={getFechaLunesSemana}
        getFechaPrimerDiaMes={getFechaPrimerDiaMes}
      />
    </div>
  );
}
