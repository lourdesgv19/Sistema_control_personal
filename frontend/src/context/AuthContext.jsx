import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Función interna para parsear el token y cargar el usuario
  const cargarUsuarioDesdeToken = (tokenJwt) => {
    try {
      const decoded = jwtDecode(tokenJwt);
      if (decoded.exp * 1000 < Date.now()) {
        logout();
        return null;
      }
      const dataUsuario = {
        idUsuario: decoded.idUsuario,
        username: decoded.sub || decoded.username,
        rol: decoded.rol,
        nombre: decoded.nombre || decoded.sub,
        permisos: Array.isArray(decoded.permisos) ? decoded.permisos : [],
        debeCambiarPassword: Boolean(decoded.debeCambiarPassword),
      };
      setUser(dataUsuario);
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${tokenJwt}`;
      return dataUsuario;
    } catch (err) {
      console.error("Token inválido:", err);
      logout();
      return null;
    }
  };

  useEffect(() => {
    if (token) {
      cargarUsuarioDesdeToken(token);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = (tokenRecibido) => {
    localStorage.setItem("token", tokenRecibido);
    setToken(tokenRecibido);
    const usuarioCargado = cargarUsuarioDesdeToken(tokenRecibido);

    // Redirige automáticamente al ingresar
    if (usuarioCargado) {
      navigate("/personal", { replace: true });
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete apiClient.defaults.headers.common["Authorization"];
    navigate("/login", { replace: true });
  };

  const marcarPasswordCambiada = () => {
    setUser((prev) => (prev ? { ...prev, debeCambiarPassword: false } : null));
  };

  const tienePermiso = (codigoPermiso) => {
    if (!user || !user.permisos) return false;
    return (
      user.permisos.includes("PERM_ADMIN_TOTAL") ||
      user.permisos.includes(codigoPermiso)
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        tienePermiso,
        marcarPasswordCambiada,
        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
