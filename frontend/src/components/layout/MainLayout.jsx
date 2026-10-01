import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BandaConexion from "../comunes/BandaConexion";
import ModalPrimerCambioPassword from "../usuarios/ModalPrimerCambioPassword";
import { useAuth } from "../../context/AuthContext";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] overflow-hidden font-sans">
      <BandaConexion />
      <Header onMenuClick={() => setMenuAbierto((prev) => !prev)} />

      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        <Sidebar isOpen={menuAbierto} onClose={() => setMenuAbierto(false)} />

        <main className="flex-1 overflow-y-auto min-w-0 bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>

      {/* Modal obligatorio si la bandera debeCambiarPassword está activa */}
      {user?.debeCambiarPassword && (
        <ModalPrimerCambioPassword
          isOpen={true}
          usuario={user}
          onExito={() => {
            logout();
          }}
        />
      )}
    </div>
  );
}
