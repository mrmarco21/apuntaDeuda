import React, { useState, useEffect } from 'react';
import { useConfig } from '../../../context/ConfigContext';
import { reportesService } from '../../../services/reportesService';
import { gastosService } from '../../../services/gastosService';
import LoadingSpinner from '../../../components/ui/LoadingSpinner/LoadingSpinner';
import '../styles/Reportes.css';

export default function Reportes() {
  const { formatCurrency } = useConfig();
  const [resumenGeneral, setResumenGeneral] = useState(null);
  const [reporteMensual, setReporteMensual] = useState(null);
  const [gastosMes, setGastosMes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    cargarDatos();
  }, [mesSeleccionado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const [year, month] = mesSeleccionado.split('-').map(Number);

      const [resumen, reporte, gastos] = await Promise.all([
        reportesService.getResumenGeneral(),
        reportesService.getReporteMensual(year, month),
        gastosService.getGastosMesActual()
      ]);

      setResumenGeneral(resumen);
      setReporteMensual(reporte);
      setGastosMes(gastos || []);
    } catch (err) {
      console.error('Error cargando reportes:', err);
      setError('Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  // Extraer valores normalizados
  const totalVentas =
    reporteMensual?.ventas?.totalVentas ?? reporteMensual?.totalVentas ?? 0;
  const cantidadVentas =
    reporteMensual?.ventas?.cantidadVentas ?? reporteMensual?.cantidadVentas ?? 0;
  const totalPagos =
    reporteMensual?.pagos?.totalPagos ?? reporteMensual?.totalPagos ?? 0;
  const cantidadPagos =
    reporteMensual?.pagos?.cantidadPagos ?? reporteMensual?.cantidadPagos ?? 0;

  const totalGastosMes = (gastosMes || []).reduce(
    (sum, g) => sum + parseFloat(g.monto || 0),
    0
  );

  const utilidad = totalPagos - totalGastosMes;
  const margen = totalVentas > 0 ? (utilidad / totalVentas) * 100 : 0;

  if (loading) {
    return <LoadingSpinner screen="reportes" fullPage />;
  }

  return (
    <div className="reportes-page">
      {/* Header */}
      <div className="reportes-header">
        <div>
          <h1>Reportes e Informes Financieros</h1>
          <p className="reportes-subtitle">
            Análisis consolidado de cobros, ventas, gastos y rentabilidad
          </p>
        </div>
        <div className="selector-mes">
          <label htmlFor="mes">Periodo:</label>
          <input
            id="mes"
            type="month"
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="config-alert config-alert-error" style={{ marginBottom: 20 }}>
          <span>{error}</span>
        </div>
      )}

      {/* Resumen del Periodo */}
      <div className="seccion-reporte">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Resumen Financiero del Mes
        </h2>

        <div className="reportes-grid">
          <div className="reporte-card reporte-ventas">
            <div className="reporte-header">
              <div className="reporte-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
              </div>
              <h3>Ventas a Crédito</h3>
            </div>
            <p className="reporte-valor">{formatCurrency(totalVentas)}</p>
            <p className="reporte-detalle">{cantidadVentas} ventas registradas</p>
          </div>

          <div className="reporte-card reporte-pagos">
            <div className="reporte-header">
              <div className="reporte-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <h3>Cobros Recibidos</h3>
            </div>
            <p className="reporte-valor">{formatCurrency(totalPagos)}</p>
            <p className="reporte-detalle">{cantidadPagos} cobros efectuados</p>
          </div>

          <div className="reporte-card reporte-gastos">
            <div className="reporte-header">
              <div className="reporte-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3>Gastos Operativos</h3>
            </div>
            <p className="reporte-valor">{formatCurrency(totalGastosMes)}</p>
            <p className="reporte-detalle">{gastosMes.length} gastos en el periodo</p>
          </div>

          <div className="reporte-card reporte-utilidad">
            <div className="reporte-header">
              <div className="reporte-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3>Flujo Neto (Caja)</h3>
            </div>
            <p className={`reporte-valor ${utilidad >= 0 ? 'positivo' : 'negativo'}`}>
              {formatCurrency(utilidad)}
            </p>
            <p className="reporte-detalle">
              {utilidad >= 0 ? 'Saldo positivo' : 'Déficit en el periodo'}
            </p>
          </div>
        </div>
      </div>

      {/* Flujo de Caja */}
      <div className="seccion-reporte">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Flujo de Caja Real (Ingresos vs Egresos)
        </h2>

        <div className="flujo-caja">
          <div className="flujo-item flujo-entrada">
            <div className="flujo-barra" style={{ width: '100%' }}>
              <span className="flujo-label">Cobros en Efectivo / Transferencias</span>
              <span className="flujo-monto">{formatCurrency(totalPagos)}</span>
            </div>
          </div>

          <div className="flujo-item flujo-salida">
            <div
              className="flujo-barra"
              style={{
                width: totalPagos > 0
                  ? `${Math.min((totalGastosMes / totalPagos) * 100, 100)}%`
                  : totalGastosMes > 0 ? '100%' : '0%'
              }}
            >
              <span className="flujo-label">Gastos Registrados</span>
              <span className="flujo-monto">{formatCurrency(totalGastosMes)}</span>
            </div>
          </div>

          <div className={`flujo-resultado ${utilidad >= 0 ? 'positivo' : 'negativo'}`}>
            <span className="flujo-label">
              <strong>Resultado Neto Disponible:</strong>
            </span>
            <span className="flujo-monto-grande">{formatCurrency(utilidad)}</span>
          </div>
        </div>
      </div>

      {/* Desglose de Gastos */}
      {gastosMes.length > 0 && (
        <div className="seccion-reporte">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Desglose de Gastos por Categoría
          </h2>

          <div className="gastos-desglose">
            {(() => {
              const gastosPorCategoria = gastosMes.reduce((acc, gasto) => {
                const cat = gasto.categoria || 'Varios';
                if (!acc[cat]) {
                  acc[cat] = { total: 0, cantidad: 0 };
                }
                acc[cat].total += parseFloat(gasto.monto || 0);
                acc[cat].cantidad += 1;
                return acc;
              }, {});

              return Object.entries(gastosPorCategoria)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([categoria, datos]) => (
                  <div key={categoria} className="gasto-categoria-item">
                    <div className="categoria-info">
                      <span className="categoria-nombre">{categoria}</span>
                      <span className="categoria-cantidad">
                        {datos.cantidad} gasto{datos.cantidad !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="categoria-barra-contenedor">
                      <div
                        className="categoria-barra"
                        style={{
                          width: totalGastosMes > 0
                            ? `${(datos.total / totalGastosMes) * 100}%`
                            : '0%'
                        }}
                      />
                    </div>
                    <span className="categoria-monto">{formatCurrency(datos.total)}</span>
                  </div>
                ));
            })()}
          </div>
        </div>
      )}

      {/* Indicadores Clave */}
      <div className="seccion-reporte">
        <h2>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          Indicadores de Rendimiento del Negocio
        </h2>

        <div className="kpis-grid">
          <div className="kpi-card">
            <p className="kpi-label">Eficiencia de Cobro</p>
            <p className="kpi-valor">
              {totalVentas > 0 ? ((totalPagos / totalVentas) * 100).toFixed(1) : 0}%
            </p>
            <p className="kpi-descripcion">Porcentaje recuperado sobre ventas</p>
          </div>

          <div className="kpi-card">
            <p className="kpi-label">Proporción de Gastos</p>
            <p className="kpi-valor">
              {totalPagos > 0 ? ((totalGastosMes / totalPagos) * 100).toFixed(1) : 0}%
            </p>
            <p className="kpi-descripcion">Gastos respecto al dinero ingresado</p>
          </div>

          <div className="kpi-card">
            <p className="kpi-label">Ticket Promedio de Venta</p>
            <p className="kpi-valor">
              {formatCurrency(cantidadVentas > 0 ? totalVentas / cantidadVentas : 0)}
            </p>
            <p className="kpi-descripcion">Promedio por cada venta realizada</p>
          </div>

          <div className="kpi-card">
            <p className="kpi-label">Margen de Rentabilidad</p>
            <p className={`kpi-valor ${margen >= 0 ? 'positivo' : 'negativo'}`}>
              {margen.toFixed(1)}%
            </p>
            <p className="kpi-descripcion">Rendimiento sobre total de ventas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
