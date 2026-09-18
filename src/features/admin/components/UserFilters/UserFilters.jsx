import React from 'react';

/**
 * Barra de filtrado y búsqueda de usuarios.
 *
 * Props:
 *   filtroTexto      {string}
 *   setFiltroTexto   {function}
 *   filtroNegocio    {string}
 *   setFiltroNegocio {function}
 *   filtroRol        {string}
 *   setFiltroRol      {function}
 *   filtroEstado     {string}
 *   setFiltroEstado  {function}
 *   negocios         {array}
 */
export default function UserFilters({
  filtroTexto,
  setFiltroTexto,
  filtroNegocio,
  setFiltroNegocio,
  filtroRol,
  setFiltroRol,
  filtroEstado,
  setFiltroEstado,
  negocios
}) {
  return (
    <div className="admin-filters-bar usuarios-filters-bar">
      {/* Buscador */}
      <div className="admin-search-wrap">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="admin-search-input"
        />
        {filtroTexto && (
          <button
            className="admin-search-clear"
            onClick={() => setFiltroTexto('')}
            aria-label="Limpiar búsqueda"
          >
            &times;
          </button>
        )}
      </div>

      <div className="usuarios-select-filters">
        {/* Filtro por Negocio */}
        <div className="select-filter-wrap">
          <label htmlFor="filtro-negocio">Negocio:</label>
          <select
            id="filtro-negocio"
            value={filtroNegocio}
            onChange={(e) => setFiltroNegocio(e.target.value)}
            className="admin-select"
          >
            <option value="todos">Todos los negocios</option>
            {negocios.map((neg) => (
              <option key={neg.id} value={neg.id}>
                {neg.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Rol */}
        <div className="select-filter-wrap">
          <label htmlFor="filtro-rol">Rol:</label>
          <select
            id="filtro-rol"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="admin-select"
          >
            <option value="todos">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="encargado">Encargado de Tienda</option>
            <option value="cajero">Cajero</option>
            <option value="asistente">Asistente de Ventas</option>
            <option value="temporal">Encargado Temporal</option>
            <option value="usuario">Usuario</option>
          </select>
        </div>

        {/* Filtro por Estado */}
        <div className="select-filter-wrap">
          <label htmlFor="filtro-estado">Estado:</label>
          <select
            id="filtro-estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="admin-select"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>
        </div>
      </div>
    </div>
  );
}
