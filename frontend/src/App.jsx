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
import GestionHorarios from "./pages/GestionHorarios";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Layout principal con Header y Sidebar */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* 1. Personal: Requiere PERSONAL_VER */}
          <Route
            path="/personal"
            element={
              <ProtectedRoute permisoRequerido="PERSONAL_VER">
                <GestionPersonal />
              </ProtectedRoute>
            }
          />

          {/* 2. Horarios: Requiere HORARIOS_VER */}
          <Route
            path="/horarios-catedras"
            element={
              <ProtectedRoute permisoRequerido="HORARIOS_VER">
                <GestionHorarios />
              </ProtectedRoute>
            }
          />

          {/* 2. Fichajes: Requiere FICHAJES_VER */}
          <Route
            path="/fichajes"
            element={
              <ProtectedRoute permisoRequerido="FICHAJES_VER">
                <ImportacionFichajes />
              </ProtectedRoute>
            }
          />

          {/* 3. Configuración: Requiere CONFIG_VER */}
          <Route
            path="/configuracion"
            element={
              <ProtectedRoute permisoRequerido="CONFIG_VER">
                <TiposConfiguracion />
              </ProtectedRoute>
            }
          />

          {/* 4. Usuarios: Requiere USUARIOS_VER */}
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute permisoRequerido="USUARIOS_VER">
                <GestionUsuarios />
              </ProtectedRoute>
            }
          />

          {/* 5. Auditoría: Requiere AUDITORIA_VER */}
          <Route
            path="/auditoria"
            element={
              <ProtectedRoute permisoRequerido="AUDITORIA_VER">
                <PanelAuditoria />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/personal" replace />} />
      </Routes>
    </AuthProvider>
  );
}
