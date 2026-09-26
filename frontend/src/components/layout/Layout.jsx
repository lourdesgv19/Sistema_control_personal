import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onToggleSidebar={toggleSidebar} />
      <Sidebar isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />

      {/* Contenedor central con margen responsivo */}
      <div className="sm:ml-64 pt-16">
        <main className="min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
