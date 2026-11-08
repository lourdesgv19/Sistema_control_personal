import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({
  children,
  permisoRequerido,
  permisosRequeridos,
}) {
  const { user, tienePermiso, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 text-xs">
        Cargando credenciales...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si requiere un permiso específico único
  if (permisoRequerido && !tienePermiso(permisoRequerido)) {
    return <Navigate to="/incidentes" replace />;
  }

  // Si requiere cualquiera de los permisos de la lista (OR)
  if (
    Array.isArray(permisosRequeridos) &&
    permisosRequeridos.length > 0 &&
    !permisosRequeridos.some((p) => tienePermiso(p))
  ) {
    return <Navigate to="/incidentes" replace />;
  }

  return children;
}
