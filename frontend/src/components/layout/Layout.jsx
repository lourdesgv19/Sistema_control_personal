import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import BandaConexion from "../comunes/BandaConexion";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header fijo original intacto */}
      <Header onToggleSidebar={toggleSidebar} />

      <div className="flex">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />

        {/* El pt-16 salva la altura del Header sin taparlo */}
        <div className="flex-1 sm:ml-64 pt-16 flex flex-col min-h-screen">
          {/* La barra aparece aquí: empuja suavemente el contenido hacia abajo sin solapar nada */}
          <BandaConexion />

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
