import React from 'react';
import {
  RiAddLine,
  RiRefreshLine,
  RiEditLine,
  RiToggleLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiMoreLine
} from 'react-icons/ri';
import './TabCategorias.css';

/**
 * Tab de Gestión de Categorías del Negocio.
 *
 * Props:
 *   nombreNegocio           {string}
 *   setShowModalCrearCat    {function}
 *   setFormCrearCat         {function}
 *   categoriasList          {array}
 *   filtroEstadoCat         {string}
 *   setFiltroEstadoCat      {function}
 *   cargarCategoriasNegocio {function}
 *   loadingCategorias       {boolean}
 *   handleAbrirEditarCat    {function}
 *   handleToggleEstadoCat   {function}
 *   handleAbrirEliminarCat  {function}
 *   openMenuCatId           {string|number|null}
 *   setOpenMenuCatId        {function}
 *   catMenuRef              {object}
 */
export default function TabCategorias({
  nombreNegocio,
  setShowModalCrearCat,
  setFormCrearCat,
  categoriasList,
  filtroEstadoCat,
  setFiltroEstadoCat,
  cargarCategoriasNegocio,
  loadingCategorias,
  handleAbrirEditarCat,
  handleToggleEstadoCat,
  handleAbrirEliminarCat,
  openMenuCatId,
  setOpenMenuCatId,
  catMenuRef
}) {
  return (
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
  );
}
