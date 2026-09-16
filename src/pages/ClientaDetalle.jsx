import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Phone,
  User,
  MapPin,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  PlusCircle,
  ChevronDown,
  Trash2,
  Calendar,
  Tag,
  Check,
  X,
  AlertCircle,
  Clock,
  Receipt,
  Share2,
  Copy,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { RiWhatsappLine } from 'react-icons/ri';
import html2canvas from 'html2canvas';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { clientasService } from '../services/clientasService';
import { cuentasService } from '../services/cuentasService';
import { categoriasService } from '../services/categoriasService';
import {
  parsearPrendas as parsearPrendasHelper,
  obtenerNombreCategoria as obtenerNombreCategoriaHelper,
  limpiarDescripcionTexto,
  resumirMovimientoTexto,
  resumirMovimientoCuentaActiva,
  getFechaHoyLocal,
  obtenerFechaInput,
  formatearFechaCorta
} from '../utils/helpers';
import './ClientaDetalle.css';

const COLORES_CUENTA = [
  { bg: '#E1F5FE', border: '#0288D1', numero: '#0288D1' },
  { bg: '#E8F5E9', border: '#2E7D32', numero: '#2E7D32' },
  { bg: '#FFF3E0', border: '#E65100', numero: '#E65100' },
  { bg: '#F3E5F5', border: '#7B1FA2', numero: '#7B1FA2' },
  { bg: '#FCE4EC', border: '#C2185B', numero: '#C2185B' },
];

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

