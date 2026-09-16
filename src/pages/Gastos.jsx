import React, { useState, useEffect } from 'react';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { gastosService } from '../services/gastosService';
import { getFechaHoyLocal, obtenerFechaInput } from '../utils/helpers';
import './Gastos.css';

const CATEGORIAS = [
  'Compras',
  'Transporte',
  'Servicios',
  'Renta',
  'Salarios',
  'Marketing',
  'Mantenimiento',
  'Otros'
];

export default function Gastos() {
  const toast = useToast();
  const [gastos, setGastos] = useState([]);
  const [gastosPorCategoria, setGastosPorCategoria] = useState([]);
  const [totalMes, setTotalMes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [gastoEditando, setGastoEditando] = useState(null);
  const [formData, setFormData] = useState({
    concepto: '',
    monto: '',
    categoria: 'Otros',
    descripcion: '',
    fecha: getFechaHoyLocal()
  });

  useEffect(() => {
    cargarGastos();
    cargarTotalMes();
  }, []);

  useEffect(() => {
    if (filtroFechaInicio || filtroFechaFin) {
      aplicarFiltros();
    }
  }, [filtroFechaInicio, filtroFechaFin]);

  const cargarGastos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [gastosData, categorias] = await Promise.all([
        gastosService.getGastos(),
        gastosService.getGastosPorCategoria()
      ]);

      setGastos(gastosData);
      setGastosPorCategoria(categorias);
    } catch (err) {
      console.error('Error cargando gastos:', err);
      setError(err.message || 'Error al cargar los gastos');
    } finally {
      setLoading(false);
    }
  };

  const cargarTotalMes = async () => {
    try {
      const gastosMes = await gastosService.getGastosMesActual();
      const total = gastosMes.reduce((sum, g) => sum + parseFloat(g.monto), 0);
      setTotalMes(total);
    } catch (err) {
      console.error('Error cargando total del mes:', err);
    }
  };

  const aplicarFiltros = async () => {
    try {
      setLoading(true);
      const fechaInicio = filtroFechaInicio ? new Date(filtroFechaInicio).toISOString() : null;
      const fechaFin = filtroFechaFin ? new Date(filtroFechaFin + 'T23:59:59').toISOString() : null;
      
      const [gastosData, categorias] = await Promise.all([
        gastosService.getGastos(fechaInicio, fechaFin),
        gastosService.getGastosPorCategoria(fechaInicio, fechaFin)
      ]);

      setGastos(gastosData);
      setGastosPorCategoria(categorias);
    } catch (err) {
      console.error('Error aplicando filtros:', err);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
    cargarGastos();
  };

  const abrirModal = (gasto = null) => {
    if (gasto) {
      setGastoEditando(gasto);
      setFormData({
        concepto: gasto.concepto,
        monto: gasto.monto.toString(),
        categoria: gasto.categoria || 'Otros',
        descripcion: gasto.descripcion || '',
        fecha: obtenerFechaInput(gasto.fecha)
      });
    } else {
      setGastoEditando(null);
      setFormData({
        concepto: '',
        monto: '',
        categoria: 'Otros',
        descripcion: '',
        fecha: getFechaHoyLocal()
      });
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setGastoEditando(null);
    setFormData({
      concepto: '',
      monto: '',
      categoria: 'Otros',
      descripcion: '',
      fecha: getFechaHoyLocal()
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.concepto.trim()) {
      toast.warning('El concepto es obligatorio');
      return;
    }

    const monto = parseFloat(formData.monto);
    if (isNaN(monto) || monto <= 0) {
      toast.warning('El monto debe ser un número mayor a 0');
      return;
    }

    try {
      const gastoData = {
        concepto: formData.concepto,
        monto,
        categoria: formData.categoria,
        descripcion: formData.descripcion,
        fecha: formData.fecha
      };

      if (gastoEditando) {
        await gastosService.updateGasto(gastoEditando.id, gastoData);
        toast.success('Gasto actualizado correctamente');
      } else {
        await gastosService.createGasto(gastoData);
        toast.success('Gasto registrado con éxito');
      }
      
      cerrarModal();
      cargarGastos();
      cargarTotalMes();
    } catch (err) {
      console.error('Error al guardar gasto:', err);
      toast.error('Error al guardar el gasto: ' + (err.message || 'Error inesperado'));
    }
  };

  const handleEliminar = async (id, concepto) => {
    if (!confirm(`¿Estás seguro de eliminar el gasto "${concepto}"?`)) {
      return;
    }

    try {
      await gastosService.deleteGasto(id);
      toast.success('Gasto eliminado');
      cargarGastos();
      cargarTotalMes();
    } catch (err) {
      console.error('Error al eliminar gasto:', err);
      toast.error('Error al eliminar el gasto');
    }
  };

  const { formatCurrency, simboloMoneda } = useConfig();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString || '';
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima'
    }).format(date);
  };

  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);

  if (loading && gastos.length === 0) {
    return (
      <div className="gastos-loading">
        <div className="spinner"></div>
        <p>Cargando gastos...</p>
      </div>
    );
  }

  return (
    <div className="gastos-page">
      {/* Header */}
      <div className="gastos-header">
        <div>
          <h1>Gastos</h1>
          <p className="gastos-subtitle">Controla los gastos de tu negocio</p>
        </div>
        <button className="btn-primary" onClick={() => abrirModal()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nuevo Gasto
        </button>
      </div>

      {/* Estadísticas */}
      <div className="gastos-stats">
        <div className="stat-card stat-mes">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p className="stat-label">Gastos del Mes</p>
            <p className="stat-value">{formatCurrency(totalMes)}</p>
          </div>
        </div>

        <div className="stat-card stat-total">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div>
            <p className="stat-label">Total Mostrado</p>
            <p className="stat-value">{formatCurrency(totalGastos)}</p>
          </div>
        </div>

        <div className="stat-card stat-cantidad">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <p className="stat-label">Cantidad de Gastos</p>
            <p className="stat-value">{gastos.length}</p>
          </div>
        </div>
      </div>

      {/* Gastos por Categoría */}
      {gastosPorCategoria.length > 0 && (
        <div className="categorias-section">
          <h2>Gastos por Categoría</h2>
          <div className="categorias-grid">
            {gastosPorCategoria.map((cat) => (
              <div key={cat.categoria} className="categoria-card">
                <div className="categoria-header">
                  <span className="categoria-nombre">{cat.categoria}</span>
                  <span className="categoria-cantidad">{cat.cantidad} gasto{cat.cantidad !== 1 ? 's' : ''}</span>
                </div>
                <p className="categoria-total">{formatCurrency(cat.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="gastos-filtros">
        <h2>Filtrar por Fecha</h2>
        <div className="filtros-row">
          <div className="filtro-grupo">
            <label htmlFor="fechaInicio">Desde</label>
            <input
              id="fechaInicio"
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
            />
          </div>
          <div className="filtro-grupo">
            <label htmlFor="fechaFin">Hasta</label>
            <input
              id="fechaFin"
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
            />
          </div>
          <button className="btn-secondary" onClick={limpiarFiltros}>
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Lista de Gastos */}
      {error && <div className="error-message">{error}</div>}

      {gastos.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <p>No hay gastos registrados</p>
          <button className="btn-primary" onClick={() => abrirModal()}>
            Registrar Primer Gasto
          </button>
        </div>
      ) : (
        <div className="gastos-lista">
          <h2>Todos los Gastos</h2>
          {gastos.map((gasto) => (
            <div key={gasto.id} className="gasto-item">
              <div className="gasto-left">
                <div className="gasto-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div className="gasto-info">
                  <h3>{gasto.concepto}</h3>
                  {gasto.descripcion && (
                    <p className="gasto-descripcion">{gasto.descripcion}</p>
                  )}
                  <div className="gasto-meta">
                    <span className="gasto-categoria">{gasto.categoria}</span>
                    <span className="gasto-separador">•</span>
                    <span className="gasto-fecha">{formatDate(gasto.fecha)}</span>
                  </div>
                </div>
              </div>
              <div className="gasto-right">
                <p className="gasto-monto">{formatCurrency(gasto.monto)}</p>
                <div className="gasto-acciones">
                  <button 
                    className="btn-icon"
                    onClick={() => abrirModal(gasto)}
                    title="Editar"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button 
                    className="btn-icon btn-danger"
                    onClick={() => handleEliminar(gasto.id, gasto.concepto)}
                    title="Eliminar"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Agregar/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{gastoEditando ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
              <button className="btn-close" onClick={cerrarModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="concepto">Concepto *</label>
                <input
                  id="concepto"
                  type="text"
                  value={formData.concepto}
                  onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                  placeholder="Ej: Compra de mercancía"
                  required
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="monto">Monto *</label>
                  <div className="input-currency">
                    <span className="currency-symbol">{simboloMoneda}</span>
                    <input
                      id="monto"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.monto}
                      onChange={(e) => setFormData({...formData, monto: e.target.value})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="fecha">Fecha</label>
                  <input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="categoria">Categoría</label>
                <select
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripción (opcional)</label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Detalles adicionales del gasto..."
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {gastoEditando ? 'Guardar Cambios' : 'Registrar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
