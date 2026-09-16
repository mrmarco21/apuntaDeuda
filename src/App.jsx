import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConfigProvider } from './context/ConfigContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Layout from './components/layout/Layout/Layout';
import Login from './features/auth/pages/Login';
import Dashboard from './features/dashboard/pages/Dashboard';
import Clientas from './pages/Clientas';
import ClientaDetalle from './pages/ClientaDetalle';
import Movimientos from './pages/Movimientos';
import Gastos from './features/gastos/pages/Gastos';
import Reportes from './features/reportes/pages/Reportes';
import Configuracion from './pages/Configuracion';

// Módulos del Superadministrador (/admin)
import AdminRoute from './components/layout/AdminRoute';
import AdminLayout from './admin/components/AdminLayout';
import AdminDashboard from './admin/pages/AdminDashboard';
import AdminNegocios from './admin/pages/AdminNegocios';
import AdminUsuarios from './admin/pages/AdminUsuarios';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfigProvider>
          <ToastProvider>
            <BrowserRouter>
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
                  <Route path="movimientos" element={<Movimientos />} />
                  <Route path="gastos" element={<Gastos />} />
                  <Route path="reportes" element={<Reportes />} />
                  <Route path="configuracion" element={<Configuracion />} />
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
