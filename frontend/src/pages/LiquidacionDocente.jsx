import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  TrendingDown,
  Bookmark,
  Layers,
  CornerDownRight,
  Loader2,
  Calendar,
  Clock,
  ArrowRight,
  AlertCircle,
  CalendarCheck,
  CalendarOff,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getLiquidacionDocente } from "../services/liquidacionDocenteService";
import AuditDeviationsModal from "../components/liquidacion/AuditDeviationsModal";
import {
  formatearFechaVisual,
  formatearHorasYMinutos,
  obtenerNombreDia,
  obtenerNombreMes,
  calcularRangoSemana,
} from "../utils/fechasFichaUtils";

// Extracción de iniciales de nombre y apellido
function obtenerIniciales(nombreCompleto = "") {
  if (!nombreCompleto) return "D";
  const partes = nombreCompleto.trim().split(" ").filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

// Colores neutrales y ejecutivos para iniciales (SIN verde, rojo ni amarillo)
function obtenerColorIniciales(texto = "") {
  const paletas = [
    "bg-indigo-50 text-indigo-700 border-indigo-200",
    "bg-slate-100 text-slate-700 border-slate-300",
    "bg-blue-50 text-blue-700 border-blue-200",
    "bg-purple-50 text-purple-700 border-purple-200",
    "bg-zinc-100 text-zinc-700 border-zinc-300",
  ];
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = texto.charCodeAt(i) + ((hash << 5) - hash);
  }
  return paletas[Math.abs(hash) % paletas.length];
}

const PERIODOS = [
  { id: "DIARIO", label: "Diario" },
  { id: "SEMANAL", label: "Semanal" },
  { id: "MES", label: "Mes" },
  { id: "TRIMESTRE", label: "Trimestre" },
  { id: "CUATRIMESTRE", label: "Cuatrimestre" },
  { id: "ANUAL", label: "Anual" },
  { id: "RANGO", label: "Rango Desde-Hasta" },
];

const MESES = [
  { val: 1, label: "Enero" },
  { val: 2, label: "Febrero" },
  { val: 3, label: "Marzo" },
  { val: 4, label: "Abril" },
  { val: 5, label: "Mayo" },
  { val: 6, label: "Junio" },
  { val: 7, label: "Julio" },
  { val: 8, label: "Agosto" },
  { val: 9, label: "Septiembre" },
  { val: 10, label: "Octubre" },
  { val: 11, label: "Noviembre" },
  { val: 12, label: "Diciembre" },
];

