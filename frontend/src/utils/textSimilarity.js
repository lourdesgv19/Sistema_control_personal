// 1. Quita tildes, signos de puntuación innecesarios y normaliza espacios
export const normalizarTexto = (texto = "") => {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Sin acentos
    .replace(/[/\\.,\-_()]/g, " ") // Convierte '/', '-', '(', etc. en espacios
    .trim()
    .replace(/\s+/g, " ");
};

// 2. Distancia de Levenshtein clásica
export const distanciaLevenshtein = (a, b) => {
  const matriz = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) matriz[i][0] = i;
  for (let j = 0; j <= b.length; j++) matriz[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + costo,
      );
    }
  }
  return matriz[a.length][b.length];
};

// Palabras de enlace que se ignoran en el análisis de relevancia
const STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "y",
  "en",
  "para",
  "a",
]);

// Extrae palabras significativas (ej: quita 'de', 'y', etc.)
const obtenerPalabrasClave = (texto) => {
  return normalizarTexto(texto)
    .split(" ")
    .filter((p) => p.length >= 2 && !STOP_WORDS.has(p));
};

// Verifica si dos palabras individuales son iguales o casi iguales (plural/singular o typo)
const palabrasSonSimilares = (p1, p2) => {
  if (p1 === p2) return true;
  // Plural/singular directo (ej: contable vs contables)
  if (
    p1 + "s" === p2 ||
    p2 + "s" === p1 ||
    p1 + "es" === p2 ||
    p2 + "es" === p1
  )
    return true;
  // 1 letra de diferencia en palabras de más de 4 letras
  if (
    p1.length >= 4 &&
    p2.length >= 4 &&
    Math.abs(p1.length - p2.length) <= 1
  ) {
    return distanciaLevenshtein(p1, p2) <= 1;
  }
  return false;
};

// 3. Comparador inteligente multi-criterio
export const buscarSimilar = (
  nuevoTexto,
  listaExistente = [],
  idIgnorar = null,
) => {
  const limpioNuevo = normalizarTexto(nuevoTexto);
  if (!limpioNuevo || limpioNuevo.length < 3) return null;

  const palabrasNuevo = obtenerPalabrasClave(nuevoTexto);
  if (palabrasNuevo.length === 0) return null;

  for (const item of listaExistente) {
    if (idIgnorar && item.id === idIgnorar) continue;

    const limpioExistente = normalizarTexto(item.nombre || "");
    if (!limpioExistente) continue;

    // Regla 1: Coincidencia EXACTA normalizada
    if (limpioNuevo === limpioExistente) {
      return { item, tipo: "EXACTO" };
    }

    // Regla 2: Levenshtein global para frases de longitud muy similar
    const distGlobal = distanciaLevenshtein(limpioNuevo, limpioExistente);
    if (
      distGlobal <= 2 &&
      Math.abs(limpioNuevo.length - limpioExistente.length) <= 2
    ) {
      return { item, tipo: "SIMILAR" };
    }

    // Regla 3: Análisis por palabras clave (Atrapa "auxiliar contables" vs "Auxiliar Contable / Tesorería")
    const palabrasExistente = obtenerPalabrasClave(item.nombre);

    // Contamos cuántas palabras clave del texto nuevo coinciden con alguna del existente
    let coincidencias = 0;
    for (const pNuevo of palabrasNuevo) {
      if (palabrasExistente.some((pEx) => palabrasSonSimilares(pNuevo, pEx))) {
        coincidencias++;
      }
    }

    // Si TODAS o casi todas las palabras clave ingresadas ya están en el cargo existente:
    // Ej: "auxiliar contables" tiene 2 palabras y ambas coinciden con "Auxiliar Contable / Tesorería"
    const porcentajeCoincidencia = coincidencias / palabrasNuevo.length;

    if (palabrasNuevo.length >= 2 && porcentajeCoincidencia >= 0.8) {
      return { item, tipo: "SIMILAR" };
    }

    // Si es una sola palabra clave (ej: "Bedeles" vs "Bedel"):
    if (
      palabrasNuevo.length === 1 &&
      coincidencias === 1 &&
      palabrasExistente.length <= 2
    ) {
      return { item, tipo: "SIMILAR" };
    }
  }

  return null;
};
