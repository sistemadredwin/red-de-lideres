// Lectura de las filas de un Excel de votantes (sin dependencias del servidor).
// Reconoce las columnas por su nombre, en cualquier orden. Si no hay encabezado
// reconocible, usa este orden: cédula, nombre, teléfono, barrio, puesto, mesa.

export interface FilaExcel {
  fila: number; // número de fila en el Excel, para que el usuario la encuentre
  cedula: string;
  nombre: string;
  telefono: string;
  barrio: string;
  puesto: string;
  mesa: string;
}

const NOMBRES: Record<keyof Omit<FilaExcel, "fila">, string[]> = {
  cedula: ["cedula", "cc", "documento", "identificacion", "numerodocumento"],
  nombre: ["nombre", "nombres", "nombrecompleto", "nombreyapellido", "nombresyapellidos"],
  telefono: ["telefono", "celular", "tel", "movil", "whatsapp"],
  barrio: ["barrio"],
  puesto: ["puestodevotacion", "puestovotacion", "puesto", "puestodevotacion"],
  mesa: ["mesa"],
};

// Quita tildes, mayúsculas y todo lo que no sea letra: "Puesto de votación" → "puestodevotacion".
export const normalizarClave = (t: unknown) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");

// Mismo criterio que usa la base de datos para comparar barrios y puestos.
export const normalizarNombre = (t: unknown) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const texto = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export interface Cabecera {
  lider: string;
  telefono: string;
  municipio: string;
  barrio: string;
}

export interface Planilla {
  filas: FilaExcel[];
  cabecera: Cabecera;
  formato: "planilla" | "tabla"; // planilla = con datos del líder arriba; tabla = solo columnas
}

type Campo = keyof Omit<FilaExcel, "fila">;

// Reconoce el título de cada columna ("NOMBRES Y APELLIDOS", "CEDULA DE CIUDADANIA", ...).
function campoDe(celda: string): Campo | null {
  const k = normalizarClave(celda);
  if (!k) return null;
  if (k.startsWith("cedula") || NOMBRES.cedula.includes(k)) return "cedula";
  if (k.includes("nombre") || NOMBRES.nombre.includes(k)) return "nombre";
  if (k.startsWith("tel") || NOMBRES.telefono.includes(k)) return "telefono";
  if (k.startsWith("puesto")) return "puesto";
  if (k === "mesa") return "mesa";
  if (k === "barrio") return "barrio";
  return null;
}

// Lee la planilla del sistema: datos del líder arriba (Líder, Teléfono, Municipio,
// Vereda/barrio) y debajo la tabla de votantes. También acepta una tabla simple
// con los títulos en la primera fila, en cualquier orden.
export function leerPlanilla(filas: unknown[][]): Planilla {
  const todas = filas.map((celdas, i) => ({ celdas: celdas.map(texto), n: i + 1 }));
  const vacia: Cabecera = { lider: "", telefono: "", municipio: "", barrio: "" };

  // 1. Buscar la fila de títulos de la tabla (cédula + nombre)
  let titulos = -1;
  let mapa: Partial<Record<Campo, number>> = {};
  for (let i = 0; i < Math.min(todas.length, 40); i++) {
    const m: Partial<Record<Campo, number>> = {};
    todas[i].celdas.forEach((c, col) => {
      const campo = campoDe(c);
      if (campo && m[campo] === undefined) m[campo] = col;
    });
    if (m.cedula !== undefined && m.nombre !== undefined) {
      titulos = i;
      mapa = m;
      break;
    }
  }

  // 2. Datos del líder: etiquetas encima de la tabla; el valor es la celda de su derecha
  const cabecera: Cabecera = { ...vacia };
  if (titulos > 0) {
    for (const { celdas } of todas.slice(0, titulos)) {
      celdas.forEach((c, col) => {
        const k = normalizarClave(c);
        const valor = celdas[col + 1] ?? "";
        if (!valor) return;
        if (k === "lider") cabecera.lider = valor;
        else if (k === "telefono") cabecera.telefono = valor;
        else if (k === "municipio") cabecera.municipio = valor;
        else if (k === "veredabarrio" || k === "barrio" || k === "vereda") cabecera.barrio = valor;
      });
    }
  }

  // 3. Sin títulos reconocibles: orden fijo cédula, nombre, teléfono, barrio, puesto, mesa
  const conTitulos = titulos >= 0;
  const columnas: Partial<Record<Campo, number>> = conTitulos ? mapa : { cedula: 0, nombre: 1, telefono: 2, barrio: 3, puesto: 4, mesa: 5 };
  const datos = (conTitulos ? todas.slice(titulos + 1) : todas).filter((f) => f.celdas.some((c) => c !== ""));

  const resultado: FilaExcel[] = [];
  for (const { celdas, n } of datos) {
    const g = (campo: Campo) => {
      const i = columnas[campo];
      return i === undefined ? "" : (celdas[i] ?? "");
    };
    const fila: FilaExcel = {
      fila: n,
      cedula: g("cedula").replace(/\D/g, ""),
      nombre: g("nombre"),
      telefono: g("telefono"),
      barrio: g("barrio") || cabecera.barrio,
      puesto: g("puesto"),
      mesa: g("mesa"),
    };
    // En la planilla solo viene el número (#) en las filas sin usar: se saltan.
    if (!fila.cedula && !fila.nombre && !g("telefono") && !fila.puesto && !fila.mesa && !g("cedula")) continue;
    resultado.push(fila);
  }
  return { filas: resultado, cabecera, formato: conTitulos && titulos > 0 ? "planilla" : "tabla" };
}

// Compatibilidad: solo las filas.
export const leerFilas = (filas: unknown[][]): FilaExcel[] => leerPlanilla(filas).filas;
