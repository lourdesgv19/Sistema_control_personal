import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BandaConexion from "../comunes/BandaConexion";

export default function MainLayout() {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* 1. Banda roja de conexión (desaparece sola cuando el servidor está OK) */}
      <BandaConexion />

      {/* 2. Header institucional principal */}
      <Header />

      {/* 3. Contenedor: Sidebar blanco a la izquierda + Pantalla activa a la derecha */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar />

        <main className="flex-1 overflow-y-auto min-w-0 bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
