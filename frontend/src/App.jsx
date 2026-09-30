import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";
import GestionPersonal from "./pages/GestionPersonal";
import ImportacionFichajes from "./pages/ImportacionFichajes";
import GestionUsuarios from "./pages/GestionUsuarios";
import TiposConfiguracion from "./pages/TiposConfiguracion";
import PanelAuditoria from "./pages/PanelAuditoria";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Login fuera del layout del sistema */}
        <Route path="/login" element={<Login />} />

        {/* Todas las pantallas del sistema con Header y Sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/personal"
            element={
              <ProtectedRoute permisoRequerido="PERM_GESTION_PERSONAL">
                <GestionPersonal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fichajes"
            element={
              <ProtectedRoute permisoRequerido="PERM_IMPORTAR_FICHAJES">
                <ImportacionFichajes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute permisoRequerido="PERM_GESTION_CONFIGURACION">
                <TiposConfiguracion />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute permisoRequerido="PERM_GESTION_USUARIOS">
                <GestionUsuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/auditoria"
            element={
              <ProtectedRoute permisoRequerido="AUDITORIA_VER">
                <PanelAuditoria />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/personal" replace />} />
      </Routes>
    </AuthProvider>
  );
}
