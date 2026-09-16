import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { negociosService } from '../../services/negociosService';
import LoadingSpinner from '../../components/ui/LoadingSpinner/LoadingSpinner';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await negociosService.obtenerNegocios();
        setNegocios(data);
      } catch (err) {
        console.error('Error al cargar métricas de negocios:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const total = negocios.length;
  const activos = negocios.filter((n) => n.activo !== false).length;
  const inactivos = total - activos;
  const ultimosNegocios = negocios.slice(0, 5);

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dash-header">
        <div>
          <span className="admin-dash-badge">Panel General</span>
          <h1 className="admin-dash-title">Dashboard de la Plataforma</h1>
          <p className="admin-dash-desc">
            Supervisa el estado global de los negocios y los accesos administrativos del sistema.
          </p>
        </div>
        <div className="admin-dash-actions">
          <Link to="/admin/negocios" className="admin-btn-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 21h18"/>
              <path d="M5 21V7l8-4v18"/>
              <path d="M19 21V11l-6-4"/>
            </svg>
            <span>Ir a Negocios</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="admin-dash-loading">
          <LoadingSpinner text="Cargando resumen de la plataforma..." />
        </div>
      ) : (
        <>
          {/* Métricas */}
          <div className="admin-dash-kpis">
            <div className="admin-kpi-card">
              <div className="kpi-icon indigo">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l8-4v18"/>
                  <path d="M19 21V11l-6-4"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-title">Negocios Totales</span>
                <span className="kpi-number">{total}</span>
                <span className="kpi-hint">Registrados en base de datos</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-title">Negocios Activos</span>
                <span className="kpi-number">{activos}</span>
                <span className="kpi-hint">Operando actualmente</span>
              </div>
            </div>

            <div className="admin-kpi-card">
              <div className="kpi-icon orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <div className="kpi-content">
                <span className="kpi-title">Inactivos / Suspendidos</span>
                <span className="kpi-number">{inactivos}</span>
                <span className="kpi-hint">Sin acceso o pausados</span>
              </div>
            </div>
          </div>

          {/* Sección de Negocios Recientes */}
          <div className="admin-dash-section">
            <div className="section-header">
              <h2>Negocios Recientes</h2>
              <Link to="/admin/negocios" className="section-link">
                Ver todos &rarr;
              </Link>
            </div>

            {ultimosNegocios.length === 0 ? (
              <div className="admin-dash-empty">
                <p>No hay negocios registrados aún.</p>
                <Link to="/admin/negocios" className="admin-btn-primary" style={{ marginTop: '12px' }}>
                  Crear Primer Negocio
                </Link>
              </div>
            ) : (
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Negocio</th>
                      <th>Estado</th>
                      <th>Fecha de Registro</th>
                      <th>ID Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosNegocios.map((n) => (
                      <tr key={n.id}>
                        <td>
                          <div className="table-negocio-cell">
                            <div className="table-avatar">
                              {(n.nombre || 'N').charAt(0).toUpperCase()}
                            </div>
                            <span className="table-negocio-name">{n.nombre}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-status-pill ${n.activo !== false ? 'pill-activo' : 'pill-inactivo'}`}>
                            {n.activo !== false ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          {n.created_at
                            ? new Date(n.created_at).toLocaleDateString('es-PE', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </td>
                        <td>
                          <code className="table-code">{n.id.substring(0, 8)}...</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
