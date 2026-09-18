import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfigProvider } from './context/ConfigContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import PermissionRoute from './components/layout/PermissionRoute';
import Layout from './components/layout/Layout/Layout';
import Login from './features/auth/pages/Login';
import Dashboard from './features/dashboard/pages/Dashboard';
import Clientas from './features/clientas/pages/Clientas';
import ClientaDetalle from './features/clientas/pages/ClientaDetalle';
import HistorialCuentasPage from './features/clientas/pages/HistorialCuentasPage';
import Movimientos from './features/movimientos/pages/Movimientos';
import Gastos from './features/gastos/pages/Gastos';
import Reportes from './features/reportes/pages/Reportes';
import Configuracion from './features/configuracion/pages/Configuracion';

// Módulos del Superadministrador (/admin)
import AdminRoute from './components/layout/AdminRoute';
import AdminLayout from './features/admin/components/AdminLayout/AdminLayout';
import AdminDashboard from './features/admin/pages/AdminDashboard';
import AdminNegocios from './features/admin/pages/AdminNegocios';
import AdminUsuarios from './features/admin/pages/AdminUsuarios';

import { usePresenceTracker } from './hooks/usePresenceTracker';

function PresenceTrackerWrapper() {
  usePresenceTracker();
  return null;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfigProvider>
          <ToastProvider>
            <BrowserRouter>
              <PresenceTrackerWrapper />
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* Área normal del Negocio */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="clientas" element={<Clientas />} />
                  <Route path="clientas/:id" element={<ClientaDetalle />} />
                  <Route path="clientas/:id/historial-cuentas" element={<HistorialCuentasPage />} />
                  <Route path="movimientos" element={<Movimientos />} />
                  <Route path="gastos" element={<PermissionRoute module="gastos"><Gastos /></PermissionRoute>} />
                  <Route path="reportes" element={<PermissionRoute module="reportes"><Reportes /></PermissionRoute>} />
                  <Route path="configuracion" element={<PermissionRoute module="configuracion"><Configuracion /></PermissionRoute>} />
                </Route>

                {/* Área de Administración de la Plataforma (/admin) */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="negocios" element={<AdminNegocios />} />
                  <Route path="usuarios" element={<AdminUsuarios />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </ConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