export default function ClientaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency, simboloMoneda, config, nombreNegocio } = useConfig();
  const { negocioActual } = useAuth();

  const voucherRef = useRef(null);
  const [generandoFoto, setGenerandoFoto] = useState(false);

  const [clienta, setClienta] = useState(null);
  const [cuentas, setCuentas] = useState([]);
  const [cuentasCerradas, setCuentasCerradas] = useState([]);
  const [resumen, setResumen] = useState({ totalDeuda: 0, totalAbonos: 0, totalCargos: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Categorías dinámicas desde Supabase
  const [categorias, setCategorias] = useState([]);
  const [todasCategorias, setTodasCategorias] = useState([]);

  // Submodal inline para crear categoría desde el modal de cargo
  const [showModalNuevaCat, setShowModalNuevaCat] = useState(false);
  const [nuevaCatNombre, setNuevaCatNombre] = useState('');
  const [nuevaCatIcono, setNuevaCatIcono] = useState('👕');
  const [guardandoNuevaCat, setGuardandoNuevaCat] = useState(false);
  const [prendaTargetIdx, setPrendaTargetIdx] = useState(0);

  // Acordeones de movimientos por cuenta
  const [cuentasExpandidas, setCuentasExpandidas] = useState({});
  const [movimientosExpandidos, setMovimientosExpandidos] = useState({});
  const [showHistorialCerradas, setShowHistorialCerradas] = useState(false);

  // Modal Compartir Estado de Cuenta
  const [showModalCompartir, setShowModalCompartir] = useState(false);
  const [cuentaCompartirId, setCuentaCompartirId] = useState(null);
  const [copiadoExito, setCopiadoExito] = useState(false);

  // Estado desplegable de información secundaria de clienta
  const [showDetallesClienta, setShowDetallesClienta] = useState(false);

  // Modal Confirmación Nota Nueva Cuenta
  const [showModalConfirmarNotaNuevaCuenta, setShowModalConfirmarNotaNuevaCuenta] = useState(false);

  // Modal Editar Nota de Cuenta Existente
  const [cuentaEditandoNota, setCuentaEditandoNota] = useState(null);
  const [inputEditarNota, setInputEditarNota] = useState('');
  const [guardandoEditarNota, setGuardandoEditarNota] = useState(false);

  // Modal Cargo (Crear / Editar / Nueva Cuenta)
  const [showModalCargo, setShowModalCargo] = useState(false);
  const [cargoCuentaId, setCargoCuentaId] = useState('');
  const [cargoEsNuevaCuenta, setCargoEsNuevaCuenta] = useState(false);
  const [cargoNotaCuenta, setCargoNotaCuenta] = useState('');
  const [editingCargoId, setEditingCargoId] = useState(null);
  const [prendas, setPrendas] = useState([
    { descripcion: '', monto: '', categoria: '', fecha: getFechaHoyLocal() }
  ]);
  const [guardandoCargo, setGuardandoCargo] = useState(false);

  // Modal Abono (Crear / Editar)
  const [showModalAbono, setShowModalAbono] = useState(false);
  const [abonoCuentaId, setAbonoCuentaId] = useState('');
  const [editingAbonoId, setEditingAbonoId] = useState(null);
  const [abonoMonto, setAbonoMonto] = useState('');
  const [abonoMetodoPago, setAbonoMetodoPago] = useState('efectivo'); // 'efectivo' | 'yape' | 'mixto'
  const [abonoEfectivo, setAbonoEfectivo] = useState('');
  const [abonoYape, setAbonoYape] = useState('');
  const [abonoFecha, setAbonoFecha] = useState(getFechaHoyLocal());
  const [abonoDescripcion, setAbonoDescripcion] = useState('');
  const [guardandoAbono, setGuardandoAbono] = useState(false);

  // Modal Detalle Movimiento
  const [modalDetalleMov, setModalDetalleMov] = useState(null);
  const [anulandoMovimiento, setAnulandoMovimiento] = useState(false);

  // Modal Editar Clienta
  const [showModalEditClienta, setShowModalEditClienta] = useState(false);
  const [formEditClienta, setFormEditClienta] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    referencia: '',
    notas: ''
  });
  const [savingEditClienta, setSavingEditClienta] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const [clientaData, cuentasData, categoriasData] = await Promise.all([
        clientasService.getById(id),
        cuentasService.getCuentasDetalleByClientaId(id),
        categoriasService.getCategorias({ incluirInactivas: true }).catch((err) => {
          console.warn('Error cargando categorías:', err);
          return [];
        })
      ]);

      setClienta(clientaData);

      // Separar activas (con saldo > 0) de las cerradas (saldo = 0 en Historial de Cuentas)
      const todas = cuentasData?.cuentas || [];
      const activas = todas.filter(c => Number(c.saldo || 0) > 0);
      const cerradas = todas.filter(c => Number(c.saldo || 0) === 0);

      setCuentas(activas);
      setCuentasCerradas(cerradas);

      // Configurar categorías
      setTodasCategorias(categoriasData || []);
      setCategorias((categoriasData || []).filter((c) => c.activo));

      setResumen(cuentasData?.resumen || { totalDeuda: 0, totalAbonos: 0, totalCargos: 0 });

      // Por defecto cuentas contraídas (ocultas) según requerimiento
      setCuentasExpandidas({});
    } catch (err) {
      console.error('Error al cargar detalle de clienta:', err);
      setError('Error al cargar la información de la clienta');
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

  // --- PARSEO DE PRENDAS FORMATO ANDROID ---
  const parsearPrendas = (comentario, fechaFallback = null) => {
    return parsearPrendasHelper(comentario, fechaFallback, todasCategorias);
  };

  const obtenerNombreCategoria = (catKey) => {
    return obtenerNombreCategoriaHelper(catKey, todasCategorias);
  };

  const formatearFechaDiaMes = (fechaStr) => {
    if (!fechaStr) return '';
    try {
      const corta = formatearFechaCorta(fechaStr);
      if (corta && corta.length >= 5) return corta.slice(0, 5); // "DD/MM"
      return fechaStr;
    } catch {
      return fechaStr;
    }
  };

  // --- LÓGICA DE ABRIR NUEVA CUENTA (ABRE EL FORMULARIO DE PRODUCTOS/VENTA) ---
  const handleAbrirNuevaCuenta = () => {
    abrirModalCargo(null, true);
  };

  // --- NAVEGACIÓN DINÁMICA DE RETORNO ---
  const handleVolver = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/clientas');
    }
  };

  // --- LÓGICA DE EDITAR NOTA DE CUENTA DESDE LA VISTA ---
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

  const getCategoriaDefaultId = () => {
    if (categorias && categorias.length > 0) {
      return categorias[0].id;
    }
    return 'ropa-otros';
  };

  // --- LÓGICA MODAL CARGO (CREAR / EDITAR) ---
  const abrirModalCargo = (cuentaId = null, esNueva = false, movEditar = null) => {
    setModalDetalleMov(null);
    setCargoCuentaId(cuentaId || (cuentas.length > 0 ? cuentas[0].id : ''));
    setCargoEsNuevaCuenta(esNueva);
    setCargoNotaCuenta('');
    setEditingCargoId(movEditar ? movEditar.id : null);
    const catDef = getCategoriaDefaultId();

    if (movEditar) {
      const parsed = parsearPrendas(movEditar.comentario || movEditar.descripcion, movEditar.fecha);
      if (parsed.length > 0) {
        setPrendas(
          parsed.map((p) => ({
            descripcion: p.descripcion,
            monto: String(p.monto),
            categoria: p.categoria || catDef,
            fecha: p.fecha || getFechaHoyLocal()
          }))
        );
      } else {
        setPrendas([
          {
            descripcion: movEditar.comentario || movEditar.descripcion || '',
            monto: String(movEditar.monto),
            categoria: catDef,
            fecha: obtenerFechaInput(movEditar.fecha)
          }
        ]);
      }
    } else {
      setPrendas([
        { descripcion: '', monto: '', categoria: catDef, fecha: getFechaHoyLocal() }
      ]);
    }

    setShowModalCargo(true);
  };

  const agregarPrenda = () => {
    const catDef = getCategoriaDefaultId();
    setPrendas([
      ...prendas,
      { descripcion: '', monto: '', categoria: catDef, fecha: getFechaHoyLocal() }
    ]);
  };

  const eliminarPrenda = (idx) => {
    if (prendas.length > 1) {
      setPrendas(prendas.filter((_, i) => i !== idx));
    }
  };

  const actualizarPrenda = (idx, campo, valor) => {
    const nuevas = [...prendas];
    nuevas[idx][campo] = valor;
    setPrendas(nuevas);
  };

  // --- AGREGAR CATEGORÍA INLINE DESDE EL MODAL NUEVO CARGO ---
  const handleAbrirModalNuevaCat = (idx) => {
    setPrendaTargetIdx(idx);
    setNuevaCatNombre('');
    setNuevaCatIcono('👕');
    setShowModalNuevaCat(true);
  };

  const handleGuardarNuevaCategoria = async (e) => {
    if (e) e.preventDefault();
    const nombreLimpio = nuevaCatNombre.trim();
    if (!nombreLimpio) {
      toast.warning('Ingresa un nombre para la categoría');
      return;
    }

    try {
      setGuardandoNuevaCat(true);
      const nuevaCat = await categoriasService.crearCategoria({
        nombre: nombreLimpio,
        icono: nuevaCatIcono || '🏷️'
      });

      toast.success(`Categoría "${nuevaCat.nombre}" creada con éxito`);

      // Recargar categorías de Supabase
      const catsActualizadas = await categoriasService.getCategorias({ incluirInactivas: true });
      setTodasCategorias(catsActualizadas || []);
      const activas = (catsActualizadas || []).filter((c) => c.activo);
      setCategorias(activas);

      // Autoseleccionar la nueva categoría en la prenda que disparó la creación
      if (prendaTargetIdx >= 0 && prendaTargetIdx < prendas.length) {
        actualizarPrenda(prendaTargetIdx, 'categoria', nuevaCat.id);
      }

      setShowModalNuevaCat(false);
      setNuevaCatNombre('');
    } catch (err) {
      console.error('Error al crear categoría rápida:', err);
      toast.error(err.message || 'Error al guardar la categoría');
    } finally {
      setGuardandoNuevaCat(false);
    }
  };

  const calcularTotalCargo = () => {
    return prendas.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);
  };

  const handleSubmitCargo = async (e) => {
    e.preventDefault();
    const prendasValidas = prendas.filter((p) => parseFloat(p.monto) > 0);
    if (prendasValidas.length === 0) {
      toast.warning('Ingresa al menos un producto o prenda con monto mayor a 0');
      return;
    }

    // Si es abrir nueva cuenta, solicitar confirmación / nota opcional
    if (cargoEsNuevaCuenta && !showModalConfirmarNotaNuevaCuenta) {
      setShowModalConfirmarNotaNuevaCuenta(true);
      return;
    }

    await ejecutarGuardadoCargo();
  };

  const ejecutarGuardadoCargo = async (notaPersonalizada = null) => {
    const prendasValidas = prendas.filter((p) => parseFloat(p.monto) > 0);
    if (prendasValidas.length === 0) return;

    const totalCargo = calcularTotalCargo();
    const descripcionCompuesta = prendasValidas
      .map(
        (p) =>
          `${p.descripcion.trim() || 'Producto'} (S/${parseFloat(p.monto).toFixed(2)}) [${formatearFechaCorta(p.fecha)}] {${p.categoria}}`
      )
      .join(' | ');

    const detallesArray = prendasValidas.map((p) => ({
      descripcion: p.descripcion.trim() || 'Producto',
      monto: parseFloat(p.monto),
      categoria: p.categoria,
      fecha: p.fecha
    }));

    const notaFinal = notaPersonalizada !== null ? notaPersonalizada : cargoNotaCuenta;

    try {
      setGuardandoCargo(true);
      await cuentasService.registrarCargoCompleto({
        movimientoId: editingCargoId,
        cuentaId: cargoCuentaId,
        clientaId: id,
        monto: totalCargo,
        descripcion: descripcionCompuesta,
        detalles: detallesArray,
        nuevaCuenta: cargoEsNuevaCuenta,
        notaCuenta: notaFinal
      });

      toast.success(
        editingCargoId
          ? 'Venta actualizada correctamente'
          : cargoEsNuevaCuenta
            ? `Nueva cuenta abierta y venta de ${simboloMoneda || 'S/'} ${totalCargo.toFixed(2)} registrada`
            : `Venta de ${simboloMoneda || 'S/'} ${totalCargo.toFixed(2)} registrada`
      );
      setShowModalConfirmarNotaNuevaCuenta(false);
      setShowModalCargo(false);
      setEditingCargoId(null);
      setCargoNotaCuenta('');
      if (modalDetalleMov) setModalDetalleMov(null);
      await cargarDatos();
    } catch (err) {
      console.error('Error al guardar venta:', err);
      toast.error('Error al registrar la venta: ' + (err.message || ''));
    } finally {
      setGuardandoCargo(false);
    }
  };

  // --- LÓGICA MODAL ABONO (CREAR / EDITAR) ---
  const abrirModalAbono = (cuentaId = null, movEditar = null) => {
    setModalDetalleMov(null);
    const targetId = cuentaId || (cuentas.length > 0 ? cuentas[0].id : '');
    setAbonoCuentaId(targetId);
    setEditingAbonoId(movEditar ? movEditar.id : null);

    if (movEditar) {
      setAbonoMonto(String(movEditar.monto));
      const metodo = String(movEditar.metodo_pago || 'efectivo').toLowerCase();
      setAbonoMetodoPago(metodo);
      setAbonoEfectivo(movEditar.monto_efectivo ? String(movEditar.monto_efectivo) : '');
      setAbonoYape(movEditar.monto_yape ? String(movEditar.monto_yape) : '');
      setAbonoFecha(obtenerFechaInput(movEditar.fecha));
      setAbonoDescripcion(extraerNotaAbonoParaEdicion(movEditar.comentario || movEditar.descripcion || ''));
    } else {
      setAbonoMonto('');
      setAbonoMetodoPago('efectivo');
      setAbonoEfectivo('');
      setAbonoYape('');
      setAbonoFecha(getFechaHoyLocal());
      setAbonoDescripcion('');
    }

    setShowModalAbono(true);
  };

  const handleMontoAbonoChange = (val) => {
    setAbonoMonto(val);
    if (abonoMetodoPago === 'mixto') {
      const total = parseFloat(val) || 0;
      setAbonoEfectivo((total / 2).toFixed(2));
      setAbonoYape((total / 2).toFixed(2));
    }
  };

  const handleMixtoEfectivoChange = (val) => {
    setAbonoEfectivo(val);
    const total = parseFloat(abonoMonto) || 0;
    const ef = parseFloat(val) || 0;
    const diff = total - ef;
    setAbonoYape(diff > 0 ? diff.toFixed(2) : '');
  };

  const handleMixtoYapeChange = (val) => {
    setAbonoYape(val);
    const total = parseFloat(abonoMonto) || 0;
    const yp = parseFloat(val) || 0;
    const diff = total - yp;
    setAbonoEfectivo(diff > 0 ? diff.toFixed(2) : '');
  };

  const handleSubmitAbono = async (e) => {
    e.preventDefault();
    const montoNum = parseFloat(abonoMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.warning('Ingresa un monto válido mayor a 0');
      return;
    }

    const cuentaSeleccionada = cuentas.find((c) => c.id === abonoCuentaId) || cuentasCerradas.find((c) => c.id === abonoCuentaId);
    if (!editingAbonoId && cuentaSeleccionada && cuentaSeleccionada.saldo > 0 && montoNum > cuentaSeleccionada.saldo) {
      toast.warning(
        `El pago (${simboloMoneda || 'S/'} ${montoNum.toFixed(2)}) no puede ser mayor a la deuda actual (${simboloMoneda || 'S/'} ${cuentaSeleccionada.saldo.toFixed(2)})`
      );
      return;
    }

    let montoEf = 0;
    let montoYp = 0;
    if (abonoMetodoPago === 'mixto') {
      montoEf = parseFloat(abonoEfectivo) || 0;
      montoYp = parseFloat(abonoYape) || 0;
      const sumaMixto = montoEf + montoYp;
      if (Math.abs(sumaMixto - montoNum) > 0.01) {
        toast.warning(
          `La suma de Efectivo (${montoEf.toFixed(2)}) + Yape (${montoYp.toFixed(2)}) debe ser igual al total (${montoNum.toFixed(2)})`
        );
        return;
      }
    } else if (abonoMetodoPago === 'efectivo') {
      montoEf = montoNum;
    } else if (abonoMetodoPago === 'yape') {
      montoYp = montoNum;
    }

    const descFinal = abonoDescripcion.trim();

    try {
      setGuardandoAbono(true);
      await cuentasService.registrarAbonoCompleto({
        movimientoId: editingAbonoId,
        cuentaId: abonoCuentaId,
        clientaId: id,
        monto: montoNum,
        descripcion: descFinal,
        fecha: abonoFecha,
        metodoPago: abonoMetodoPago,
        montoEfectivo: montoEf,
        montoYape: montoYp
      });

      toast.success(
        editingAbonoId
          ? 'Pago actualizado correctamente'
          : `Pago de ${simboloMoneda || 'S/'} ${montoNum.toFixed(2)} registrado`
      );
      setShowModalAbono(false);
      setEditingAbonoId(null);
      if (modalDetalleMov) setModalDetalleMov(null);
      await cargarDatos();
    } catch (err) {
      console.error('Error al guardar pago:', err);
      toast.error('Error al registrar el pago: ' + (err.message || ''));
    } finally {
      setGuardandoAbono(false);
    }
  };

  // --- LÓGICA ANULACIÓN DE MOVIMIENTO ---
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

  // --- LÓGICA EDITAR CLIENTA ---
  const abrirModalEditarClienta = () => {
    if (!clienta) return;
    setFormEditClienta({
      nombre: clienta.nombre || '',
      telefono: clienta.telefono || '',
      direccion: clienta.direccion || '',
      referencia: clienta.referencia || '',
      notas: clienta.notas || ''
    });
    setShowModalEditClienta(true);
  };

  const handleSubmitEditClienta = async (e) => {
    e.preventDefault();
    if (!formEditClienta.nombre.trim()) {
      toast.warning('El nombre es obligatorio');
      return;
    }
    try {
      setSavingEditClienta(true);
      await clientasService.updateClienta(clienta.id || id, formEditClienta);
      toast.success('Datos de la clienta actualizados');
      setShowModalEditClienta(false);
      await cargarDatos();
    } catch (err) {
      console.error('Error al actualizar:', err);
      toast.error('Error al actualizar datos');
    } finally {
      setSavingEditClienta(false);
    }
  };

  // Helper para mostrar descripción corta en listas de cuentas
  const extraerDescripcionLimpia = (comentario, tipo) => {
    return resumirMovimientoCuentaActiva({ comentario, tipo }, todasCategorias);
  };

  const formatDate = (dateString) => {
    return formatearFechaCorta(dateString);
  };

  // --- NAVEGACIÓN Y ACCIONES TOPBAR ---
  const handleIrAHistorial = () => {
    setShowHistorialCerradas(true);
    setTimeout(() => {
      const sec = document.getElementById('historial-cuentas-section');
      if (sec) {
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // --- COMPARTIR ESTADO DE CUENTA EN FOTO ---
  const todasLasCuentas = [...cuentas, ...cuentasCerradas];

  const abrirModalCompartir = (cuentaTarget = null) => {
    if (cuentaTarget?.id) {
      setCuentaCompartirId(cuentaTarget.id);
    } else if (cuentas.length > 0) {
      setCuentaCompartirId(cuentas[0].id);
    } else if (cuentasCerradas.length > 0) {
      setCuentaCompartirId(cuentasCerradas[0].id);
    } else {
      setCuentaCompartirId(null);
    }
    setCopiadoExito(false);
    setShowModalCompartir(true);
  };

  const obtenerDatosVoucher = (cta) => {
    if (!cta) {
      return {
        numeroCuenta: 1,
        nota: '',
        esSaldada: false,
        creditosList: [],
        abonosList: [],
        totalCreditos: 0,
        totalPagos: 0,
        saldoActual: 0
      };
    }

    const numeroCuenta = cta.numeroCuenta || 1;
    const nota = cta.nota || '';
    const esSaldada = Number(cta.saldo || 0) <= 0;

    const movs = cta.movimientos || [];
    const validCargos = movs.filter(
      (m) => !m.anulado && (m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta')
    );
    const validAbonos = movs.filter(
      (m) => !m.anulado && (m.tipo === 'ABONO' || m.tipo === 'abono' || m.tipo === 'pago')
    );

    const totalCreditos = validCargos.reduce((sum, m) => sum + Number(m.monto || 0), 0);
    const totalPagos = validAbonos.reduce((sum, m) => sum + Number(m.monto || 0), 0);
    const saldoActual = Number(cta.saldo != null ? cta.saldo : Math.max(0, totalCreditos - totalPagos));

    // Extraer prendas o compras
    const creditosList = [];
    validCargos.forEach((c) => {
      const parsedItems = parsearPrendas(c.comentario || c.descripcion, c.fecha);
      if (parsedItems && parsedItems.length > 0) {
        parsedItems.forEach((p) => {
          const montoItem =
            p.monto != null && !isNaN(p.monto) && Number(p.monto) > 0
              ? Number(p.monto)
              : Number(c.monto || 0);
          creditosList.push({
            descripcion: p.descripcion,
            cantidad: p.cantidad || 1,
            monto: formatCurrency(montoItem),
            fecha: p.fechaDisplay || formatDate(p.fecha || c.fecha)
          });
        });
      } else {
        const desc = limpiarDescripcionTexto(c.comentario || c.descripcion, c.tipo) || 'Venta / Crédito';
        creditosList.push({
          descripcion: desc,
          cantidad: 1,
          monto: formatCurrency(c.monto),
          fecha: formatDate(c.fecha)
        });
      }
    });

    // Extraer abonos
    const abonosList = validAbonos.map((a) => {
      const notaAbono = extraerNotaAbonoParaEdicion(a.comentario || a.descripcion);
      const metodo = a.metodo_pago
        ? (a.metodo_pago.charAt(0).toUpperCase() + a.metodo_pago.slice(1).toLowerCase())
        : 'Efectivo';
      const detalle = notaAbono ? `${metodo} (${notaAbono})` : metodo;
      return {
        fecha: formatDate(a.fecha),
        monto: formatCurrency(a.monto),
        metodo: detalle
      };
    });

    return {
      numeroCuenta,
      nota,
      esSaldada,
      creditosList,
      abonosList,
      totalCreditos,
      totalPagos,
      saldoActual
    };
  };

  const capturarVoucherCanvas = async () => {
    const el = voucherRef.current;
    if (!el) return null;
    try {
      setGenerandoFoto(true);

      // Guardar posición de scroll previa y resetear
      const scrollParent = el.closest('.voucher-scroll-wrapper');
      const prevScrollTop = scrollParent ? scrollParent.scrollTop : 0;
      if (scrollParent) scrollParent.scrollTop = 0;

      // Altura y ancho totales del comprobante completo con margen de seguridad inferior
      const fullHeight = (el.scrollHeight || 0) + 40;
      const fullWidth = el.scrollWidth || 500;

      const canvas = await html2canvas(el, {
        scale: 2.2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        height: fullHeight,
        windowHeight: fullHeight + 300,
        x: 0,
        y: 0,
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc) => {
          const clonedCard = clonedDoc.getElementById('voucher-foto-card-print');
          if (clonedCard) {
            clonedCard.style.height = 'auto';
            clonedCard.style.maxHeight = 'none';
            clonedCard.style.overflow = 'visible';
            clonedCard.style.paddingBottom = '3rem';
          }
          const allWrappers = clonedDoc.querySelectorAll(
            '.voucher-scroll-wrapper, .modal-compartir-foto-wrap, .share-foto-modal-body, .modal-content, .modal-overlay'
          );
          allWrappers.forEach((w) => {
            w.style.height = 'auto';
            w.style.maxHeight = 'none';
            w.style.overflow = 'visible';
          });
        }
      });

      if (scrollParent) scrollParent.scrollTop = prevScrollTop;
      return canvas;
    } catch (err) {
      console.error('Error al renderizar foto del estado de cuenta:', err);
      toast.error('Ocurrió un error al generar la imagen.');
      return null;
    } finally {
      setGenerandoFoto(false);
    }
  };

  const handleDescargarFoto = async (cuentaTarget) => {
    const canvas = await capturarVoucherCanvas();
    if (!canvas) return;
    const nombreArchivo = `Estado_Cuenta_${(clienta?.nombre || 'Cliente').replace(/\s+/g, '_')}_Cta${cuentaTarget?.numeroCuenta || 1}.png`;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = nombreArchivo;
    a.click();
    toast.success('¡Foto descargada correctamente!');
  };

  const handleCopiarFoto = async () => {
    const canvas = await capturarVoucherCanvas();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast.success('¡Foto copiada al portapapeles! Puedes pegarla con Ctrl + V en WhatsApp o cualquier chat.');
        } catch (e) {
          console.warn('Error copiando foto al portapapeles:', e);
          toast.error('No se pudo copiar la foto directamente. Usa la opción Descargar Foto.');
        }
      } else {
        toast.info('Tu navegador no permite copiar imágenes. Usa la opción Descargar Foto.');
      }
    }, 'image/png', 1.0);
  };

  const handleCompartirFoto = async (cuentaTarget) => {
    const canvas = await capturarVoucherCanvas();
    if (!canvas) return;

    const nombreArchivo = `Estado_Cuenta_${(clienta?.nombre || 'Cliente').replace(/\s+/g, '_')}_Cta${cuentaTarget?.numeroCuenta || 1}.png`;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], nombreArchivo, { type: 'image/png' });

      // 1. Web Share API si soporta compartir archivos nativos (móviles)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Estado de Cuenta - ${clienta?.nombre || 'Cliente'}`,
            files: [file]
          });
          return;
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.warn('Error en navigator.share:', err);
          } else {
            return;
          }
        }
      }

      // 2. Si no admite compartir archivos nativos (ej. desktop):
      // Descargamos la imagen automáticamente
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = nombreArchivo;
      a.click();

      // Copiamos la foto al portapapeles
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch (clipErr) {
          console.warn('Error al copiar a clipboard:', clipErr);
        }
      }

      // Mensaje formal para WhatsApp sin emojis
      let telLimpio = (clienta?.telefono || '').replace(/\D/g, '');
      if (telLimpio.length === 9 && telLimpio.startsWith('9')) {
        telLimpio = '51' + telLimpio;
      }
      const nombreNegocioMostrado = negocioActual?.nombre || config?.nombreNegocio || 'ApuntaDeuda';
      const msj = `Estimado(a) ${clienta?.nombre || 'Cliente'}, le adjunto la foto con su Estado de Cuenta (${nombreNegocioMostrado}). Cuenta #${cuentaTarget?.numeroCuenta || 1}. Saldo pendiente: ${formatCurrency(cuentaTarget?.saldo || 0)}.`;

      const waUrl = telLimpio
        ? `https://api.whatsapp.com/send?phone=${telLimpio}&text=${encodeURIComponent(msj)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msj)}`;

      toast.success('¡Foto descargada y copiada al portapapeles! En WhatsApp solo presiona Ctrl + V para pegarla.');
      setTimeout(() => {
        window.open(waUrl, '_blank');
      }, 700);
    }, 'image/png', 1.0);
  };

  if (loading) {
    return (
      <div className="clienta-detalle-loading">
        <div className="spinner"></div>
        <p>Cargando información...</p>
      </div>
    );
  }

  if (error || !clienta) {
    return (
      <div className="clienta-detalle-error">
        <p>{error || 'Clienta no encontrada'}</p>
        <button onClick={handleVolver} className="btn-primary">
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="clienta-detalle animate-fadeIn">
      {/* TOPBAR */}
      <div className="detalle-topbar">
        <button onClick={handleVolver} className="btn-back" title="Volver a la pantalla anterior">
          <ArrowLeft size={18} strokeWidth={2.5} />
          <span>Volver</span>
        </button>

        <div className="detalle-topbar-actions">
          {cuentasCerradas.length > 0 && (
            <button
              type="button"
              className="btn-topbar-action btn-topbar-historial"
              onClick={handleIrAHistorial}
              title="Ir al Historial de cuentas saldadas"
            >
              <Clock size={16} strokeWidth={2.2} />
              <span>Historial de Cuentas</span>
            </button>
          )}

          {(cuentas.length > 0 || cuentasCerradas.length > 0) && (
            <button
              type="button"
              className="btn-topbar-action btn-topbar-share"
              onClick={() => abrirModalCompartir()}
              title="Compartir Estado de Cuenta (Foto)"
            >
              <Share2 size={16} strokeWidth={2.2} />
              <span>Compartir</span>
            </button>
          )}
        </div>
      </div>

      {/* PERFIL CLIENTA */}
      <div className="clienta-profile-card">
        <div className="profile-main">
          <div className="profile-avatar">
            {clienta.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <div className="profile-name-row">
              <h1>{clienta.nombre}</h1>
              <button
                className="btn-edit-profile"
                onClick={abrirModalEditarClienta}
                title="Editar información de clienta"
              >
                <Pencil size={15} strokeWidth={2} />
              </button>
            </div>

            {/* BOTÓN COLAPSABLE VER DETALLES DE CLIENTA */}
            <button
              type="button"
              className="btn-toggle-detalles-clienta"
              onClick={() => setShowDetallesClienta(!showDetallesClienta)}
            >
              <span>{showDetallesClienta ? 'Ocultar detalles de clienta' : 'Ver detalles de clienta'}</span>
              <ChevronDown
                size={16}
                strokeWidth={2.2}
                className={`chevron-icon ${showDetallesClienta ? 'rotated' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* SECCIÓN DESPLEGABLE DE INFORMACIÓN SECUNDARIA DE LA CLIENTA */}
        {showDetallesClienta && (
          <div className="clienta-detalles-desplegable animate-fadeIn">
            <div className="detalles-grid">
              <div className="detalle-item-card">
                <div className="detalle-item-label">
                  <Phone size={13} strokeWidth={2} />
                  <span>Teléfono</span>
                </div>
                <div className="detalle-item-val">
                  {clienta.telefono ? (
                    <a href={`tel:${clienta.telefono}`} className="detalle-tel-link">
                      {clienta.telefono}
                    </a>
                  ) : (
                    <span className="text-muted">No registrado</span>
                  )}
                </div>
              </div>

              <div className="detalle-item-card">
                <div className="detalle-item-label">
                  <MapPin size={13} strokeWidth={2} />
                  <span>Dirección</span>
                </div>
                <div className="detalle-item-val">
                  {clienta.direccion || <span className="text-muted">No registrada</span>}
                </div>
              </div>

              <div className="detalle-item-card">
                <div className="detalle-item-label">
                  <User size={13} strokeWidth={2} />
                  <span>Referencia</span>
                </div>
                <div className="detalle-item-val">
                  {clienta.referencia ? (
                    <strong className="detalle-ref-text">{clienta.referencia}</strong>
                  ) : (
                    <span className="text-muted">No registrada</span>
                  )}
                </div>
              </div>

              <div className="detalle-item-card detalle-item-full">
                <div className="detalle-item-label">
                  <Tag size={13} strokeWidth={2} />
                  <span>Notas</span>
                </div>
                <div className="detalle-item-val">
                  {clienta.notas ? (
                    <p className="detalle-notas-text">{clienta.notas}</p>
                  ) : (
                    <span className="text-muted">Sin notas adicionales</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RESUMEN GLOBAL (DEUDA TOTAL + TOTAL ABONADO) EN UNA SOLA FILA */}
      <div className="resumen-global-grid">
        <div className="resumen-global-card card-deuda">
          <div className="resumen-card-header">
            <div className="resumen-icon icon-deuda">
              <TrendingUp size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="resumen-card-label">Deuda Total</span>
            </div>
          </div>
          <div className="resumen-card-monto monto-deuda">
            {formatCurrency(resumen.totalDeuda)}
          </div>
        </div>

        <div className="resumen-global-card card-abono">
          <div className="resumen-card-header">
            <div className="resumen-icon icon-abono">
              <TrendingDown size={18} strokeWidth={2.5} />
            </div>
            <div>
              <span className="resumen-card-label">Total Abonado</span>
            </div>
          </div>
          <div className="resumen-card-monto monto-abono">
            {formatCurrency(resumen.totalAbonos)}
          </div>
        </div>
      </div>

      {/* SECCIÓN CUENTAS ACTIVAS */}
      <div className="cuentas-section-header">
        <h2>Cuentas Activas</h2>
        <button className="btn-nueva-cuenta-top" onClick={handleAbrirNuevaCuenta}>
          <PlusCircle size={16} strokeWidth={2.2} />
          <span>Abrir nueva cuenta</span>
        </button>
      </div>

      {cuentas.length === 0 ? (
        <div className="sin-cuentas-card">
          <div className="sin-cuentas-icon">
            <Receipt size={44} strokeWidth={1.5} />
          </div>
          <h3>Sin cuenta activa</h3>
          <p>Abre una nueva cuenta para comenzar a registrar movimientos.</p>
          <button className="btn btn-primary btn-abrir-cuenta-hero" onClick={handleAbrirNuevaCuenta}>
            <Plus size={18} strokeWidth={2.5} />
            <span>Abrir nueva cuenta</span>
          </button>
        </div>
      ) : (
        <div className="cuentas-lista">
          {cuentas.map((cuenta, idx) => {
            const numeroCuenta = cuenta.numeroCuenta || idx + 1;
            const estiloColor = COLORES_CUENTA[(numeroCuenta - 1) % COLORES_CUENTA.length];
            const movs = cuenta.movimientos || [];
            const isExpanded = cuentasExpandidas[cuenta.id];
            const showAll = movimientosExpandidos[cuenta.id];
            const visibleMovs = showAll ? movs : movs.slice(0, 3);

            return (
              <div
                key={cuenta.id}
                className="cuenta-card"
                style={{ borderLeftColor: estiloColor.border }}
              >
                {/* CABECERA CUENTA */}
                <div className="cuenta-card-header">
                  <div className="cuenta-title-wrap">
                    <div
                      className="cuenta-badge-numero"
                      style={{
                        backgroundColor: estiloColor.bg,
                        borderColor: estiloColor.border,
                        color: estiloColor.numero
                      }}
                    >
                      #{numeroCuenta}
                    </div>
                    <div className="cuenta-title-texts">
                      <div className="cuenta-nombre-linea">
                        <h3 className="cuenta-nombre-titulo">Cuenta #{numeroCuenta}</h3>
                        {cuenta.nota && (
                          <span className="cuenta-nota-inline" title="Nota de la cuenta">
                            · {cuenta.nota}
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn-edit-nota-cuenta"
                          onClick={() => abrirModalEditarNotaCuenta(cuenta)}
                          title={cuenta.nota ? "Editar nota de la cuenta" : "Agregar nota a esta cuenta"}
                        >
                          <Pencil size={12} strokeWidth={2.2} />
                        </button>
                      </div>
                      <span className="cuenta-fecha-creacion">
                        Desde {formatDate(cuenta.fechaCreacion)}
                      </span>
                      {cuenta.nota && (
                        <span className="cuenta-nota-mobile">
                          {cuenta.nota}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="cuenta-saldo-block">
                    <span className="cuenta-saldo-label">SALDO ACTUAL</span>
                    <span className={`cuenta-saldo-valor ${cuenta.saldo > 0 ? 'saldo-deuda' : 'saldo-cero'}`}>
                      {formatCurrency(cuenta.saldo)}
                    </span>
                  </div>
                </div>

                {/* BOTONES ACCIÓN POR CUENTA */}
                <div className="cuenta-acciones-row">
                  <button
                    className="btn-cuenta-accion btn-cargo"
                    onClick={() => abrirModalCargo(cuenta.id, false)}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    <span>Registrar venta</span>
                  </button>

                  <button
                    className="btn-cuenta-accion btn-abono"
                    onClick={() => abrirModalAbono(cuenta.id)}
                  >
                    <Minus size={18} strokeWidth={2.5} />
                    <span>Registrar pago</span>
                  </button>
                </div>

                {/* ACORDEÓN MOVIMIENTOS */}
                {movs.length > 0 && (
                  <div className="cuenta-movimientos-wrap">
                    <button
                      className="movimientos-toggle-btn"
                      onClick={() => toggleCuentaExpandida(cuenta.id)}
                    >
                      <span className="movimientos-toggle-titulo">
                        Movimientos ({movs.length})
                      </span>
                      <ChevronDown
                        size={18}
                        strokeWidth={2}
                        className={`chevron-icon ${isExpanded ? 'rotated' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="cuenta-movimientos-tabla">
                        <div className="movimientos-tabla-header">
                          <span>Descripción</span>
                          <span>Monto</span>
                        </div>

                        {visibleMovs.map((mov) => {
                          const esCargo =
                            mov.tipo === 'CARGO' || mov.tipo === 'cargo' || mov.tipo === 'venta';
                          const descLimpia = extraerDescripcionLimpia(mov.comentario || mov.descripcion, mov.tipo);

                          return (
                            <div
                              key={mov.id || mov.movimiento_id}
                              className={`movimiento-mini-row ${esCargo ? 'mini-cargo' : 'mini-abono'} ${mov.anulado ? 'mini-anulado' : ''}`}
                              onClick={() => setModalDetalleMov(mov)}
                            >
                              <div className="mini-row-left">
                                <div className={`mini-badge-tipo ${esCargo ? 'badge-cargo' : 'badge-abono'}`}>
                                  {esCargo ? (
                                    <TrendingUp size={13} strokeWidth={2.5} />
                                  ) : (
                                    <TrendingDown size={13} strokeWidth={2.5} />
                                  )}
                                </div>
                                <div className="mini-info">
                                  <span className={`mini-desc ${mov.anulado ? 'desc-tachada monto-tachado' : ''}`}>{descLimpia}</span>
                                  <span className="mini-fecha">{formatDate(mov.fecha)}</span>
                                </div>
                              </div>

                              <div className="mini-row-right">
                                <span className={`mini-monto ${esCargo ? 'monto-rojo' : 'monto-verde'} ${mov.anulado ? 'monto-tachado' : ''}`}>
                                  {esCargo ? '+' : '-'}{formatCurrency(mov.monto)}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {movs.length > 3 && (
                          <button
                            className="btn-ver-mas-movs"
                            onClick={() => toggleMostrarTodosMovs(cuenta.id)}
                          >
                            {showAll ? 'Ver menos' : `+${movs.length - 3} movimientos más`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* BOTÓN INFERIOR ABRIR NUEVA CUENTA */}
          <button className="btn-abrir-nueva-cuenta-banner" onClick={handleAbrirNuevaCuenta}>
            <PlusCircle size={20} strokeWidth={2.2} />
            <span>Abrir nueva cuenta</span>
          </button>
        </div>
      )}

      {/* HISTORIAL DE CUENTAS CERRADAS (SI EXISTEN) */}
      {cuentasCerradas.length > 0 && (
        <div className="historial-cuentas-cerradas-section" id="historial-cuentas-section">
          <button
            className="btn-toggle-historial-cerradas"
            onClick={() => setShowHistorialCerradas(!showHistorialCerradas)}
          >
            <div className="historial-toggle-left">
              <Clock size={20} strokeWidth={2} />
              <div>
                <span className="historial-toggle-title">Historial de cuentas</span>
                <span className="historial-toggle-sub">
                  {cuentasCerradas.length} {cuentasCerradas.length === 1 ? 'cuenta saldada' : 'cuentas saldadas'}
                </span>
              </div>
            </div>
            <ChevronDown
              size={20}
              strokeWidth={2}
              className={`chevron-icon ${showHistorialCerradas ? 'rotated' : ''}`}
            />
          </button>

          {showHistorialCerradas && (
            <div className="cuentas-cerradas-lista">
              {cuentasCerradas.map((c, i) => {
                const numeroCuenta = c.numeroCuenta || i + 1;
                const movs = c.movimientos || [];
                const isExpanded = cuentasExpandidas[c.id];
                const showAll = movimientosExpandidos[c.id];
                const visibleMovs = showAll ? movs : movs.slice(0, 3);

                return (
                  <div key={c.id} className="cuenta-cerrada-card">
                    <div className="cerrada-header">
                      <div className="cerrada-title-wrap">
                        <div className="cuenta-badge-numero badge-cerrada-num">
                          #{numeroCuenta}
                        </div>
                        <div className="cuenta-title-texts">
                          <div className="cuenta-nombre-linea">
                            <span className="cerrada-nombre-cuenta">Cuenta #{numeroCuenta}</span>
                            {c.nota && (
                              <span className="cuenta-nota-inline" title="Nota de la cuenta">
                                · {c.nota}
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn-edit-nota-cuenta"
                              onClick={() => abrirModalEditarNotaCuenta(c)}
                              title={c.nota ? "Editar nota de la cuenta" : "Agregar nota a esta cuenta"}
                            >
                              <Pencil size={12} strokeWidth={2.2} />
                            </button>
                          </div>
                          <span className="cerrada-fecha">Creada: {formatDate(c.fechaCreacion)}</span>
                          {c.nota && (
                            <span className="cuenta-nota-mobile">
                              {c.nota}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="badge-cerrada">Saldada ({simboloMoneda || 'S/'} 0.00)</span>
                    </div>

                    {/* Acordeón de movimientos de la cuenta cerrada para permitir ver/editar abonos o cargos */}
                    {movs.length > 0 && (
                      <div className="cuenta-movimientos-wrap cerrada-movs-wrap">
                        <button
                          className="movimientos-toggle-btn"
                          onClick={() => toggleCuentaExpandida(c.id)}
                        >
                          <span className="movimientos-toggle-titulo">
                            Movimientos ({movs.length})
                          </span>
                          <ChevronDown
                            size={18}
                            strokeWidth={2}
                            className={`chevron-icon ${isExpanded ? 'rotated' : ''}`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="cuenta-movimientos-tabla">
                            <div className="movimientos-tabla-header">
                              <span>Descripción</span>
                              <span>Monto</span>
                            </div>

                            {visibleMovs.map((mov) => {
                              const esCargo =
                                mov.tipo === 'CARGO' || mov.tipo === 'cargo' || mov.tipo === 'venta';
                              const descLimpia = extraerDescripcionLimpia(mov.comentario || mov.descripcion, mov.tipo);

                              return (
                                <div
                                  key={mov.id || mov.movimiento_id}
                                  className={`movimiento-mini-row ${esCargo ? 'mini-cargo' : 'mini-abono'} ${mov.anulado ? 'mini-anulado' : ''}`}
                                  onClick={() => setModalDetalleMov(mov)}
                                >
                                  <div className="mini-row-left">
                                    <div className={`mini-badge-tipo ${esCargo ? 'badge-cargo' : 'badge-abono'}`}>
                                      {esCargo ? '↑' : '↓'}
                                    </div>
                                    <div className="mini-info">
                                      <span className={`mini-desc ${mov.anulado ? 'desc-tachada monto-tachado' : ''}`}>{descLimpia}</span>
                                      <span className="mini-fecha">{formatDate(mov.fecha)}</span>
                                    </div>
                                  </div>

                                  <div className="mini-row-right">
                                    <span className={`mini-monto ${esCargo ? 'monto-rojo' : 'monto-verde'} ${mov.anulado ? 'monto-tachado' : ''}`}>
                                      {esCargo ? '+' : '-'}{formatCurrency(mov.monto)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}

                            {movs.length > 3 && (
                              <button
                                className="btn-ver-mas-movs"
                                onClick={() => toggleMostrarTodosMovs(c.id)}
                              >
                                {showAll ? 'Ver menos' : `+${movs.length - 3} movimientos más`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL REGISTRAR / EDITAR VENTA (PRENDAS / PRODUCTOS)
          ======================================================== */}
      {showModalCargo && (
        <div className="modal-overlay" onClick={() => setShowModalCargo(false)}>
          <div className="modal-content modal-android-cargo" onClick={(e) => e.stopPropagation()}>
            {/* Cabecera Tipo Android */}
            <div className="android-cargo-header">
              <div className="android-header-info">
                <div className="android-tipo-circle circle-cargo">
                  ↑
                </div>
                <div>
                  <h2>{editingCargoId ? 'Editar Venta' : cargoEsNuevaCuenta ? 'Abrir Cuenta (Nueva Venta)' : 'Registrar Venta'}</h2>
                  <p className="android-sub-info">Aumenta la deuda</p>
                </div>
              </div>
              <button className="btn-close-clean" onClick={() => setShowModalCargo(false)}>
                &times;
              </button>
            </div>

            {/* Barra de Total en vivo */}
            <div className="android-total-bar">
              <span>Total</span>
              <span className="android-total-monto">{formatCurrency(calcularTotalCargo())}</span>
            </div>

            <form onSubmit={handleSubmitCargo}>
              {/* Tarjetas de prendas / productos */}
              <div className="android-prendas-container">
                {prendas.map((prenda, idx) => (
                  <div key={idx} className="android-prenda-card">
                    {/* Fila 1: Badge número, Selector Categoría y Tacho Eliminar */}
                    <div className="prenda-card-row1">
                      <div className="prenda-badge-circle">
                        {idx + 1}
                      </div>

                      <div className="prenda-cat-dropdown-wrap">
                        <select
                          value={prenda.categoria}
                          onChange={(e) => actualizarPrenda(idx, 'categoria', e.target.value)}
                          className="android-select-cat"
                        >
                          {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.icono} {cat.nombre}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-add-cat-inline"
                          onClick={() => handleAbrirModalNuevaCat(idx)}
                          title="Agregar nueva categoría al negocio"
                        >
                          + Agregar categoría
                        </button>
                      </div>

                      {prendas.length > 1 && (
                        <button
                          type="button"
                          className="btn-trash-prenda"
                          onClick={() => eliminarPrenda(idx)}
                          title="Eliminar producto"
                        >
                          <Trash2 size={18} strokeWidth={2} />
                        </button>
                      )}
                    </div>

                    {/* Fila 2: Input Monto S/ y Botón Fecha */}
                    <div className="prenda-card-row2">
                      <div className="android-monto-input-wrap">
                        <span className="android-monto-prefix">{simboloMoneda || 'S/'}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={prenda.monto}
                          onChange={(e) => actualizarPrenda(idx, 'monto', e.target.value)}
                          required
                          autoFocus={idx === 0}
                        />
                      </div>

                      <div className="android-fecha-input-wrap">
                        <Calendar size={16} strokeWidth={2} />
                        <input
                          type="date"
                          value={prenda.fecha}
                          onChange={(e) => actualizarPrenda(idx, 'fecha', e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Fila 3: Descripción de la prenda */}
                    <div className="prenda-card-row3">
                      <input
                        type="text"
                        placeholder="Descripción / Prenda (ej: Blusa, Pantalón...)"
                        value={prenda.descripcion}
                        onChange={(e) => actualizarPrenda(idx, 'descripcion', e.target.value)}
                        className="android-input-desc"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón Agregar otra prenda */}
              <button type="button" className="btn-android-add-prenda" onClick={agregarPrenda}>
                <Plus size={18} strokeWidth={2.5} />
                <span>Agregar otro producto</span>
              </button>

              {/* Botón Guardar Grande */}
              <div className="android-modal-actions-footer">
                <button type="submit" className="btn-android-guardar" disabled={guardandoCargo}>
                  {guardandoCargo ? (
                    'Guardando...'
                  ) : (
                    <>
                      <Check size={20} strokeWidth={2.5} />
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DETALLE DEL MOVIMIENTO (SEGÚN IMAGEN 1 ANDROID)
          ======================================================== */}
      {modalDetalleMov && (
        <div className="modal-overlay" onClick={() => setModalDetalleMov(null)}>
          <div className="modal-content modal-android-detalle" onClick={(e) => e.stopPropagation()}>
            <div className="android-detalle-topbar">
              <h2>Detalle del movimiento</h2>
              <button className="btn-close-clean" onClick={() => setModalDetalleMov(null)}>
                &times;
              </button>
            </div>

            <div className="android-detalle-content">
              {/* Icono circular y Tipo */}
              <div className="android-detalle-hero">
                <div
                  className={`android-hero-circle ${modalDetalleMov.anulado
                    ? 'circle-anulado'
                    : modalDetalleMov.tipo === 'CARGO' || modalDetalleMov.tipo === 'cargo' || modalDetalleMov.tipo === 'venta'
                      ? 'circle-cargo'
                      : 'circle-abono'
                    }`}
                >
                  {modalDetalleMov.anulado
                    ? '✕'
                    : modalDetalleMov.tipo === 'CARGO' || modalDetalleMov.tipo === 'cargo' || modalDetalleMov.tipo === 'venta'
                      ? '↑'
                      : '↓'}
                </div>
                <div className="android-hero-title-wrap">
                  <h3 className="android-hero-title">
                    {modalDetalleMov.tipo === 'CARGO' || modalDetalleMov.tipo === 'cargo' || modalDetalleMov.tipo === 'venta' ? 'Venta' : 'Pago'}
                  </h3>
                  {modalDetalleMov.anulado && (
                    <span className="android-hero-badge-anulado">ANULADO</span>
                  )}
                </div>
                <span className="android-hero-date">{formatDate(modalDetalleMov.fecha)}</span>
              </div>

              {/* Banner de Movimiento Anulado / Eliminado */}
              {modalDetalleMov.anulado && (
                <div className="android-detalle-anulado-banner">
                  <div className="anulado-banner-title">
                    <AlertCircle size={18} strokeWidth={2.2} />
                    <span>Movimiento Eliminado</span>
                  </div>
                  <p>Este movimiento fue anulado y ya no afecta el saldo de la cuenta.</p>
                  {modalDetalleMov.fecha_anulacion && (
                    <small>Fecha de anulación: {formatDate(modalDetalleMov.fecha_anulacion)}</small>
                  )}
                </div>
              )}

              {/* Monto total */}
              <div className={`android-monto-total-card ${modalDetalleMov.anulado ? 'card-monto-anulado' : ''}`}>
                <span className="monto-total-label">
                  {modalDetalleMov.anulado ? 'Monto Anulado' : 'Monto total'}
                </span>
                <span
                  className={`monto-total-val ${modalDetalleMov.anulado
                    ? 'val-anulado monto-tachado'
                    : modalDetalleMov.tipo === 'CARGO' || modalDetalleMov.tipo === 'cargo' || modalDetalleMov.tipo === 'venta'
                      ? 'val-rojo'
                      : 'val-verde'
                    }`}
                >
                  {formatCurrency(modalDetalleMov.monto)}
                </span>
              </div>

              {/* Detalle de prendas o Métodos de Pago */}
              {modalDetalleMov.tipo === 'CARGO' || modalDetalleMov.tipo === 'cargo' || modalDetalleMov.tipo === 'venta' ? (
                <div className="android-prendas-detalle-section">
                  <h4 className="prendas-section-title">Detalle de la venta</h4>
                  <div className="prendas-items-list">
                    {parsearPrendas(modalDetalleMov.comentario || modalDetalleMov.descripcion, modalDetalleMov.fecha).length > 0 ? (
                      parsearPrendas(modalDetalleMov.comentario || modalDetalleMov.descripcion, modalDetalleMov.fecha).map((p, pIdx) => (
                        <div key={pIdx} className="android-prenda-row-item">
                          <div className="prenda-row-left">
                            <div className={`prenda-num-bubble ${modalDetalleMov.anulado ? 'bubble-anulado' : ''}`}>
                              {pIdx + 1}
                            </div>
                            <div className="prenda-texts">
                              <span className={`prenda-name ${modalDetalleMov.anulado ? 'monto-tachado' : ''}`}>{p.descripcion}</span>
                              <div className="prenda-meta-chips">
                                <span className="prenda-cat-chip">
                                  <Tag size={12} strokeWidth={2} />
                                  {obtenerNombreCategoria(p.categoria)}
                                </span>
                                <span className="prenda-date-chip">
                                  <Calendar size={12} strokeWidth={2} />
                                  {p.fechaDisplay || formatDate(p.fecha)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="prenda-row-right">
                            <span className={`prenda-amount-val ${modalDetalleMov.anulado ? 'monto-tachado text-muted' : ''}`}>
                              {formatCurrency(p.monto)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="android-prenda-row-item">
                        <div className="prenda-row-left">
                          <div className={`prenda-num-bubble ${modalDetalleMov.anulado ? 'bubble-anulado' : ''}`}>1</div>
                          <div className="prenda-texts">
                            <span className={`prenda-name ${modalDetalleMov.anulado ? 'monto-tachado' : ''}`}>
                              {modalDetalleMov.comentario || modalDetalleMov.descripcion || 'Sin descripción'}
                            </span>
                          </div>
                        </div>
                        <div className="prenda-row-right">
                          <span className={`prenda-amount-val ${modalDetalleMov.anulado ? 'monto-tachado text-muted' : ''}`}>{formatCurrency(modalDetalleMov.monto)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="android-abono-info-section">
                  <h4 className="prendas-section-title">Información del Pago</h4>
                  <div className="abono-info-box">
                    <div className="abono-info-row">
                      <span>Método de pago:</span>
                      <strong className="profile-chip chip-tel">{modalDetalleMov.metodo_pago || 'Efectivo'}</strong>
                    </div>
                    {(() => {
                      const nota = extraerNotaAbonoParaEdicion(modalDetalleMov.comentario || modalDetalleMov.descripcion);
                      if (!nota) return null;
                      return (
                        <div className="abono-info-row">
                          <span>Nota:</span>
                          <p className={modalDetalleMov.anulado ? 'monto-tachado' : ''}>{nota}</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Botones inferiores: si está anulado muestra Cerrar, si no muestra Eliminar y Editar */}
            {modalDetalleMov.anulado ? (
              <div className="android-detalle-actions-anulado">
                <button
                  type="button"
                  className="btn-android-cerrar-anulado"
                  onClick={() => setModalDetalleMov(null)}
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="android-detalle-actions">
                <button
                  type="button"
                  className="btn-android-action-eliminar"
                  onClick={() => handleAnularMovimiento(modalDetalleMov)}
                  disabled={anulandoMovimiento}
                >
                  <Trash2 size={17} strokeWidth={2} />
                  <span>{anulandoMovimiento ? 'Eliminando...' : 'Eliminar'}</span>
                </button>

                <button
                  type="button"
                  className="btn-android-action-editar"
                  onClick={() => {
                    const mov = modalDetalleMov;
                    setModalDetalleMov(null);
                    if (mov.tipo === 'CARGO' || mov.tipo === 'cargo' || mov.tipo === 'venta') {
                      abrirModalCargo(mov.cuenta_id, false, mov);
                    } else {
                      abrirModalAbono(mov.cuenta_id, mov);
                    }
                  }}
                >
                  <Pencil size={17} strokeWidth={2} />
                  <span>Editar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL REGISTRAR / EDITAR PAGO
          ======================================================== */}
      {showModalAbono && (() => {
        const cuentaAbono = cuentas.find((c) => c.id === abonoCuentaId) || cuentasCerradas.find((c) => c.id === abonoCuentaId);
        const numeroCuentaAbono = cuentaAbono?.numeroCuenta || (cuentas.findIndex((c) => c.id === abonoCuentaId) + 1) || 1;

        return (
          <div className="modal-overlay" onClick={() => setShowModalAbono(false)}>
            <div className="modal-content modal-android-abono" onClick={(e) => e.stopPropagation()}>
              <div className="android-cargo-header">
                <div className="android-header-info">
                  <div className="android-tipo-circle circle-abono">
                    ↓
                  </div>
                  <div>
                    <h2>{editingAbonoId ? 'Editar Pago' : 'Registrar Pago'} · Cuenta #{numeroCuentaAbono}</h2>
                    <p className="android-sub-info">
                      {cuentaAbono?.saldo !== undefined
                        ? `Saldo actual: ${formatCurrency(cuentaAbono.saldo)}`
                        : 'Reduce la deuda'}
                    </p>
                  </div>
                </div>
                <button className="btn-close-clean" onClick={() => setShowModalAbono(false)}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmitAbono} className="android-abono-form">
                {/* Monto */}
                <div className="form-group">
                  <label htmlFor="abono-monto-input">Monto del Pago ({simboloMoneda}) *</label>
                  <div className="android-monto-input-wrap large-monto">
                    <span className="android-monto-prefix">{simboloMoneda || 'S/'}</span>
                    <input
                      id="abono-monto-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={abonoMonto}
                      onChange={(e) => handleMontoAbonoChange(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

              {/* Selector de Método de Pago */}
              <div className="form-group">
                <label>Método de Pago</label>
                <div className="metodo-pago-pills">
                  <button
                    type="button"
                    className={`pago-pill ${abonoMetodoPago === 'efectivo' ? 'active' : ''}`}
                    onClick={() => setAbonoMetodoPago('efectivo')}
                  >
                    💵 Efectivo
                  </button>
                  <button
                    type="button"
                    className={`pago-pill ${abonoMetodoPago === 'yape' ? 'active' : ''}`}
                    onClick={() => setAbonoMetodoPago('yape')}
                  >
                    📱 Yape / Plin
                  </button>
                  <button
                    type="button"
                    className={`pago-pill ${abonoMetodoPago === 'mixto' ? 'active' : ''}`}
                    onClick={() => {
                      setAbonoMetodoPago('mixto');
                      const total = parseFloat(abonoMonto) || 0;
                      setAbonoEfectivo((total / 2).toFixed(2));
                      setAbonoYape((total / 2).toFixed(2));
                    }}
                  >
                    🔄 Mixto
                  </button>
                </div>
              </div>

              {/* Campos duales si es Mixto */}
              {abonoMetodoPago === 'mixto' && (
                <div className="mixto-inputs-grid">
                  <div className="form-group">
                    <label>Efectivo ({simboloMoneda})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={abonoEfectivo}
                      onChange={(e) => handleMixtoEfectivoChange(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Yape ({simboloMoneda})</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={abonoYape}
                      onChange={(e) => handleMixtoYapeChange(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Fecha */}
              <div className="form-group">
                <label htmlFor="abono-fecha-input">Fecha del Pago</label>
                <input
                  id="abono-fecha-input"
                  type="date"
                  value={abonoFecha}
                  onChange={(e) => setAbonoFecha(e.target.value)}
                  required
                />
              </div>

              {/* Nota opcional */}
              <div className="form-group">
                <label htmlFor="abono-nota-input">Nota / Comentario (opcional)</label>
                <input
                  id="abono-nota-input"
                  type="text"
                  placeholder="Ej: Pago quincena, adelanto en tienda..."
                  value={abonoDescripcion}
                  onChange={(e) => setAbonoDescripcion(e.target.value)}
                />
              </div>

                <div className="android-modal-actions-footer">
                  <button type="submit" className="btn-android-guardar" disabled={guardandoAbono}>
                    {guardandoAbono ? (
                      'Guardando...'
                    ) : (
                      <>
                        <Check size={20} strokeWidth={2.5} />
                        <span>Guardar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ========================================================
          MODAL EDITAR CLIENTA
          ======================================================== */}
      {showModalEditClienta && (
        <div className="modal-overlay" onClick={() => setShowModalEditClienta(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Clienta</h2>
              <button className="btn-close" onClick={() => setShowModalEditClienta(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitEditClienta}>
              <div className="form-group">
                <label htmlFor="edit-nombre">Nombre *</label>
                <input
                  id="edit-nombre"
                  type="text"
                  value={formEditClienta.nombre}
                  onChange={(e) => setFormEditClienta({ ...formEditClienta, nombre: e.target.value })}
                  placeholder="Nombre de la clienta"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-telefono">Teléfono</label>
                <input
                  id="edit-telefono"
                  type="tel"
                  value={formEditClienta.telefono}
                  onChange={(e) => setFormEditClienta({ ...formEditClienta, telefono: e.target.value })}
                  placeholder="999 999 999"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-direccion">Dirección</label>
                <input
                  id="edit-direccion"
                  type="text"
                  value={formEditClienta.direccion}
                  onChange={(e) => setFormEditClienta({ ...formEditClienta, direccion: e.target.value })}
                  placeholder="Dirección de la clienta"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-referencia">Referencia</label>
                <input
                  id="edit-referencia"
                  type="text"
                  value={formEditClienta.referencia}
                  onChange={(e) => setFormEditClienta({ ...formEditClienta, referencia: e.target.value })}
                  placeholder="¿Quién la recomendó?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-notas">Notas</label>
                <textarea
                  id="edit-notas"
                  value={formEditClienta.notas}
                  onChange={(e) => setFormEditClienta({ ...formEditClienta, notas: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModalEditClienta(false)}
                  disabled={savingEditClienta}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={savingEditClienta}>
                  {savingEditClienta ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUBMODAL AGREGAR CATEGORÍA RÁPIDA (DESDE NUEVO CARGO)
          ======================================================== */}
      {showModalNuevaCat && (
        <div className="modal-overlay modal-overlay-submodal" onClick={() => setShowModalNuevaCat(false)}>
          <div className="modal-content modal-quick-categoria" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="quick-cat-header-title">
                <span className="quick-cat-icon-badge">✨</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Nueva Categoría</h3>
                  <p className="quick-cat-subtitle">Para los productos del negocio</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowModalNuevaCat(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleGuardarNuevaCategoria}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="quick-cat-nombre">Nombre de la categoría *</label>
                <input
                  id="quick-cat-nombre"
                  type="text"
                  placeholder="Ej: Ropa de bebé, Calzado escolar..."
                  value={nuevaCatNombre}
                  onChange={(e) => setNuevaCatNombre(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.4rem' }}>Emoji / Ícono representativo</label>
                <div className="quick-cat-emojis">
                  {['👕', '👗', '👟', '✨', '👜', '💍', '💄', '👶', '📚', '🎒', '🕶️', '⌚', '🎁', '🧸', '🏷️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`btn-emoji-select ${nuevaCatIcono === emoji ? 'active' : ''}`}
                      onClick={() => setNuevaCatIcono(emoji)}
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
                  onClick={() => setShowModalNuevaCat(false)}
                  disabled={guardandoNuevaCat}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guardandoNuevaCat || !nuevaCatNombre.trim()}
                >
                  {guardandoNuevaCat ? 'Guardando...' : 'Guardar categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL CONFIRMACIÓN: AGREGAR NOTA A NUEVA CUENTA
          ======================================================== */}
      {showModalConfirmarNotaNuevaCuenta && (
        <div className="modal-overlay modal-overlay-submodal" onClick={() => setShowModalConfirmarNotaNuevaCuenta(false)}>
          <div className="modal-content modal-nueva-cuenta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="nueva-cuenta-header-title">
                <div className="nueva-cuenta-icon-badge">
                  <Receipt size={22} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Nueva Cuenta</h2>
                  <p className="modal-subtitle">Total venta: <strong>{formatCurrency(calcularTotalCargo())}</strong></p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowModalConfirmarNotaNuevaCuenta(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); ejecutarGuardadoCargo(); }}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="nueva-cuenta-nota-input" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                  ¿Deseas agregar una NOTA a esta cuenta? <span className="label-opcional" style={{ fontWeight: 400, color: '#64748b' }}>(Opcional)</span>
                </label>
                <input
                  id="nueva-cuenta-nota-input"
                  type="text"
                  placeholder="Ej. Cuenta de su mamá"
                  value={cargoNotaCuenta}
                  onChange={(e) => setCargoNotaCuenta(e.target.value)}
                  autoFocus
                  style={{ marginTop: '0.35rem' }}
                />
                <small className="form-help-text" style={{ display: 'block', marginTop: '0.35rem', color: '#64748b', fontSize: '0.78rem' }}>
                  Esta nota describe a esta cuenta en particular (ej: "Cuenta de su mamá", "Cuenta personal"). Si no deseas agregar nota ahora, puedes dejarlo vacío y guardarlo o editarlo después.
                </small>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModalConfirmarNotaNuevaCuenta(false)}
                  disabled={guardandoCargo}
                >
                  Volver a productos
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guardandoCargo}
                >
                  {guardandoCargo ? 'Guardando...' : cargoNotaCuenta.trim() ? 'Guardar con Nota' : 'Guardar Cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL EDITAR / AGREGAR NOTA DE CUENTA EXISTENTE
          ======================================================== */}
      {cuentaEditandoNota && (
        <div className="modal-overlay" onClick={() => setCuentaEditandoNota(null)}>
          <div className="modal-content modal-nueva-cuenta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="nueva-cuenta-header-title">
                <div className="nueva-cuenta-icon-badge">
                  <Pencil size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Nota de Cuenta #{cuentaEditandoNota.numeroCuenta}</h2>
                  <p className="modal-subtitle">Para {clienta?.nombre}</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setCuentaEditandoNota(null)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleGuardarEditarNotaCuenta}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label htmlFor="edit-nota-cuenta-input" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                  NOTA DE LA CUENTA <span className="label-opcional" style={{ fontWeight: 400, color: '#64748b' }}>(Opcional)</span>
                </label>
                <input
                  id="edit-nota-cuenta-input"
                  type="text"
                  placeholder="Ej. Cuenta de su mamá, Cuenta personal..."
                  value={inputEditarNota}
                  onChange={(e) => setInputEditarNota(e.target.value)}
                  autoFocus
                  style={{ marginTop: '0.35rem' }}
                />
                <small className="form-help-text" style={{ display: 'block', marginTop: '0.35rem', color: '#64748b', fontSize: '0.78rem' }}>
                  Deja en blanco si deseas quitar la nota de esta cuenta.
                </small>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCuentaEditandoNota(null)}
                  disabled={guardandoEditarNota}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guardandoEditarNota}
                >
                  {guardandoEditarNota ? 'Guardando...' : 'Guardar Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL COMPARTIR ESTADO DE CUENTA EN FOTO
          ======================================================== */}
      {showModalCompartir && (() => {
        const cuentaTarget =
          todasLasCuentas.find((c) => String(c.id) === String(cuentaCompartirId)) ||
          todasLasCuentas[0] ||
          null;

        const {
          numeroCuenta,
          nota,
          esSaldada,
          creditosList,
          abonosList,
          totalCreditos,
          totalPagos,
          saldoActual
        } = obtenerDatosVoucher(cuentaTarget);

        const logoMostrado = negocioActual?.logo_url || '/logo.png';
        const nombreNegocioMostrado = negocioActual?.nombre || config?.nombreNegocio || 'Control de Cobranzas';

        return (
          <div className="modal-overlay" onClick={() => setShowModalCompartir(false)}>
            <div className="modal-content modal-compartir-foto-wrap" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="nueva-cuenta-header-title">
                  <div className="nueva-cuenta-icon-badge" style={{ background: '#e0f2fe', color: '#0288d1' }}>
                    <ImageIcon size={20} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Estado de Cuenta (Foto)</h2>
                    <p className="modal-subtitle">Para {clienta?.nombre || 'la clienta'}</p>
                  </div>
                </div>
                <button className="btn-close" onClick={() => setShowModalCompartir(false)}>
                  &times;
                </button>
              </div>

              <div className="share-foto-modal-body">
                {/* SELECTOR DE CUENTA SI HAY MÁS DE UNA */}
                {todasLasCuentas.length > 1 && (
                  <div className="share-cuenta-selector-card">
                    <label htmlFor="select-cuenta-share">Elige la cuenta a generar:</label>
                    <select
                      id="select-cuenta-share"
                      className="share-select-input"
                      value={cuentaCompartirId || ''}
                      onChange={(e) => setCuentaCompartirId(e.target.value)}
                    >
                      {cuentas.length > 0 && (
                        <optgroup label="Cuentas Activas">
                          {cuentas.map((c, i) => (
                            <option key={c.id} value={c.id}>
                              Cuenta #{c.numeroCuenta || i + 1}{c.nota ? ` (${c.nota})` : ''} - Saldo: {formatCurrency(c.saldo)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {cuentasCerradas.length > 0 && (
                        <optgroup label="Historial de Cuentas (Saldadas)">
                          {cuentasCerradas.map((c, i) => (
                            <option key={c.id} value={c.id}>
                              Cuenta #{c.numeroCuenta || i + 1}{c.nota ? ` (${c.nota})` : ''} - Saldada ({simboloMoneda || 'S/'} 0.00)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}

                {/* CONTENEDOR DE PREVISUALIZACIÓN Y CAPTURA DEL VOUCHER */}
                <div className="voucher-scroll-wrapper">
                  <div ref={voucherRef} id="voucher-foto-card-print" className="voucher-foto-card">
                    {/* ENCABEZADO CON LOGO Y MARCA */}
                    <div className="voucher-brand-header">
                      <img
                        src={logoMostrado}
                        alt="Logo Negocio"
                        className="voucher-logo-image"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.target.src = '/logo.png';
                        }}
                      />
                      <div className="voucher-negocio-name">{nombreNegocioMostrado}</div>
                      <div className="voucher-system-sub">
                        <span className="voucher-system-brand">ApuntaDeuda</span> · SISTEMA DE GESTIÓN Y CONTROL DE COBRANZAS
                      </div>
                    </div>

                    <div className="voucher-hr" />

                    {/* METADATOS DEL DOCUMENTO */}
                    <div className="voucher-meta-row">
                      <div>
                        <span className="voucher-meta-title">ESTADO DE CUENTA</span>
                        <span className="voucher-meta-cuenta">
                          Cuenta #{numeroCuenta}{nota ? ` · ${nota}` : ''}
                        </span>
                      </div>
                      <div className="voucher-meta-right">
                        <div>
                          <span>Emisión:</span> <strong>{formatDate(getFechaHoyLocal())}</strong>
                        </div>
                        <div>
                          <span>Estado:</span>{' '}
                          <span className={esSaldada ? 'voucher-badge-saldada' : 'voucher-badge-pendiente'}>
                            {esSaldada ? 'SALDADA' : 'PENDIENTE'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* DATOS DEL CLIENTE */}
                    <div className="voucher-client-card">
                      <div className="voucher-client-field">
                        <span className="voucher-client-label">CLIENTE:</span>
                        <span className="voucher-client-val">{clienta?.nombre?.toUpperCase()}</span>
                      </div>
                      {clienta?.telefono && (
                        <div className="voucher-client-field">
                          <span className="voucher-client-label">TELÉFONO:</span>
                          <span className="voucher-client-val">{clienta.telefono}</span>
                        </div>
                      )}
                    </div>

                    {/* TABLA: CRÉDITOS Y COMPRAS */}
                    <div className="voucher-block">
                      <div className="voucher-block-header">CRÉDITOS Y COMPRAS REGISTRADAS</div>
                      <table className="voucher-table">
                        <thead>
                          <tr>
                            <th style={{ width: '22%' }}>Fecha</th>
                            <th>Descripción / Producto</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Cant.</th>
                            <th style={{ width: '22%', textAlign: 'right' }}>Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditosList.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="voucher-table-empty">
                                Sin compras registradas en esta cuenta
                              </td>
                            </tr>
                          ) : (
                            creditosList.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.fecha}</td>
                                <td>{item.descripcion}</td>
                                <td style={{ textAlign: 'center' }}>{item.cantidad || 1}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.monto}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="3" className="voucher-total-label">
                              Total compras (Deuda inicial):
                            </td>
                            <td className="voucher-total-val">{formatCurrency(totalCreditos)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* TABLA: PAGOS Y ABONOS */}
                    <div className="voucher-block">
                      <div className="voucher-block-header">PAGOS Y ABONOS REALIZADOS</div>
                      <table className="voucher-table">
                        <thead>
                          <tr>
                            <th style={{ width: '22%' }}>Fecha</th>
                            <th>Método / Referencia</th>
                            <th style={{ width: '25%', textAlign: 'right' }}>Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abonosList.length === 0 ? (
                            <tr>
                              <td colSpan="3" className="voucher-table-empty">
                                Sin abonos registrados en esta cuenta
                              </td>
                            </tr>
                          ) : (
                            abonosList.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.fecha}</td>
                                <td>{item.metodo}</td>
                                <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                                  {item.monto}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="2" className="voucher-total-label">
                              Total abonado:
                            </td>
                            <td className="voucher-total-val" style={{ color: '#15803d' }}>
                              {formatCurrency(totalPagos)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* RESUMEN FINANCIERO */}
                    <div className="voucher-summary-grid">
                      <div className="voucher-summary-box">
                        <span className="voucher-box-label">DEUDA INICIAL</span>
                        <span className="voucher-box-val">{formatCurrency(totalCreditos)}</span>
                      </div>
                      <div className="voucher-summary-box">
                        <span className="voucher-box-label">TOTAL ABONADO</span>
                        <span className="voucher-box-val" style={{ color: '#15803d' }}>
                          {formatCurrency(totalPagos)}
                        </span>
                      </div>
                      <div className={`voucher-summary-box voucher-box-saldo ${esSaldada ? 'box-saldada' : 'box-deuda'}`}>
                        <span className="voucher-box-label">SALDO PENDIENTE</span>
                        <span className="voucher-box-val-main" style={{ color: esSaldada ? '#15803d' : '#dc2626' }}>
                          {formatCurrency(esSaldada ? 0 : saldoActual)}
                        </span>
                      </div>
                    </div>

                    {/* PIE DE VOUCHER */}
                    <div className="voucher-brand-footer">
                      <div>Comprobante emitido electrónicamente por <strong>ApuntaDeuda</strong></div>
                      <div>{nombreNegocioMostrado} · {formatDate(getFechaHoyLocal())}</div>
                    </div>
                  </div>
                </div>

                {/* ACCIONES DE FOTO */}
                <div className="share-foto-actions">
                  <button
                    type="button"
                    className="btn-action-foto-share"
                    onClick={() => handleCompartirFoto(cuentaTarget)}
                    disabled={generandoFoto}
                    title="Compartir la foto por WhatsApp u otras aplicaciones"
                  >
                    <RiWhatsappLine size={19} />
                    <span>{generandoFoto ? 'Procesando...' : 'Compartir Foto'}</span>
                  </button>

                  <button
                    type="button"
                    className="btn-action-foto-download"
                    onClick={() => handleDescargarFoto(cuentaTarget)}
                    disabled={generandoFoto}
                    title="Descargar foto en formato PNG alta resolución"
                  >
                    <Download size={18} />
                    <span>Descargar PNG</span>
                  </button>

                  <button
                    type="button"
                    className="btn-action-foto-copy"
                    onClick={() => handleCopiarFoto()}
                    disabled={generandoFoto}
                    title="Copiar imagen al portapapeles para pegarla con Ctrl+V"
                  >
                    <Copy size={17} />
                    <span>Copiar Foto (Ctrl+V)</span>
                  </button>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '0.85rem', borderTop: '1px solid var(--color-borderLight, #f1f5f9)', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModalCompartir(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
