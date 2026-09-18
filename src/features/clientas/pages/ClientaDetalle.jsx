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
  Image as ImageIcon,
  MoreVertical
} from 'lucide-react';
import { RiWhatsappLine } from 'react-icons/ri';
import html2canvas from 'html2canvas';
import { useConfig } from '../../../context/ConfigContext';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { clientasService } from '../../../services/clientasService';
import { cuentasService } from '../../../services/cuentasService';
import { categoriasService } from '../../../services/categoriasService';
import { usuariosService } from '../../../services/usuariosService';
import {
  parsearPrendas as parsearPrendasHelper,
  obtenerNombreCategoria as obtenerNombreCategoriaHelper,
  limpiarDescripcionTexto,
  resumirMovimientoTexto,
  resumirMovimientoCuentaActiva,
  getFechaHoyLocal,
  obtenerFechaInput,
  formatearFechaCorta
} from '../../../utils/helpers';
import ModalCargo from '../components/ModalCargo/ModalCargo';
import ModalAbono from '../components/ModalAbono/ModalAbono';
import ModalDetalleMovimiento from '../components/ModalDetalleMovimiento/ModalDetalleMovimiento';
import ModalEditarClienta from '../components/ModalEditarClienta/ModalEditarClienta';
import ModalNotaCuenta from '../components/ModalNotaCuenta/ModalNotaCuenta';
import ModalCompartirCuenta from '../components/ModalCompartirCuenta/ModalCompartirCuenta';
import ClientaHeaderInfo from '../components/ClientaHeaderInfo/ClientaHeaderInfo';
import ResumenDeuda from '../components/ResumenDeuda/ResumenDeuda';
import CuentaCard from '../components/CuentaCard/CuentaCard';
import LoadingSpinner from '../../../components/ui/LoadingSpinner/LoadingSpinner';
import './ClientaDetalle.css';

