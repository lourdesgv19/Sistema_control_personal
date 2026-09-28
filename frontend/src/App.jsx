import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import TiposConfiguracion from "./pages/TiposConfiguracion";
import GestionPersonal from "./pages/GestionPersonal";
import ImportacionFichajes from "./pages/ImportacionFichajes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Redirección por defecto al módulo de Configuración */}
          <Route index element={<Navigate to="/configuracion" replace />} />

          {/* Módulo activo de Categorías, Cargos y Turnos */}
          <Route path="configuracion" element={<TiposConfiguracion />} />
          <Route path="/personal" element={<GestionPersonal />} />
          <Route path="/importacion" element={<ImportacionFichajes />} />

          {/* Módulos de Operación de Asistencia */}
          <Route
            path="dashboard"
            element={
              <div className="p-8 text-slate-500 font-medium">
                Panel General y Métricas Diarias en construcción
              </div>
            }
          />
          <Route
            path="fichadas"
            element={
              <div className="p-8 text-slate-500 font-medium">
                Módulo de Ingesta y Logs del Lector Biométrico en construcción
              </div>
            }
          />
          <Route
            path="clases"
            element={
              <div className="p-8 text-slate-500 font-medium">
                Módulo de Horarios de Clases y Cátedras Docentes en construcción
              </div>
            }
          />

          <Route
            path="alertas"
            element={
              <div className="p-8 text-slate-500 font-medium">
                Módulo de Alertas (Salidas en horario de clase / excesos) en
                construcción
              </div>
            }
          />
          <Route
            path="reportes"
            element={
              <div className="p-8 text-slate-500 font-medium">
                Módulo de Reportes de Cumplimiento y Asistencia en construcción
              </div>
            }
          />

          {/* Ruta comodín */}
          <Route path="*" element={<Navigate to="/configuracion" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
