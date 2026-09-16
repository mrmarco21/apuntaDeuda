import React from 'react';
import { Calendar, Filter, Search, RotateCcw } from 'lucide-react';
import './ModalFiltrosMovimientos.css';

/**
 * Modal de filtros de movimientos.
 *
 * Props:
 *   showModalFiltros         {boolean}
 *   setShowModalFiltros      {function}
 *   filtroTipo               {string}   'todos' | 'cargos' | 'abonos'
 *   filtroFechaInicio        {string}   'YYYY-MM-DD' | ''
 *   filtroFechaFin           {string}   'YYYY-MM-DD' | ''
 *   busquedaClienta          {string}
 *   hayFiltrosActivos        {boolean}
 *   movimientosFiltradosCount {number}   para mostrar en "Ver resultados (N)"
 *   handleFiltroTipoChange   {function(tipo: string)}
 *   handleFechaInicioChange  {function(val: string)}
 *   handleFechaFinChange     {function(val: string)}
 *   handleBusquedaClientaChange {function(val: string)}
 *   limpiarFiltros           {function}
 *   setFiltroFechaInicio     {function}
 *   setFiltroFechaFin        {function}
 *   setLimiteVisible         {function}
 *   getFechaHoyLocal         {function(): string}
 *   getFechaLunesSemana      {function(): string}
 *   getFechaPrimerDiaMes     {function(): string}
 */
export default function ModalFiltrosMovimientos({
  showModalFiltros,
  setShowModalFiltros,
  filtroTipo,
  filtroFechaInicio,
  filtroFechaFin,
  busquedaClienta,
  hayFiltrosActivos,
  movimientosFiltradosCount,
  handleFiltroTipoChange,
  handleFechaInicioChange,
  handleFechaFinChange,
  handleBusquedaClientaChange,
  limpiarFiltros,
  setFiltroFechaInicio,
  setFiltroFechaFin,
  setLimiteVisible,
  getFechaHoyLocal,
  getFechaLunesSemana,
  getFechaPrimerDiaMes,
}) {
  if (!showModalFiltros) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowModalFiltros(false)}>
      <div
        className="modal-content modal-filtros-movimientos"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header del Modal */}
        <div className="modal-filtros-header">
          <div className="modal-filtros-header-left">
            <div className="modal-filtros-icon-wrap">
              <Filter size={19} strokeWidth={2.4} />
            </div>
            <div>
              <h3 className="modal-filtros-title">Filtros de Movimientos</h3>
              <p className="modal-filtros-subtitle">Filtra por fechas, tipo de movimiento o clienta</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close-clean"
            onClick={() => setShowModalFiltros(false)}
            aria-label="Cerrar filtros"
          >
            &times;
          </button>
        </div>

        <div className="modal-filtros-body">
          {/* Búsqueda por clienta */}
          <div className="filtro-modal-campo">
            <label className="filtro-modal-label">Buscar por Clienta</label>
            <div className="filtro-modal-search-wrap">
              <Search size={18} strokeWidth={2} />
              <input
                type="text"
                placeholder="Escribe el nombre de la clienta..."
                value={busquedaClienta}
                onChange={(e) => handleBusquedaClientaChange(e.target.value)}
              />
              {busquedaClienta && (
                <button
                  type="button"
                  className="btn-clear-input"
                  onClick={() => handleBusquedaClientaChange('')}
                  title="Borrar búsqueda"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Tipo de movimiento */}
          <div className="filtro-modal-campo">
            <label className="filtro-modal-label">Tipo de Movimiento</label>
            <div className="filtro-modal-tabs">
              <button
                type="button"
                className={`filtro-tab-btn ${filtroTipo === 'todos' ? 'active' : ''}`}
                onClick={() => handleFiltroTipoChange('todos')}
              >
                Todos
              </button>
              <button
                type="button"
                className={`filtro-tab-btn ${filtroTipo === 'cargos' ? 'active' : ''}`}
                onClick={() => handleFiltroTipoChange('cargos')}
              >
                Ventas
              </button>
              <button
                type="button"
                className={`filtro-tab-btn ${filtroTipo === 'abonos' ? 'active' : ''}`}
                onClick={() => handleFiltroTipoChange('abonos')}
              >
                Pagos
              </button>
            </div>
          </div>

          {/* Rango de Fechas */}
          <div className="filtro-modal-campo">
            <label className="filtro-modal-label">Rango de Fechas</label>

            {/* Accesos rápidos */}
            <div className="filtro-fechas-rapidas">
              <button
                type="button"
                className={`btn-fecha-rapida ${filtroFechaInicio === getFechaHoyLocal() && filtroFechaFin === getFechaHoyLocal() ? 'active' : ''}`}
                onClick={() => {
                  setFiltroFechaInicio(getFechaHoyLocal());
                  setFiltroFechaFin(getFechaHoyLocal());
                  setLimiteVisible(30);
                }}
              >
                Hoy
              </button>
              <button
                type="button"
                className={`btn-fecha-rapida ${filtroFechaInicio === getFechaLunesSemana() && filtroFechaFin === getFechaHoyLocal() ? 'active' : ''}`}
                onClick={() => {
                  setFiltroFechaInicio(getFechaLunesSemana());
                  setFiltroFechaFin(getFechaHoyLocal());
                  setLimiteVisible(30);
                }}
              >
                Esta semana
              </button>
              <button
                type="button"
                className={`btn-fecha-rapida ${filtroFechaInicio === getFechaPrimerDiaMes() && filtroFechaFin === getFechaHoyLocal() ? 'active' : ''}`}
                onClick={() => {
                  setFiltroFechaInicio(getFechaPrimerDiaMes());
                  setFiltroFechaFin(getFechaHoyLocal());
                  setLimiteVisible(30);
                }}
              >
                Este mes
              </button>
              <button
                type="button"
                className={`btn-fecha-rapida ${!filtroFechaInicio && !filtroFechaFin ? 'active' : ''}`}
                onClick={() => {
                  setFiltroFechaInicio('');
                  setFiltroFechaFin('');
                  setLimiteVisible(30);
                }}
              >
                Histórico
              </button>
            </div>

            <div className="filtro-modal-fechas-grid">
              <div className="filtro-fecha-input-group">
                <span className="filtro-sublabel">Desde</span>
                <div className="filtro-date-wrap">
                  <Calendar size={16} strokeWidth={2} />
                  <input
                    type="date"
                    max={getFechaHoyLocal()}
                    value={filtroFechaInicio}
                    onChange={(e) => handleFechaInicioChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="filtro-fecha-input-group">
                <span className="filtro-sublabel">Hasta</span>
                <div className="filtro-date-wrap">
                  <Calendar size={16} strokeWidth={2} />
                  <input
                    type="date"
                    value={filtroFechaFin}
                    onChange={(e) => handleFechaFinChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-filtros-footer">
          <button
            type="button"
            className="btn-modal-limpiar"
            onClick={limpiarFiltros}
            disabled={!hayFiltrosActivos}
          >
            <RotateCcw size={15} strokeWidth={2.2} />
            <span>Restablecer</span>
          </button>

          <button
            type="button"
            className="btn-modal-aplicar"
            onClick={() => setShowModalFiltros(false)}
          >
            <span>Ver resultados ({movimientosFiltradosCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
