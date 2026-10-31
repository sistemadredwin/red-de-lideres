import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { getPerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FILA_TITULOS = 6;
const FILAS = 300;
const VERDE = "FF1E7B45";
const AMARILLO = "FFF5C400";

// La planilla oficial de votantes. Sale del propio sistema para que todos usen
// el mismo formato: los barrios y los puestos de votación son los que hay en la
// base de datos, y si la descarga un líder, ya viene con su nombre y sus barrios.
export async function GET(request: NextRequest) {
  const perfil = await getPerfil();
  if (!perfil || !perfil.activo || !["admin", "lider_comuna", "lider_barrio"].includes(perfil.rol)) {
    return NextResponse.json({ error: "No tienes permiso para descargar la planilla." }, { status: 403 });
  }
  const supabase = await createClient();

  // ¿De qué líder es la planilla? Un líder solo la baja con sus datos; el administrador puede elegir.
  let lider: { nombre_completo: string; telefono: string | null; comuna_id: number | null } | null = null;
  if (perfil.rol === "admin") {
    const id = request.nextUrl.searchParams.get("lider") ?? "";
    if (/^[0-9a-f-]{36}$/.test(id)) {
      const { data } = await supabase.from("perfiles").select("nombre_completo, telefono, comuna_id").eq("id", id).in("rol", ["lider_comuna", "lider_barrio"]).maybeSingle();
      lider = data;
    }
  } else {
    const { data } = await supabase.from("perfiles").select("nombre_completo, telefono, comuna_id").eq("id", perfil.id).maybeSingle();
    lider = data;
  }

  let consultaBarrios = supabase.from("barrios").select("nombre").order("nombre");
  if (lider?.comuna_id) consultaBarrios = consultaBarrios.eq("comuna_id", lider.comuna_id);
  const [{ data: barrios }, { data: puestos }] = await Promise.all([
    consultaBarrios,
    supabase.from("puestos_votacion").select("nombre").order("nombre"),
  ]);
  const listaBarrios = (barrios ?? []).map((b) => b.nombre);
  const listaPuestos = (puestos ?? []).map((p) => p.nombre);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Red de Líderes";
  const ws = wb.addWorksheet("Planilla", { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: `${FILA_TITULOS}:${FILA_TITULOS}` } });
  const listas = wb.addWorksheet("Listas", { state: "hidden" });
  const ayuda = wb.addWorksheet("Instrucciones");

  // Listas de apoyo (ocultas): de ahí salen los desplegables
  listas.getCell("A1").value = "Barrios";
  listas.getCell("B1").value = "Puestos de votación";
  listaBarrios.forEach((b, i) => (listas.getCell(i + 2, 1).value = b));
  listaPuestos.forEach((p, i) => (listas.getCell(i + 2, 2).value = p));

  [16, 42, 24, 18, 42, 9].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  const fuente = { name: "Arial", size: 10 };
  const borde: Partial<ExcelJS.Borders> = {
    left: { style: "thin", color: { argb: "FF9AA8A0" } }, right: { style: "thin", color: { argb: "FF9AA8A0" } },
    top: { style: "thin", color: { argb: "FF9AA8A0" } }, bottom: { style: "thin", color: { argb: "FF9AA8A0" } },
  };

  ws.mergeCells("A1:F1");
  Object.assign(ws.getCell("A1"), { value: "PLANILLA DE VOTANTES 2026" });
  ws.getCell("A1").font = { name: "Arial", size: 16, bold: true, color: { argb: "FF14532D" } };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 34;
  ws.mergeCells("A2:F2");
  ws.getCell("A2").value = "Escribe una persona por fila. Nombre, cédula y puesto de votación son obligatorios. No cambies los títulos.";
  ws.getCell("A2").font = { name: "Arial", size: 9, italic: true, color: { argb: "FF5B6B62" } };
  ws.getCell("A2").alignment = { horizontal: "center" };

  const etiqueta = (celda: string, texto: string) => {
    ws.getCell(celda).value = texto;
    ws.getCell(celda).font = { ...fuente, bold: true };
    ws.getCell(celda).alignment = { horizontal: "right", vertical: "middle" };
  };
  const valor = (celda: string, texto = "") => {
    const c = ws.getCell(celda);
    c.value = texto;
    c.font = fuente;
    c.numFmt = "@";
    c.border = { bottom: { style: "thin", color: { argb: "FF14211A" } } };
    c.alignment = { vertical: "middle" };
  };
  etiqueta("A3", "Líder:"); valor("B3", lider?.nombre_completo ?? "");
  etiqueta("C3", "Teléfono:"); valor("D3", lider?.telefono ?? "");
  etiqueta("E3", "Municipio:"); valor("F3", "Buenaventura");
  etiqueta("A4", "Vereda/barrio:"); valor("B4");
  ws.getRow(3).height = 22;
  ws.getRow(4).height = 22;

  ["#", "NOMBRES Y APELLIDOS", "CEDULA DE CIUDADANIA", "TELEFONO", "PUESTO DE VOTACION", "MESA"].forEach((t, i) => {
    const c = ws.getCell(FILA_TITULOS, i + 1);
    c.value = t;
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.border = borde;
  });
  ws.getRow(FILA_TITULOS).height = 26;

  for (let k = 1; k <= FILAS; k++) {
    const r = FILA_TITULOS + k;
    const n = ws.getCell(r, 1);
    n.value = k;
    n.font = { name: "Arial", size: 9, color: { argb: "FF5B6B62" } };
    n.alignment = { horizontal: "center" };
    n.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EFEA" } };
    n.border = borde;
    for (let c = 2; c <= 6; c++) {
      const x = ws.getCell(r, c);
      x.font = fuente;
      x.numFmt = "@";
      x.border = borde;
      if (c === 3 || c === 4 || c === 6) x.alignment = { horizontal: "center" };
    }
    ws.getCell(r, 3).dataValidation = {
      type: "custom", allowBlank: true, showErrorMessage: true, errorTitle: "Cédula",
      error: "Solo números, de 6 a 10 dígitos, sin puntos.", formulae: [`AND(LEN(C${r})>=6,LEN(C${r})<=10,ISNUMBER(--C${r}))`],
    };
    if (listaPuestos.length) {
      ws.getCell(r, 5).dataValidation = {
        type: "list", allowBlank: true, showErrorMessage: true, errorStyle: "warning", errorTitle: "Puesto de votación",
        error: "Elige un puesto de la lista para que el sistema lo reconozca.", formulae: [`Listas!$B$2:$B$${listaPuestos.length + 1}`],
      };
    }
  }
  if (listaBarrios.length) {
    ws.getCell("B4").dataValidation = {
      type: "list", allowBlank: true, showErrorMessage: true, errorStyle: "warning", errorTitle: "Barrio",
      error: "Elige un barrio de la lista.", formulae: [`Listas!$A$2:$A$${listaBarrios.length + 1}`],
    };
  }
  ws.views = [{ state: "frozen", ySplit: FILA_TITULOS }];

  ayuda.getColumn(1).width = 110;
  [
    "Cómo llenar la planilla",
    "",
    "1. Líder y barrio: ya están en el encabezado. Si la planilla es de otro barrio, cámbialo con la lista desplegable.",
    "2. Una persona por fila: nombres y apellidos, cédula (solo números), teléfono, puesto de votación (de la lista) y mesa.",
    "3. Obligatorios: nombre, cédula y puesto de votación. Teléfono y mesa son opcionales.",
    "4. No cambies los títulos de la fila 6 ni muevas las columnas. Hasta 300 filas por planilla.",
    "5. Súbela en el sistema: Importar lista → archivo .xlsx. Verás qué filas son nuevas, repetidas o con errores antes de guardar.",
  ].forEach((t, i) => {
    const c = ayuda.getCell(i + 1, 1);
    c.value = t;
    c.font = { name: "Arial", size: i === 0 ? 14 : 10, bold: i === 0 };
  });
  void AMARILLO;

  const buffer = await wb.xlsx.writeBuffer();
  const nombre = (lider?.nombre_completo ?? "en-blanco").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="planilla-${nombre}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
