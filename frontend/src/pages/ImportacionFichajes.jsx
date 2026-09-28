import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  getHistorialImportaciones,
  uploadArchivoFichajes,
  previsualizarVinculaciones,
  guardarVinculaciones,
} from "../services/importacionService";
import { getEmpleados } from "../services/empleadoService";

export default function ImportacionFichajes() {
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Modos y archivo
  const [archivo, setArchivo] = useState(null);
  const [vistaActual, setVistaActual] = useState("historial"); // 'historial' | 'asistente'
  const [resultadoSubida, setResultadoSubida] = useState(null);
  const [errorGlobal, setErrorGlobal] = useState("");

  // Estado del Asistente de Vinculación Inicial
  const [vinculaciones, setVinculaciones] = useState([]);
  const [cargandoAsistente, setCargandoAsistente] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    setErrorGlobal("");
    try {
      const [histRes, empRes] = await Promise.all([
        getHistorialImportaciones(),
        getEmpleados(),
      ]);
      setHistorial(Array.isArray(histRes) ? histRes : []);
      setEmpleados(Array.isArray(empRes) ? empRes : []);
    } catch (err) {
      console.error("Error cargando datos de importación:", err);
      setHistorial([]);
      setEmpleados([]);
      setErrorGlobal("No se pudo conectar con el servidor para obtener los datos de importación.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleSeleccionarArchivo = (e) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
      setResultadoSubida(null);
      setErrorGlobal("");
    }
  };

  // Subir archivo a empleado_fichajes
  const handleImportar = async () => {
    if (!archivo) return;
    setLoading(true);
    setErrorGlobal("");
    try {
      const res = await uploadArchivoFichajes(archivo);
      setResultadoSubida(res);
      setArchivo(null);
      await cargarDatos();
    } catch (err) {
      setErrorGlobal(err.response?.data?.mensajesErrores?.[0] || "Error al procesar el archivo en el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar el analizador de usuarios para el asistente de vinculación
  const handleAbrirAsistente = async () => {
    if (!archivo) {
      alert("Por favor selecciona primero un archivo CSV o Excel del reloj.");
      return;
    }
    setCargandoAsistente(true);
    try {
      const datosSugeridos = await previsualizarVinculaciones(archivo);
      setVinculaciones(Array.isArray(datosSugeridos) ? datosSugeridos : []);
      setVistaActual("asistente");
    } catch (err) {
      alert("No se pudo analizar los identificadores del archivo.");
    } finally {
      setCargandoAsistente(false);
    }
  };

  // Actualizar la asignación seleccionada en el asistente
  const handleCambiarEmpleadoAsignado = (sJobNo, nuevoEmpleadoId) => {
    setVinculaciones((prev) =>
      prev.map((v) =>
        v.sJobNo === sJobNo
          ? { ...v, sugeridoEmpleadoId: nuevoEmpleadoId ? Number(nuevoEmpleadoId) : null }
          : v
      )
    );
  };

  // Guardar vinculaciones masivas
  const handleGuardarVinculaciones = async () => {
    try {
      const payload = vinculaciones
        .filter((v) => v.sugeridoEmpleadoId != null)
        .map((v) => ({
          empleadoId: v.sugeridoEmpleadoId,
          idBiometrico: v.sJobNo,
        }));

      await guardarVinculaciones(payload);
      alert("¡Vinculaciones guardadas correctamente! Ahora puedes importar las marcaciones.");
      setVistaActual("historial");
      await cargarDatos();
    } catch (err) {
      alert("Error al guardar las vinculaciones.");
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* 1. HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <UploadCloud className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Ingesta & Carga de Marcaciones Biométricas
            </h1>
            <p className="text-xs text-slate-500">
              Procesamiento de archivos CSV o Excel generados por el reloj de control de asistencia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setVistaActual(vistaActual === "historial" ? "asistente" : "historial")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
              vistaActual === "asistente"
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <UserCheck className="w-4 h-4 text-indigo-600" />
            {vistaActual === "asistente" ? "Ver Historial" : "Asistente de Vinculación ID"}
          </button>
        </div>
      </div>

      {/* 2. ZONA DE CARGA DE ARCHIVO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <label className="flex-1 w-full border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-indigo-50/20 transition group">
            <FileSpreadsheet className="w-10 h-10 text-indigo-500 group-hover:scale-110 transition duration-200 mb-2 stroke-[1.5]" />
            <span className="font-semibold text-slate-700 text-sm">
              {archivo ? archivo.name : "Haz clic para seleccionar o arrastra tu archivo aquí"}
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Admite exportaciones directas del reloj (.csv, .xlsx, .xls o .txt)
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleSeleccionarArchivo}
              className="hidden"
            />
          </label>

          <div className="flex flex-col gap-2 w-full md:w-64">
            <button
              onClick={handleImportar}
              disabled={!archivo || loading}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#4b35e6] hover:bg-[#3f2bc9] disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-100 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              Importar Marcaciones
            </button>

            <button
              onClick={handleAbrirAsistente}
              disabled={!archivo || cargandoAsistente}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              {cargandoAsistente ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <UserCheck className="w-4 h-4 text-slate-600" />
              )}
              Mapear IDs del Archivo
            </button>
          </div>
        </div>

        {errorGlobal && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorGlobal}</span>
          </div>
        )}

        {/* Resumen de procesamiento inmediato */}
        {resultadoSubida && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Resultado de la última importación</span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center pt-2">
              <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Filas</div>
                <div className="text-base font-black text-slate-800">{resultadoSubida.totalFilas}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-700 font-bold uppercase">Procesadas</div>
                <div className="text-base font-black text-emerald-800">{resultadoSubida.procesadasOk}</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-amber-700 font-bold uppercase">Rebotes / Duplicados</div>
                <div className="text-base font-black text-amber-800">{resultadoSubida.duplicadasIgnoradas}</div>
              </div>
              <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl">
                <div className="text-[10px] text-rose-700 font-bold uppercase">Errores</div>
                <div className="text-base font-black text-rose-800">{resultadoSubida.errores}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. VISTA CONDICIONAL: ASISTENTE DE VINCULACIÓN O HISTORIAL */}
      {vistaActual === "asistente" ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Asistente de Vinculación Biometría ↔ Empleados
              </h2>
              <p className="text-xs text-slate-500">
                Empareja el ID del reloj (sJobNo) con el colaborador del sistema una sola vez.
              </p>
            </div>
            <button
              onClick={handleGuardarVinculaciones}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Guardar Vinculaciones
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">ID en Reloj (sJobNo)</th>
                  <th className="py-3 px-4">Nombre en Reloj</th>
                  <th className="py-3 px-4">Colaborador en Sistema</th>
                  <th className="py-3 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vinculaciones.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-slate-400 italic">
                      No se encontraron registros en el archivo para vincular.
                    </td>
                  </tr>
                ) : (
                  vinculaciones.map((v) => (
                    <tr key={v.sJobNo} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{v.sJobNo}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">{v.sName}</td>
                      <td className="py-3 px-4">
                        <select
                          value={v.sugeridoEmpleadoId || ""}
                          onChange={(e) => handleCambiarEmpleadoAsignado(v.sJobNo, e.target.value)}
                          className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-xs text-slate-800 outline-none focus:border-indigo-500 w-64"
                        >
                          <option value="">-- Sin asignar --</option>
                          {empleados.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.nombre} {emp.apellido} (Legajo: {emp.nroLegajo})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        {v.yaVinculado ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            Ya Vinculado
                          </span>
                        ) : v.sugeridoEmpleadoId ? (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            Sugerido
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                            Pendiente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TABLA DE HISTORIAL DE IMPORTACIONES */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Historial de Importaciones</h2>
              <p className="text-xs text-slate-500">
                Auditoría de lotes procesados, ordenados de forma descendente por fecha de carga.
              </p>
            </div>
            <button
              onClick={cargarDatos}
              disabled={loading}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition disabled:opacity-50"
              title="Actualizar listado"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Archivo</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Procesadas</th>
                  <th className="py-3 px-4">Rebotes</th>
                  <th className="py-3 px-4">Errores</th>
                  <th className="py-3 px-4">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historial.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400 italic">
                      {loading ? "Cargando historial..." : "No se registran importaciones previas en el sistema."}
                    </td>
                  </tr>
                ) : (
                  historial.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {h.fechaImportacion
                            ? new Date(h.fechaImportacion).toLocaleString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" />
                          {h.nombreArchivo}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{h.totalFilas}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">
                          {h.procesadasOk}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md">
                          {h.duplicadasIgnoradas}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md ${
                            h.errores > 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "text-slate-400"
                          }`}
                        >
                          {h.errores}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{h.usuarioResponsable || "Sistema"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}