const ESTILO_CUENTA_UNIFICADO = { bg: 'rgba(2, 136, 209, 0.08)', border: '#0288d1', numero: '#0288d1' };

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

  // Lista de usuarios del equipo del negocio para auditoría
  const [equipoUsuarios, setEquipoUsuarios] = useState([]);

  useEffect(() => {
    if (negocioActual?.id) {
      usuariosService
        .obtenerUsuariosPorNegocio(negocioActual.id)
        .then((users) => setEquipoUsuarios(users || []))
        .catch((err) => console.warn('Error cargando usuarios en ClientaDetalle:', err));
    }
  }, [negocioActual?.id]);
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

  // Menú superior de 3 puntos
  const [showMenuOpciones, setShowMenuOpciones] = useState(false);
  const menuOpcionesRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuOpcionesRef.current && !menuOpcionesRef.current.contains(e.target)) {
        setShowMenuOpciones(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    navigate('/clientas');
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
    navigate(`/clientas/${id}/historial-cuentas`);
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
    return <LoadingSpinner screen="clienta-detalle" fullPage />;
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

        <div className="detalle-topbar-actions" ref={menuOpcionesRef}>
          <button
            type="button"
            className={`btn-topbar-menu ${showMenuOpciones ? 'active' : ''}`}
            onClick={() => setShowMenuOpciones(!showMenuOpciones)}
            title="Opciones adicionales"
          >
            <MoreVertical size={20} strokeWidth={2.2} />
          </button>

          {showMenuOpciones && (
            <div className="topbar-dropdown-menu animate-fadeIn">
              <button
                type="button"
                className="dropdown-menu-item"
                onClick={() => {
                  setShowMenuOpciones(false);
                  handleAbrirNuevaCuenta();
                }}
              >
                <PlusCircle size={17} strokeWidth={2.2} className="menu-item-icon icon-primary" />
                <span>Abrir nueva cuenta</span>
              </button>

              <button
                type="button"
                className="dropdown-menu-item"
                onClick={() => {
                  setShowMenuOpciones(false);
                  handleIrAHistorial();
                }}
              >
                <Clock size={17} strokeWidth={2.2} className="menu-item-icon icon-neutral" />
                <span>Historial de cuentas</span>
              </button>

              {(cuentas.length > 0 || cuentasCerradas.length > 0) && (
                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowMenuOpciones(false);
                    abrirModalCompartir();
                  }}
                >
                  <Share2 size={17} strokeWidth={2.2} className="menu-item-icon icon-share" />
                  <span>Compartir</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PERFIL CLIENTA */}
      <ClientaHeaderInfo
        clienta={clienta}
        abrirModalEditarClienta={abrirModalEditarClienta}
        showDetallesClienta={showDetallesClienta}
        setShowDetallesClienta={setShowDetallesClienta}
      />

      {/* RESUMEN GLOBAL (DEUDA TOTAL + TOTAL ABONADO) */}
      <ResumenDeuda
        resumen={resumen}
        formatCurrency={formatCurrency}
      />

      {/* SECCIÓN CUENTAS ACTIVAS */}
      <div className="cuentas-section-header">
        <h2>Cuentas Activas</h2>
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
            const estiloColor = ESTILO_CUENTA_UNIFICADO;

            return (
              <CuentaCard
                key={cuenta.id}
                cuenta={cuenta}
                numeroCuenta={numeroCuenta}
                estiloColor={estiloColor}
                abrirModalEditarNotaCuenta={abrirModalEditarNotaCuenta}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                abrirModalCargo={abrirModalCargo}
                abrirModalAbono={abrirModalAbono}
                cuentasExpandidas={cuentasExpandidas}
                toggleCuentaExpandida={toggleCuentaExpandida}
                movimientosExpandidos={movimientosExpandidos}
                toggleMostrarTodosMovs={toggleMostrarTodosMovs}
                extraerDescripcionLimpia={extraerDescripcionLimpia}
                setModalDetalleMov={setModalDetalleMov}
                esCerrada={false}
              />
            );
          })}

          {/* BOTÓN INFERIOR ABRIR NUEVA CUENTA */}
          <button className="btn-abrir-nueva-cuenta-banner" onClick={handleAbrirNuevaCuenta}>
            <PlusCircle size={20} strokeWidth={2.2} />
            <span>Abrir nueva cuenta</span>
          </button>
        </div>
      )}

      {/* MODALES EXTRAÍDOS */}
      <ModalCargo
        showModalCargo={showModalCargo}
        setShowModalCargo={setShowModalCargo}
        editingCargoId={editingCargoId}
        cargoEsNuevaCuenta={cargoEsNuevaCuenta}
        prendas={prendas}
        categorias={categorias}
        guardandoCargo={guardandoCargo}
        simboloMoneda={simboloMoneda}
        calcularTotalCargo={calcularTotalCargo}
        formatCurrency={formatCurrency}
        handleSubmitCargo={handleSubmitCargo}
        agregarPrenda={agregarPrenda}
        eliminarPrenda={eliminarPrenda}
        actualizarPrenda={actualizarPrenda}
        handleAbrirModalNuevaCat={handleAbrirModalNuevaCat}
      />

      <ModalAbono
        showModalAbono={showModalAbono}
        setShowModalAbono={setShowModalAbono}
        editingAbonoId={editingAbonoId}
        abonoCuentaId={abonoCuentaId}
        cuentas={cuentas}
        cuentasCerradas={cuentasCerradas}
        abonoMonto={abonoMonto}
        abonoMetodoPago={abonoMetodoPago}
        abonoEfectivo={abonoEfectivo}
        abonoYape={abonoYape}
        abonoFecha={abonoFecha}
        abonoDescripcion={abonoDescripcion}
        guardandoAbono={guardandoAbono}
        simboloMoneda={simboloMoneda}
        formatCurrency={formatCurrency}
        handleSubmitAbono={handleSubmitAbono}
        handleMontoAbonoChange={handleMontoAbonoChange}
        handleMixtoEfectivoChange={handleMixtoEfectivoChange}
        handleMixtoYapeChange={handleMixtoYapeChange}
        setAbonoMetodoPago={setAbonoMetodoPago}
        setAbonoFecha={setAbonoFecha}
        setAbonoDescripcion={setAbonoDescripcion}
        setAbonoEfectivo={setAbonoEfectivo}
        setAbonoYape={setAbonoYape}
      />

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
        abrirModalCargo={abrirModalCargo}
        abrirModalAbono={abrirModalAbono}
        equipoUsuarios={equipoUsuarios}
      />

      <ModalEditarClienta
        showModalEditClienta={showModalEditClienta}
        setShowModalEditClienta={setShowModalEditClienta}
        formEditClienta={formEditClienta}
        setFormEditClienta={setFormEditClienta}
        savingEditClienta={savingEditClienta}
        handleSubmitEditClienta={handleSubmitEditClienta}
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

      <ModalCompartirCuenta
        showModalCompartir={showModalCompartir}
        setShowModalCompartir={setShowModalCompartir}
        todasLasCuentas={todasLasCuentas}
        cuentaCompartirId={cuentaCompartirId}
        setCuentaCompartirId={setCuentaCompartirId}
        obtenerDatosVoucher={obtenerDatosVoucher}
        negocioActual={negocioActual}
        config={config}
        clienta={clienta}
        simboloMoneda={simboloMoneda}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getFechaHoyLocal={getFechaHoyLocal}
        voucherRef={voucherRef}
        handleCompartirFoto={handleCompartirFoto}
        handleDescargarFoto={handleDescargarFoto}
        handleCopiarFoto={handleCopiarFoto}
        generandoFoto={generandoFoto}
        cuentas={cuentas}
        cuentasCerradas={cuentasCerradas}
      />
    </div>
  );
}
