import React from 'react';

/**
 * Tab de Copia de Seguridad y Exportación / Importación (JSON & CSV).
 *
 * Props:
 *   handleExportBackup         {function}
 *   exporting                  {boolean}
 *   handleExportClientasCSV    {function}
 *   handleExportMovimientosCSV {function}
 *   fileInputRef               {object}
 *   selectedFile               {object}
 *   handleFileSelected         {function}
 *   handleResetImport          {function}
 *   fileValidation             {object}
 *   importResult               {object}
 *   importError                {string}
 *   importing                  {boolean}
 *   handleConfirmarImportacion {function}
 */
export default function TabBackup({
  handleExportBackup,
  exporting,
  handleExportClientasCSV,
  handleExportMovimientosCSV,
  fileInputRef,
  selectedFile,
  handleFileSelected,
  handleResetImport,
  fileValidation,
  importResult,
  importError,
  importing,
  handleConfirmarImportacion
}) {
  return (
    <div className="config-card">
      <div className="card-header">
        <h2>Copia de Seguridad y Exportación</h2>
        <p className="card-subtitle">
          Descarga tus datos para respaldo local o restaura una copia de seguridad en Supabase.
        </p>
      </div>

      {/* Cuadrícula de Exportación */}
      <div className="backup-options-grid">
        {/* Opción 1: JSON completo */}
        <div className="backup-box highlight">
          <div className="backup-icon json-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="backup-text">
            <h3>Backup Completo (JSON)</h3>
            <p>
              Incluye todas las clientas, cuentas, movimientos (ventas/cobros), detalles de cargo, categorías y datos del negocio desde Supabase.
              Ideal para guardar como copia de seguridad permanente y futura restauración.
            </p>
          </div>
          <button
            type="button"
            className="btn-backup-action btn-json"
            onClick={handleExportBackup}
            disabled={exporting}
          >
            {exporting ? 'Consultando Supabase...' : 'Descargar Backup Completo'}
          </button>
        </div>

        {/* Opción 2: CSV Clientas */}
        <div className="backup-box">
          <div className="backup-icon csv-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </div>
          <div className="backup-text">
            <h3>Exportar Clientas (Excel / CSV)</h3>
            <p>Descarga la lista de clientas con sus teléfonos, direcciones y saldos pendientes.</p>
          </div>
          <button
            type="button"
            className="btn-backup-action"
            onClick={handleExportClientasCSV}
          >
            Exportar CSV Clientas
          </button>
        </div>

        {/* Opción 3: CSV Movimientos */}
        <div className="backup-box">
          <div className="backup-icon csv-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 16V4m0 0L3 8m4-4 4 4"/>
              <path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
            </svg>
          </div>
          <div className="backup-text">
            <h3>Exportar Movimientos (Excel / CSV)</h3>
            <p>Historial completo de todas las ventas y cobros realizados con fechas y montos.</p>
          </div>
          <button
            type="button"
            className="btn-backup-action"
            onClick={handleExportMovimientosCSV}
          >
            Exportar CSV Movimientos
          </button>
        </div>
      </div>

      {/* SECCIÓN: IMPORTAR BACKUP JSON */}
      <div className="import-backup-container">
        <div className="import-header">
          <div className="import-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div>
            <h3>Importar Backup JSON</h3>
            <p>Restaura un archivo de backup de la app Android (v1.0) o de la plataforma web (v1.2) en Supabase.</p>
          </div>
        </div>

        {/* Input de archivo oculto */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".json,application/json"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />

        {!selectedFile && (
          <div className="import-dropzone" onClick={() => fileInputRef.current?.click()}>
            <div className="dropzone-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            <p className="dropzone-title">Haz clic para seleccionar tu archivo de backup .json</p>
            <p className="dropzone-sub">Compatible con Backups de Android (v1.0) y Web (v1.2)</p>
            <button type="button" className="btn-select-file">
              Seleccionar Archivo JSON
            </button>
          </div>
        )}

        {selectedFile && (
          <div className="import-file-details">
            <div className="file-info-header">
              <div className="file-icon-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="file-meta">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
              {!importing && (
                <button type="button" className="btn-cancel-file" onClick={handleResetImport}>
                  Cambiar archivo
                </button>
              )}
            </div>

            {/* Estado de validación */}
            {fileValidation && (
              <div className={`file-validation-badge ${fileValidation.valid ? 'valid' : 'invalid'}`}>
                <div className="validation-icon">
                  {fileValidation.valid ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  )}
                </div>
                <span>{fileValidation.message}</span>
              </div>
            )}

            {/* Advertencia y confirmación antes de llamar al RPC */}
            {fileValidation?.valid && !importResult && (
              <div className="import-confirm-box">
                <div className="confirm-notice">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p>
                    <strong>Confirmación requerida:</strong> Esta operación creará un nuevo negocio con los datos del backup. No reemplazará el negocio actual.
                  </p>
                </div>

                <div className="import-actions">
                  <button
                    type="button"
                    className="btn-import-confirm"
                    onClick={handleConfirmarImportacion}
                    disabled={importing}
                  >
                    {importing ? (
                      <>
                        <div className="btn-spinner" /> Importando backup...
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Confirmar e Importar a Supabase
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Banner de error si Supabase devuelve error */}
            {importError && (
              <div className="import-error-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <div>
                  <strong>Error durante la importación:</strong>
                  <p>{importError}</p>
                </div>
              </div>
            )}

            {/* Resumen del resultado de importación exitosa */}
            {importResult && (
              <div className="import-result-card">
                <div className="result-header">
                  <div className="result-check">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h4>¡Importación exitosa!</h4>
                    <p>El nuevo negocio ha sido creado y activado en la aplicación.</p>
                  </div>
                </div>

                <div className="result-grid">
                  <div className="result-stat-item">
                    <span className="stat-label">Nuevo Negocio ID</span>
                    <span className="stat-value code-font">{importResult.negocio_id || importResult.negocioId || 'Generado'}</span>
                  </div>
                  <div className="result-stat-item">
                    <span className="stat-label">Clientas</span>
                    <span className="stat-value">{importResult.clientas_importadas ?? importResult.clientasImportadas ?? 0}</span>
                  </div>
                  <div className="result-stat-item">
                    <span className="stat-label">Cuentas</span>
                    <span className="stat-value">{importResult.cuentas_importadas ?? importResult.cuentasImportadas ?? 0}</span>
                  </div>
                  <div className="result-stat-item">
                    <span className="stat-label">Movimientos</span>
                    <span className="stat-value">{importResult.movimientos_importados ?? importResult.movimientosImportados ?? 0}</span>
                  </div>
                  <div className="result-stat-item">
                    <span className="stat-label">Detalles de Cargo</span>
                    <span className="stat-value">{importResult.detalles_importados ?? importResult.detallesImportados ?? 0}</span>
                  </div>
                  <div className="result-stat-item">
                    <span className="stat-label">Categorías</span>
                    <span className="stat-value">{importResult.categorias_importadas ?? importResult.categoriasImportadas ?? 0}</span>
                  </div>
                </div>

                <button type="button" className="btn-secondary" onClick={handleResetImport}>
                  Importar otro backup
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
