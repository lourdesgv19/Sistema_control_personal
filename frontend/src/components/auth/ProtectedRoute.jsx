import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, permisoRequerido }) {
  const { user, tienePermiso } = useAuth();
  const token = localStorage.getItem("token");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (permisoRequerido && !tienePermiso(permisoRequerido)) {
    return <Navigate to="/personal" replace />;
  }

  return children;
}
