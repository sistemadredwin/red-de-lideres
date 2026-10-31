"use server";

import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { normalizarNombre, type FilaExcel } from "@/lib/excel";
import { cedulaValida } from "@/lib/util";

export interface FilaRevisada {
  fila: number;
  cedula: string;
  nombre: string;
  barrio: string;
  puesto: string;
  estado: "nueva" | "repetida" | "error";
  motivo: string;
}

export interface Revision {
  ok: boolean;
  error?: string;
  filas?: FilaRevisada[];
}

// Revisa el Excel contra la base de datos ANTES de importar, para que el
// administrador vea qué filas son nuevas, cuáles repetidas y cuáles tienen errores.
export async function revisarImportacion(liderId: string, filas: FilaExcel[]): Promise<Revision> {
  await requirePerfil(["admin"]);
  if (!filas.length) return { ok: false, error: "El archivo no tiene filas con datos." };
  if (filas.length > 20000) return { ok: false, error: "El archivo tiene más de 20.000 filas. Divídelo en partes." };

  const supabase = await createClient();
  const { data: lider } = await supabase.from("perfiles").select("comuna_id").eq("id", liderId).in("rol", ["lider_comuna", "lider_barrio"]).maybeSingle();
  if (!lider) return { ok: false, error: "Elige un líder válido." };

  const [{ data: barrios }, { data: puestos }] = await Promise.all([
    supabase.from("barrios").select("nombre").eq("comuna_id", lider.comuna_id),
    supabase.from("puestos_votacion").select("nombre"),
  ]);
  const barriosOk = new Set((barrios ?? []).map((b) => normalizarNombre(b.nombre)));
  const puestosOk = new Set((puestos ?? []).map((p) => normalizarNombre(p.nombre)));

  // Cédulas que ya existen en la base de datos (en lotes, para no armar direcciones enormes)
  const candidatas = [...new Set(filas.map((f) => f.cedula).filter(cedulaValida))];
  const existentes = new Map<string, string>();
  for (let i = 0; i < candidatas.length; i += 400) {
    const { data, error } = await supabase
      .from("votantes")
      .select("cedula, perfiles!registrado_por(nombre_completo)")
      .in("cedula", candidatas.slice(i, i + 400));
    if (error) return { ok: false, error: "No se pudo revisar contra la base de datos. Intenta de nuevo." };
    for (const v of (data ?? []) as unknown as { cedula: string; perfiles: { nombre_completo: string } | null }[]) {
      existentes.set(v.cedula, v.perfiles?.nombre_completo ?? "otro líder");
    }
  }

  const vistas = new Set<string>();
  const revisadas: FilaRevisada[] = filas.map((f) => {
    const base = { fila: f.fila, cedula: f.cedula, nombre: f.nombre, barrio: f.barrio, puesto: f.puesto };
    if (!cedulaValida(f.cedula)) return { ...base, estado: "error", motivo: "Cédula inválida" };
    if (!f.nombre) return { ...base, estado: "error", motivo: "Falta el nombre" };
    if (!f.barrio) return { ...base, estado: "error", motivo: "Falta el barrio" };
    if (!f.puesto) return { ...base, estado: "error", motivo: "Falta el puesto de votación" };
    if (!barriosOk.has(normalizarNombre(f.barrio))) return { ...base, estado: "error", motivo: `Barrio no encontrado: ${f.barrio}` };
    if (!puestosOk.has(normalizarNombre(f.puesto))) return { ...base, estado: "error", motivo: `Puesto no encontrado: ${f.puesto}` };
    if (existentes.has(f.cedula)) return { ...base, estado: "repetida", motivo: `Ya registrada por ${existentes.get(f.cedula)}` };
    if (vistas.has(f.cedula)) return { ...base, estado: "repetida", motivo: "Repetida dentro del archivo" };
    vistas.add(f.cedula);
    return { ...base, estado: "nueva", motivo: "" };
  });
  return { ok: true, filas: revisadas };
}
