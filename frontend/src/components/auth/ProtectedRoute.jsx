import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, permisoRequerido }) {
  const { user, loading, tienePermiso } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 text-xs">
        Cargando credenciales...
      </div>
    );
  }

  // Si no está autenticado, va a Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si la ruta exige un permiso y el usuario no lo tiene
  if (permisoRequerido && !tienePermiso(permisoRequerido)) {
    // Si no tiene acceso a esta vista específica, lo redirige a una permitida (por ejemplo /personal)
    return <Navigate to="/personal" replace />;
  }

  return children;
}
