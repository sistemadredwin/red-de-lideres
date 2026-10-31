import { NextResponse, type NextRequest } from "next/server";
import { getPerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS } from "@/lib/types";
import { limpiarBusqueda } from "@/lib/util";

const MAX_FILAS = 50000;
const LOTE = 1000;

// Evita que Excel interprete un texto como fórmula (=, +, -, @).
function celda(valor: unknown): string {
  let t = valor === null || valor === undefined ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return `"${t.replace(/"/g, '""')}"`;
}

// Descarga los votantes (con los mismos filtros de la pantalla). Solo el administrador.
export async function GET(request: NextRequest) {
  const perfil = await getPerfil();
  if (!perfil || !perfil.activo || perfil.rol !== "admin") {
    return NextResponse.json({ error: "Solo el administrador puede exportar." }, { status: 403 });
  }
  const p = request.nextUrl.searchParams;
  const q = limpiarBusqueda(p.get("q") ?? "");
  const estado = p.get("estado") ?? "";
  const comuna = p.get("comuna") ?? "";
  const lider = p.get("lider") ?? "";
  const barrio = p.get("barrio") ?? "";

  const supabase = await createClient();
  const filas: string[] = ["Cédula;Nombre;Teléfono;Comuna;Barrio;Puesto;Mesa;Estado;Registrado por;Origen;Fecha;Activo"];

  for (let desde = 0; desde < MAX_FILAS; desde += LOTE) {
    let consulta = supabase
      .from("votantes")
      .select("cedula, nombre_completo, telefono, mesa, estado, origen, activo, created_at, barrios(nombre), puestos_votacion(nombre), comunas(nombre), perfiles!registrado_por(nombre_completo)");
    if (q) consulta = consulta.or(`cedula.ilike.%${q}%,nombre_completo.ilike.%${q}%`);
    if (ESTADOS.includes(estado as never)) consulta = consulta.eq("estado", estado);
    if (/^\d+$/.test(comuna)) consulta = consulta.eq("comuna_id", Number(comuna));
    if (/^[0-9a-f-]{36}$/.test(lider)) consulta = consulta.eq("registrado_por", lider);
    if (/^\d+$/.test(barrio)) consulta = consulta.eq("barrio_id", Number(barrio));
    const { data, error } = await consulta.order("id").range(desde, desde + LOTE - 1);
    if (error) return NextResponse.json({ error: "No se pudo generar el archivo." }, { status: 500 });
    const lote = (data ?? []) as unknown as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (const v of lote) {
      filas.push(
        [
          v.cedula, v.nombre_completo, v.telefono, v.comunas?.nombre, v.barrios?.nombre, v.puestos_votacion?.nombre,
          v.mesa, v.estado, v.perfiles?.nombre_completo, v.origen, v.created_at, v.activo ? "sí" : "no",
        ].map(celda).join(";"),
      );
    }
    if (lote.length < LOTE) break;
  }

  await supabase.rpc("anotar_actividad", { p_accion: "Exportó la lista de votantes", p_detalle: { filas: filas.length - 1 } });
  const hoy = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + filas.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="votantes-${hoy}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