export default function LiquidacionDocente() {
  const navigate = useNavigate();

  // Fecha local estricta
  const hoyIso = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Estados de Filtros
  const [modalidad, setModalidad] = useState("SEMANAL");
  const [fechaBase, setFechaBase] = useState(hoyIso);
  const [fechaDesde, setFechaDesde] = useState(hoyIso);
  const [fechaHasta, setFechaHasta] = useState(hoyIso);

  // Selector semanal estructurado (semana de qué mes)
  const [mesSemanal, setMesSemanal] = useState(() => new Date().getMonth() + 1);
  const [anioSemanal, setAnioSemanal] = useState(() =>
    new Date().getFullYear(),
  );
  const [lunesSeleccionado, setLunesSeleccionado] = useState(() => {
    const r = calcularRangoSemana(new Date().toISOString().split("T")[0]);
    return r.inicioSemanaStr;
  });

  // Filtros de otros períodos
  const [mesSeleccionado, setMesSeleccionado] = useState(
    () => new Date().getMonth() + 1,
  );
  const [anioSeleccionado, setAnioSeleccionado] = useState(() =>
    new Date().getFullYear(),
  );
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState(4);
  const [cuatrimestreSeleccionado, setCuatrimestreSeleccionado] = useState(2);

  const [busqueda, setBusqueda] = useState("");
  const [idDocenteSeleccionado, setIdDocenteSeleccionado] = useState("");

  // Datos y estado de carga
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados de Maestro-Detalle y Modal
  const [filasExpandidas, setFilasExpandidas] = useState(new Set());
  const [docenteParaModal, setDocenteParaModal] = useState(null);
  const [materiaParaModal, setMateriaParaModal] = useState(null);

  // Generación de semanas dinámicas para el mes y año elegidos
  const semanasDelMes = useMemo(() => {
    const semanas = [];
    const primerDiaMes = new Date(anioSemanal, mesSemanal - 1, 1);
    const ultimoDiaMes = new Date(anioSemanal, mesSemanal, 0);

    let cur = new Date(primerDiaMes);
    const day = cur.getDay();
    const diff = cur.getDate() - day + (day === 0 ? -6 : 1);
    cur.setDate(diff);

    let idx = 1;
    while (cur <= ultimoDiaMes) {
      const fIsoLunes = cur.toISOString().split("T")[0];
      const sabado = new Date(cur);
      sabado.setDate(sabado.getDate() + 5);
      const fIsoSabado = sabado.toISOString().split("T")[0];

      semanas.push({
        numero: idx++,
        lunesIso: fIsoLunes,
        sabadoIso: fIsoSabado,
        label: `Semana ${idx - 1} (${formatearFechaVisual(fIsoLunes)} al ${formatearFechaVisual(fIsoSabado)})`,
      });

      cur.setDate(cur.getDate() + 7);
    }
    return semanas;
  }, [mesSemanal, anioSemanal]);

  const handleCambioMesSemanal = (nuevoMes) => {
    setMesSemanal(nuevoMes);
    const primerDia = new Date(anioSemanal, nuevoMes - 1, 1);
    const day = primerDia.getDay();
    const diff = primerDia.getDate() - day + (day === 0 ? -6 : 1);
    const primerLunes = new Date(primerDia.setDate(diff));
    setLunesSeleccionado(primerLunes.toISOString().split("T")[0]);
  };

  const handleCambioAnioSemanal = (nuevoAnio) => {
    setAnioSemanal(nuevoAnio);
    const primerDia = new Date(nuevoAnio, mesSemanal - 1, 1);
    const day = primerDia.getDay();
    const diff = primerDia.getDate() - day + (day === 0 ? -6 : 1);
    const primerLunes = new Date(primerDia.setDate(diff));
    setLunesSeleccionado(primerLunes.toISOString().split("T")[0]);
  };

  const setEstaSemana = () => {
    const r = calcularRangoSemana(hoyIso);
    setLunesSeleccionado(r.inicioSemanaStr);
    const d = new Date();
    setMesSemanal(d.getMonth() + 1);
    setAnioSemanal(d.getFullYear());
  };

  const moverDiaDiario = (delta) => {
    const partes = fechaBase.split("-");
    const d = new Date(
      parseInt(partes[0], 10),
      parseInt(partes[1], 10) - 1,
      parseInt(partes[2], 10),
    );
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setFechaBase(`${y}-${m}-${day}`);
  };

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        modalidad,
        fechaBase: modalidad === "SEMANAL" ? lunesSeleccionado : fechaBase,
        fechaDesde,
        fechaHasta,
        mes: modalidad === "SEMANAL" ? mesSemanal : mesSeleccionado,
        anio: modalidad === "SEMANAL" ? anioSemanal : anioSeleccionado,
        trimestre: trimestreSeleccionado,
        cuatrimestre: cuatrimestreSeleccionado,
        idDocente: idDocenteSeleccionado || undefined,
      };

      const res = await getLiquidacionDocente(params);
      setData(res);
    } catch (err) {
      console.error("Error al cargar liquidación docente:", err);
    } finally {
      setLoading(false);
    }
  }, [
    modalidad,
    lunesSeleccionado,
    fechaBase,
    fechaDesde,
    fechaHasta,
    mesSemanal,
    anioSemanal,
    mesSeleccionado,
    anioSeleccionado,
    trimestreSeleccionado,
    cuatrimestreSeleccionado,
    idDocenteSeleccionado,
  ]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const toggleFila = (idDocente) => {
    setFilasExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(idDocente)) next.delete(idDocente);
      else next.add(idDocente);
      return next;
    });
  };

  const docentesFiltrados = (data?.docentes || []).filter((d) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      d.nombreDocente.toLowerCase().includes(q) ||
      d.nroLegajo.toLowerCase().includes(q) ||
      (d.dni && d.dni.includes(q))
    );
  });

  // EVALUACIÓN DE LA JORNADA DIARIA
  const estadoJornadaDiaria = useMemo(() => {
    if (modalidad !== "DIARIO" || !data) {
      return {
        esSinHorario: false,
        esInasistencia: false,
        esFuturoConHorario: false,
        tieneDatos: true,
      };
    }

    const esFechaFutura = fechaBase > hoyIso;
    const totalProg = data.totalHorasProgramadas || 0;
    const totalDict = data.totalHorasEfectivas || 0;
    const totalDesc = data.totalHorasDescontadas || 0;

    // 1. DÍA FUTURO
    if (esFechaFutura) {
      if (totalProg > 0) {
        return {
          esSinHorario: false,
          esInasistencia: false,
          esFuturoConHorario: true,
          tieneDatos: false,
        };
      }
      return {
        esSinHorario: true,
        esInasistencia: false,
        esFuturoConHorario: false,
        tieneDatos: false,
      };
    }

    // 2. DÍA PASADO O DÍA DE HOY
    if (totalProg === 0 && totalDict === 0 && totalDesc === 0) {
      return {
        esSinHorario: true,
        esInasistencia: false,
        esFuturoConHorario: false,
        tieneDatos: false,
      };
    }

    if (totalProg > 0 && totalDict === 0 && totalDesc > 0) {
      return {
        esSinHorario: false,
        esInasistencia: true,
        esFuturoConHorario: false,
        tieneDatos: true,
      };
    }

    return {
      esSinHorario: false,
      esInasistencia: false,
      esFuturoConHorario: false,
      tieneDatos: true,
    };
  }, [modalidad, data, fechaBase, hoyIso]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. ENCABEZADO PRINCIPAL (SIN BOTONES DE DESGLOSAR/EXPORTAR NI BADGE) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <DollarSign className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Liquidación y Pagos Docente
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparativa del pago ideal al 100% contra la realidad dictada y
              cantidad de horas descontadas por desvíos.
            </p>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS Y PERÍODOS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Período de Liquidación y Análisis
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Pestañas de Modalidad */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setModalidad(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  modalidad === p.id
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Buscador y Dropdown de Docente */}
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar docente o legajo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-600"
              />
            </div>

            <select
              value={idDocenteSeleccionado}
              onChange={(e) => setIdDocenteSeleccionado(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="">
                Todos los docentes ({data?.docentes?.length || 0})
              </option>
              {data?.docentes?.map((d) => (
                <option key={d.idDocente} value={d.idDocente}>
                  {d.nombreDocente} ({d.nroLegajo})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CONTROLES CONTEXTUALES */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* SELECTOR SEMANAL: QUÉ SEMANA DE QUÉ MES */}
            {modalidad === "SEMANAL" && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-500">
                  Mes:
                </span>
                <select
                  value={mesSemanal}
                  onChange={(e) =>
                    handleCambioMesSemanal(Number(e.target.value))
                  }
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer text-xs"
                >
                  {MESES.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <select
                  value={anioSemanal}
                  onChange={(e) =>
                    handleCambioAnioSemanal(Number(e.target.value))
                  }
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer text-xs"
                >
                  {[2024, 2025, 2026, 2027].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>

                <span className="text-xs font-semibold text-slate-500 ml-1">
                  Semana:
                </span>
                <select
                  value={lunesSeleccionado}
                  onChange={(e) => setLunesSeleccionado(e.target.value)}
                  className="py-1 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer text-xs"
                >
                  {semanasDelMes.map((s) => (
                    <option key={s.lunesIso} value={s.lunesIso}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={setEstaSemana}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Esta Semana
                </button>
              </div>
            )}

            {/* DIARIO */}
            {modalidad === "DIARIO" && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => moverDiaDiario(-1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Día anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <label className="relative inline-flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 hover:bg-white shadow-2xs cursor-pointer">
                  <span className="text-[10px] text-slate-400 uppercase mr-1.5 select-none font-bold">
                    Fecha:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 text-xs select-none">
                    {formatearFechaVisual(fechaBase)}
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 pointer-events-none" />
                  <input
                    type="date"
                    value={fechaBase}
                    onChange={(e) =>
                      e.target.value && setFechaBase(e.target.value)
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => moverDiaDiario(1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Día siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <span className="text-xs text-slate-400 font-medium">
                  ({obtenerNombreDia(fechaBase)})
                </span>
              </div>
            )}

            {/* MES */}
            {modalidad === "MES" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">
                  Seleccionar Mes:
                </span>
                <select
                  value={mesSeleccionado}
                  onChange={(e) => setMesSeleccionado(Number(e.target.value))}
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  {MESES.map((m) => (
                    <option key={m.val} value={m.val}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  value={anioSeleccionado}
                  onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* TRIMESTRE */}
            {modalidad === "TRIMESTRE" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">Trimestre:</span>
                <select
                  value={trimestreSeleccionado}
                  onChange={(e) =>
                    setTrimestreSeleccionado(Number(e.target.value))
                  }
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value={1}>Q1 (Ene - Mar)</option>
                  <option value={2}>Q2 (Abr - Jun)</option>
                  <option value={3}>Q3 (Jul - Sep)</option>
                  <option value={4}>Q4 (Oct - Dic)</option>
                </select>
              </div>
            )}

            {/* CUATRIMESTRE */}
            {modalidad === "CUATRIMESTRE" && (
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-500">
                  Cuatrimestre:
                </span>
                <select
                  value={cuatrimestreSeleccionado}
                  onChange={(e) =>
                    setCuatrimestreSeleccionado(Number(e.target.value))
                  }
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value={1}>1° Cuatrimestre (Marzo - Junio)</option>
                  <option value={2}>
                    2° Cuatrimestre (Agosto - Noviembre)
                  </option>
                </select>
              </div>
            )}

            {/* RANGO DESDE - HASTA */}
            {modalidad === "RANGO" && (
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 hover:bg-white shadow-2xs cursor-pointer">
                  <span className="text-[10px] text-slate-400 uppercase mr-1.5 select-none font-bold">
                    Desde:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 text-xs select-none">
                    {formatearFechaVisual(fechaDesde)}
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 pointer-events-none" />
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFechaDesde(e.target.value);
                        if (e.target.value > fechaHasta)
                          setFechaHasta(e.target.value);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>

                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />

                <label className="relative inline-flex items-center border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 hover:bg-white shadow-2xs cursor-pointer">
                  <span className="text-[10px] text-slate-400 uppercase mr-1.5 select-none font-bold">
                    Hasta:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 text-xs select-none">
                    {formatearFechaVisual(fechaHasta)}
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 pointer-events-none" />
                  <input
                    type="date"
                    value={fechaHasta}
                    min={fechaDesde}
                    onChange={(e) =>
                      e.target.value && setFechaHasta(e.target.value)
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-700">
              <Calendar className="w-3.5 h-3.5" />
              {modalidad === "MES"
                ? `${obtenerNombreMes(`${anioSeleccionado}-${String(mesSeleccionado).padStart(2, "0")}-01`)}`
                : data?.periodoTexto || "Cargando..."}
            </span>
          </div>
        </div>
      </div>

      {/* CASO A: DÍA FUTURO CON HORARIO PROGRAMADO */}
      {modalidad === "DIARIO" && estadoJornadaDiaria.esFuturoConHorario && (
        <div className="bg-indigo-50/60 border-2 border-indigo-200 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-fadeIn">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
            <CalendarCheck className="w-7 h-7" />
          </div>
          <div className="max-w-xl mx-auto space-y-1.5">
            <span className="inline-block px-3 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-2xs">
              Jornada Futura Programada
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Cátedras planificadas para el {formatearFechaVisual(fechaBase)} (
              {obtenerNombreDia(fechaBase)})
            </h3>
            <p className="text-xs text-slate-600">
              Esta fecha es posterior al día de hoy. El claustro docente tiene
              registradas{" "}
              <strong>
                {formatearHorasYMinutos(data?.totalHorasProgramadas)}
              </strong>{" "}
              en {data?.totalClasesPeriodo || 0} comisiones que se liquidarán al
              completar su dictado.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => moverDiaDiario(-1)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              Día anterior
            </button>
            <button
              type="button"
              onClick={() => moverDiaDiario(1)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              Día siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
            {fechaBase !== hoyIso && (
              <button
                type="button"
                onClick={() => setFechaBase(hoyIso)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                Volver a Hoy
              </button>
            )}
          </div>
        </div>
      )}

      {/* CASO B: DÍA SIN HORARIOS PROGRAMADOS */}
      {modalidad === "DIARIO" && estadoJornadaDiaria.esSinHorario && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs animate-fadeIn">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-2xs">
            <CalendarOff className="w-8 h-8 text-slate-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <span className="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
              Sin cátedras ni horarios programados
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              No hay clases a liquidar para esta jornada
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No existen franjas académicas asignadas para el día{" "}
              <strong>{formatearFechaVisual(fechaBase)}</strong> (
              {obtenerNombreDia(fechaBase)}).
            </p>
            <p className="text-[11px] text-slate-400">
              Seleccione otro día utilizando el selector de fechas o los
              navegadores rápidos.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => moverDiaDiario(-1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Día anterior
            </button>
            <button
              type="button"
              onClick={() => moverDiaDiario(1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              Día siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
            {fechaBase !== hoyIso && (
              <button
                type="button"
                onClick={() => setFechaBase(hoyIso)}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Volver a Hoy
              </button>
            )}
          </div>
        </div>
      )}

      {/* CASO C: INASISTENCIA GENERAL EN DÍA OBLIGATORIO */}
      {modalidad === "DIARIO" && estadoJornadaDiaria.esInasistencia && (
        <div className="bg-rose-50/80 border-2 border-rose-300 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm animate-fadeIn">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
            <UserX className="w-7 h-7" />
          </div>
          <div className="max-w-xl mx-auto space-y-1.5">
            <span className="inline-block px-3 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
              Inasistencia detectada en cátedras
            </span>
            <h3 className="text-base sm:text-lg font-black text-rose-950">
              Jornada académica con falta total de registros biométricos
            </h3>
            <p className="text-xs text-rose-800">
              Para el día <strong>{formatearFechaVisual(fechaBase)}</strong> (
              {obtenerNombreDia(fechaBase)}) constaban clases asignadas por un
              total de{" "}
              <strong>
                {formatearHorasYMinutos(data?.totalHorasProgramadas)}
              </strong>
              , pero no se registraron ingresos ni egresos en las terminales.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => moverDiaDiario(-1)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-rose-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              Día anterior
            </button>
            <button
              type="button"
              onClick={() => moverDiaDiario(1)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-rose-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              Día siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* RENDERIZADO DE MÉTRICAS KPIS Y TABLA */}
      {(modalidad !== "DIARIO" ||
        (!estadoJornadaDiaria.esSinHorario &&
          !estadoJornadaDiaria.esFuturoConHorario)) && (
        <>
          {/* 3. TARJETAS DE RESUMEN GLOBAL (KPIS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Pago Ideal */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pago Ideal (100% Cátedras)
                </span>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                ${Math.round(data?.totalPagoIdeal || 0).toLocaleString("es-AR")}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {formatearHorasYMinutos(data?.totalHorasProgramadas)}{" "}
                  programadas ({data?.totalClasesPeriodo || 0} clases)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                Monto teórico a abonar sin inasistencias ni desvíos
              </div>
            </div>

            {/* KPI 2: Pago Real */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pago Real a Liquidar
                </span>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 mt-2 font-mono">
                ${Math.round(data?.totalPagoReal || 0).toLocaleString("es-AR")}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {formatearHorasYMinutos(data?.totalHorasEfectivas)} dictadas y
                  auditadas
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                <span>Cumplimiento efectivo:</span>
                <span className="font-bold text-emerald-600">
                  {data?.porcentajeCumplimientoGlobal || 100}%
                </span>
              </div>
            </div>

            {/* KPI 3: Descuentos por Desvíos */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Descuentos por Desvíos
                </span>
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2 font-mono">
                -$
                {Math.round(data?.totalMontoDescontado || 0).toLocaleString(
                  "es-AR",
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {formatearHorasYMinutos(data?.totalHorasDescontadas)}{" "}
                  descontadas en el período
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                <span>Deducción sobre lo ideal:</span>
                <span className="font-bold text-rose-600">
                  {data?.porcentajePerdida || 0}%
                </span>
              </div>
            </div>

            {/* KPI 4: Motivos de Descuento */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Motivos de Descuento
                </span>
                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-sans flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />{" "}
                    Inasistencias:
                  </span>
                  <span className="font-bold text-slate-700">
                    {formatearHorasYMinutos(data?.desgloseCausas?.horasFaltas)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-sans flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />{" "}
                    Tardanzas:
                  </span>
                  <span className="font-bold text-slate-700">
                    {formatearHorasYMinutos(
                      data?.desgloseCausas?.horasTardanzas,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-sans flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />{" "}
                    Retiros:
                  </span>
                  <span className="font-bold text-slate-700">
                    {formatearHorasYMinutos(
                      data?.desgloseCausas?.horasRetirosPrevios,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-sans flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />{" "}
                    Salidas:
                  </span>
                  <span className="font-bold text-slate-700">
                    {formatearHorasYMinutos(
                      data?.desgloseCausas?.horasSalidasIntermedias,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. TABLA COMPARATIVA PRINCIPAL (MAESTRO - DETALLE) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Planilla Comparativa de Liquidación Docente
                </h3>
                <p className="text-xs text-slate-400">
                  Primera línea consolidada por docente y desglose por
                  materia/horario. Filas compactas con bitácora forense
                  accesible por modal.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Docentes evaluados: {docentesFiltrados.length}
              </span>
            </div>

            {loading ? (
              <div className="p-16 text-center text-xs text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                Calculando liquidación y cruzando huellas biométricas...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Docente</th>
                      <th className="py-3 px-3 text-center">Clases</th>
                      <th className="py-3 px-3 text-center">Horas Prog.</th>
                      <th className="py-3 px-3 text-center">Horas Dictadas</th>
                      <th className="py-3 px-3 text-center">
                        Horas Descontadas (Motivos)
                      </th>
                      <th className="py-3 px-3 text-right">
                        Pago Ideal (100%)
                      </th>
                      <th className="py-3 px-3 text-right">
                        Pago Real Liquidado
                      </th>
                      <th className="py-3 px-3 text-right">Descuento ($)</th>
                      <th className="py-3 px-3 text-center">% Cumplimiento</th>
                      <th className="py-3 px-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {docentesFiltrados.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="p-12 text-center text-slate-500"
                        >
                          <div className="max-w-md mx-auto space-y-2">
                            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                            <h4 className="text-sm font-bold text-slate-700">
                              Sin actividad registrada en este período
                            </h4>
                            <p className="text-xs text-slate-400">
                              {busqueda
                                ? `No hay coincidencias para "${busqueda}".`
                                : "No se encontraron marcaciones biométricas ni clases asignadas a docentes en el rango seleccionado."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      docentesFiltrados.map((d) => {
                        const expandido = filasExpandidas.has(d.idDocente);
                        const tieneClasesAsignadas =
                          d.comisiones && d.comisiones.length > 0;

                        return (
                          <React.Fragment key={d.idDocente}>
                            {/* FILA PRINCIPAL (DOCENTE) */}
                            <tr
                              className={`hover:bg-slate-50/80 transition cursor-pointer ${
                                expandido ? "bg-slate-50/40" : ""
                              }`}
                              onClick={() => toggleFila(d.idDocente)}
                            >
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                  >
                                    {expandido ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>

                                  {/* INICIALES CON PALETA NEUTRAL */}
                                  <div
                                    className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs select-none shadow-2xs shrink-0 ${obtenerColorIniciales(
                                      d.nombreDocente,
                                    )}`}
                                  >
                                    {obtenerIniciales(d.nombreDocente)}
                                  </div>

                                  <div>
                                    <div className="font-bold text-slate-800 leading-snug">
                                      {d.nombreDocente}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {tieneClasesAsignadas ? (
                                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                                          {d.totalMaterias}{" "}
                                          {d.totalMaterias === 1
                                            ? "materia"
                                            : "materias"}
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-semibold">
                                          Sin materias
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                                {d.totalClases}
                              </td>

                              <td className="py-3.5 px-3 text-center font-mono text-slate-600">
                                {formatearHorasYMinutos(d.horasProgramadas)}
                              </td>

                              <td className="py-3.5 px-3 text-center font-bold font-mono text-emerald-600">
                                {formatearHorasYMinutos(d.horasDictadas)}
                              </td>

                              <td className="py-3.5 px-3 text-center">
                                {d.horasDescontadas > 0 ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold font-mono bg-rose-50 text-rose-600 border border-rose-200">
                                      <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />
                                      -
                                      {formatearHorasYMinutos(
                                        d.horasDescontadas,
                                      )}{" "}
                                      desc.
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setMateriaParaModal(null);
                                        setDocenteParaModal(d);
                                      }}
                                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                                    >
                                      Ver ({d.cantidadDesvios}) →
                                    </button>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" />
                                    0h desc. (100% puntual)
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-3 text-right font-medium font-mono text-slate-500">
                                $
                                {Math.round(d.pagoIdeal).toLocaleString(
                                  "es-AR",
                                )}
                              </td>

                              <td className="py-3.5 px-3 text-right font-black font-mono text-slate-900">
                                $
                                {Math.round(d.pagoReal).toLocaleString("es-AR")}
                              </td>

                              <td className="py-3.5 px-3 text-right font-mono">
                                {d.montoDescontado > 0 ? (
                                  <span className="font-bold text-rose-600">
                                    -$
                                    {Math.round(
                                      d.montoDescontado,
                                    ).toLocaleString("es-AR")}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">$0</span>
                                )}
                              </td>

                              <td className="py-3.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    d.porcentajeCumplimiento >= 95
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : d.porcentajeCumplimiento >= 80
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-rose-50 text-rose-600 border border-rose-200"
                                  }`}
                                >
                                  {d.porcentajeCumplimiento}%
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <div
                                  className="flex items-center justify-center gap-1.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleFila(d.idDocente)}
                                    className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                  >
                                    {expandido ? "Ocultar" : "Desglosar"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/comportamiento?empleadoId=${d.idDocente}`,
                                      )
                                    }
                                    className="px-2.5 py-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[11px] font-bold transition cursor-pointer"
                                  >
                                    Ficha
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* SUBFILAS DESPLEGABLES (COMISIONES / MATERIAS) */}
                            {expandido && (
                              <tr className="bg-slate-50/70 border-b border-slate-200">
                                <td colSpan={10} className="p-4 pl-12">
                                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                                      <div className="flex items-center gap-2">
                                        <CornerDownRight className="w-4 h-4 text-indigo-600" />
                                        <span>
                                          DESGLOSE POR MATERIA Y HORARIO —{" "}
                                          {d.nombreDocente.toUpperCase()}
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-slate-400 font-normal">
                                        {d.comisiones.length} comisiones
                                        asignadas
                                      </span>
                                    </div>

                                    {!tieneClasesAsignadas ? (
                                      <div className="py-6 text-center text-xs text-slate-400 italic">
                                        Este docente no tiene materias ni
                                        comisiones registradas en su cronograma.
                                      </div>
                                    ) : (
                                      <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                          <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                            <th className="pb-2">
                                              Materia & Detalle de Horario
                                            </th>
                                            <th className="pb-2 text-center">
                                              Clases
                                            </th>
                                            <th className="pb-2 text-center">
                                              Horas Prog.
                                            </th>
                                            <th className="pb-2 text-center">
                                              Horas Dictadas
                                            </th>
                                            <th className="pb-2 text-center">
                                              Horas Desc.
                                            </th>
                                            <th className="pb-2 text-center">
                                              Detalle Forense de Desvíos
                                            </th>
                                            <th className="pb-2 text-right">
                                              Tarifa
                                            </th>
                                            <th className="pb-2 text-right">
                                              Pago Ideal
                                            </th>
                                            <th className="pb-2 text-right">
                                              Pago Real
                                            </th>
                                            <th className="pb-2 text-right">
                                              Deducción
                                            </th>
                                            <th className="pb-2 text-center">
                                              % Cumpl.
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {d.comisiones.map((c) => (
                                            <tr
                                              key={c.idHorario}
                                              className="hover:bg-slate-50/50"
                                            >
                                              <td className="py-2.5">
                                                <div className="font-bold text-slate-800">
                                                  {c.nombreMateria}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5 font-mono flex-wrap">
                                                  <span>Días:</span>
                                                  {c.diasNombres?.map((dia) => (
                                                    <span
                                                      key={dia}
                                                      className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]"
                                                    >
                                                      {dia}
                                                    </span>
                                                  ))}
                                                  <span>
                                                    • {c.horarioTexto}
                                                  </span>
                                                  <span>•</span>
                                                  <span className="italic">
                                                    {c.aula}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="py-2.5 text-center font-semibold text-slate-600">
                                                {c.totalClases}
                                              </td>
                                              <td className="py-2.5 text-center font-mono text-slate-600">
                                                {formatearHorasYMinutos(
                                                  c.horasProgramadas,
                                                )}
                                              </td>
                                              <td className="py-2.5 text-center font-mono font-bold text-emerald-600">
                                                {formatearHorasYMinutos(
                                                  c.horasDictadas,
                                                )}
                                              </td>
                                              <td className="py-2.5 text-center font-mono text-slate-500">
                                                {c.horasDescontadas > 0 ? (
                                                  <span className="text-rose-600 font-bold">
                                                    -
                                                    {formatearHorasYMinutos(
                                                      c.horasDescontadas,
                                                    )}
                                                  </span>
                                                ) : (
                                                  "0h 00m"
                                                )}
                                              </td>

                                              {/* DETALLE FORENSE CON BOTÓN [Ver detalle →] */}
                                              <td className="py-2.5 text-center">
                                                {c.cantidadDesvios > 0 ? (
                                                  <div className="flex flex-col items-center gap-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                                                      <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                                                      {c.cantidadDesvios}{" "}
                                                      desvíos
                                                    </span>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setDocenteParaModal(d);
                                                        setMateriaParaModal(c);
                                                      }}
                                                      className="px-2 py-0.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-md transition cursor-pointer"
                                                    >
                                                      Ver detalle →
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Sin desvíos (100% puntual)
                                                  </span>
                                                )}
                                              </td>

                                              <td className="py-2.5 text-right font-mono text-slate-600">
                                                $
                                                {Math.round(
                                                  c.tarifaHora,
                                                ).toLocaleString("es-AR")}
                                                /h
                                              </td>
                                              <td className="py-2.5 text-right font-medium font-mono text-slate-500">
                                                $
                                                {Math.round(
                                                  c.pagoIdeal,
                                                ).toLocaleString("es-AR")}
                                              </td>
                                              <td className="py-2.5 text-right font-bold font-mono text-slate-800">
                                                $
                                                {Math.round(
                                                  c.pagoReal,
                                                ).toLocaleString("es-AR")}
                                              </td>
                                              <td className="py-2.5 text-right font-mono">
                                                {c.montoDescontado > 0 ? (
                                                  <span className="font-bold text-rose-600">
                                                    -$
                                                    {Math.round(
                                                      c.montoDescontado,
                                                    ).toLocaleString("es-AR")}
                                                  </span>
                                                ) : (
                                                  <span className="text-slate-400">
                                                    $0
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5 text-center">
                                                <span
                                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                    c.porcentajeCumplimiento >=
                                                    95
                                                      ? "bg-emerald-50 text-emerald-700"
                                                      : c.porcentajeCumplimiento >=
                                                          80
                                                        ? "bg-amber-50 text-amber-700"
                                                        : "bg-rose-50 text-rose-600"
                                                  }`}
                                                >
                                                  {c.porcentajeCumplimiento}%
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 5. MODAL DE AUDITORÍA FORENSE ANTI-DESBORDE */}
      <AuditDeviationsModal
        isOpen={Boolean(docenteParaModal)}
        onClose={() => {
          setDocenteParaModal(null);
          setMateriaParaModal(null);
        }}
        docente={docenteParaModal}
        materiaSeleccionada={materiaParaModal}
        periodoTexto={data?.periodoTexto || ""}
      />
    </div>
  );
}
