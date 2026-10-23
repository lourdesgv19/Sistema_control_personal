export function obtenerIniciales(nombreCompleto = "") {
  if (!nombreCompleto) return "D";
  const partes = nombreCompleto.trim().split(" ").filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  // Toma la inicial del primer elemento (generalmente apellido) y del segundo (nombre)
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export function obtenerColorIniciales(texto = "") {
  const paletas = [
    "bg-indigo-50 text-indigo-700 border-indigo-200",
    "bg-emerald-50 text-emerald-700 border-emerald-200",
    "bg-blue-50 text-blue-700 border-blue-200",
    "bg-purple-50 text-purple-700 border-purple-200",
    "bg-amber-50 text-amber-700 border-amber-200",
    "bg-rose-50 text-rose-700 border-rose-200",
  ];
  let hash = 0;
  for (let i = 0; i < texto.length; i++) {
    hash = texto.charCodeAt(i) + ((hash << 5) - hash);
  }
  return paletas[Math.abs(hash) % paletas.length];
}
