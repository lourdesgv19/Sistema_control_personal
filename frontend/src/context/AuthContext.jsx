import React, { createContext, useState, useEffect, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import apiClient from "../services/api";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setUser({
            idUsuario: decoded.idUsuario,
            username: decoded.sub,
            nombre: decoded.nombre || decoded.sub,
            rol: decoded.rol,
            permisos: decoded.permisos || [],
          });
          apiClient.defaults.headers.common["Authorization"] =
            `Bearer ${token}`;
        }
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    localStorage.setItem("token", token);
    const decoded = jwtDecode(token);

    const userData = {
      idUsuario: decoded.idUsuario,
      username: decoded.sub,
      nombre: decoded.nombre || decoded.sub,
      rol: decoded.rol,
      permisos: decoded.permisos || [],
    };

    setUser(userData);
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    navigate("/personal");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    delete apiClient.defaults.headers.common["Authorization"];
    navigate("/login");
  };

  const tienePermiso = (permisoRequerido) => {
    if (!user || !user.permisos) return false;
    return (
      user.permisos.includes("PERM_ADMIN_TOTAL") ||
      user.permisos.includes(permisoRequerido)
    );
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, tienePermiso, loading }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
