"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cedulaValida, soloDigitos } from "@/lib/util";
import type { Estado, ResultadoRegistro } from "@/lib/types";

export interface Respuesta {
  ok: boolean;
  error?: string;
}

function mensajeDeError(error: { code?: string; message: string }): string {
  if (error.code === "42501") return "No tienes permiso para hacer esto.";
  if (error.code === "28000") return "Tu sesión terminó. Vuelve a iniciar sesión.";
  // Los mensajes que escribió la base de datos ya vienen en español.
  if (error.code === "P0001") return error.message;
  return "No se pudo completar la acción. Intenta de nuevo.";
}

function refrescar() {
  revalidatePath("/", "layout");
}

// ---------- registro ----------
export interface DatosRegistro {
  cedula: string;
  nombre: string;
  telefono: string;
  barrioId: number | null;
  puestoId: number | null;
  mesa: string;
  autorizo: boolean;
  liderId?: string | null;
}

export async function registrarVotante(datos: DatosRegistro): Promise<ResultadoRegistro | { resultado: "error"; motivo: string }> {
  const cedula = soloDigitos(datos.cedula);
  if (!cedulaValida(cedula)) return { resultado: "error", motivo: "La cédula debe tener entre 6 y 10 números, sin puntos ni espacios." };
  if (!datos.nombre.trim()) return { resultado: "error", motivo: "Escribe el nombre completo." };
  if (!datos.barrioId) return { resultado: "error", motivo: "Elige el barrio." };
  if (!datos.puestoId) return { resultado: "error", motivo: "Elige el puesto de votación." };
  if (!datos.autorizo) return { resultado: "error", motivo: "Marca que la persona autorizó el tratamiento de sus datos." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_votante", {
    p_cedula: cedula,
    p_nombre: datos.nombre,
    p_telefono: datos.telefono,
    p_barrio_id: datos.barrioId,
    p_puesto_id: datos.puestoId,
    p_mesa: datos.mesa,
    p_autorizo: datos.autorizo,
    p_lider_id: datos.liderId ?? null,
  });
  if (error) return { resultado: "error", motivo: mensajeDeError(error) };
  refrescar();
  return data as ResultadoRegistro;
}

// Aviso en vivo mientras se escribe la cédula.
export async function cedulaExiste(cedula: string): Promise<boolean | null> {
  const limpia = soloDigitos(cedula);
  if (!cedulaValida(limpia)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cedula_existe", { p_cedula: limpia });
  if (error) return null;
  return data as boolean;
}

// ---------- votantes ----------
export async function cambiarEstado(votanteId: number, estado: Estado): Promise<Respuesta> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_estado_votante", { p_votante: votanteId, p_estado: estado });
  if (error) return { ok: false, error: mensajeDeError(error) };
  refrescar();
  return { ok: true };
}

export async function cambiarActivoVotante(votanteId: number, activo: boolean): Promise<Respuesta> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_activo_votante", { p_votante: votanteId, p_activo: activo });
  if (error) return { ok: false, error: mensajeDeError(error) };
  refrescar();
  return { ok: true };
}

// ---------- metas y QR ----------
export async function cambiarMeta(perfilId: string, meta: number): Promise<Respuesta> {
  if (!Number.isInteger(meta) || meta < 1 || meta > 100000) {
    return { ok: false, error: "La meta debe ser un número entre 1 y 100.000." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_meta", { p_perfil: perfilId, p_meta: meta });
  if (error) return { ok: false, error: mensajeDeError(error) };
  refrescar();
  return { ok: true };
}

// El QR de cada líder es fijo y no se puede cambiar; el administrador solo lo pausa o reactiva.
export async function cambiarQrActivo(perfilId: string, activo: boolean): Promise<Respuesta> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_qr_activo", { p_perfil: perfilId, p_activo: activo });
  if (error) return { ok: false, error: mensajeDeError(error) };
  refrescar();
  return { ok: true };
}

// ---------- duplicados ----------
export async function revisarDuplicado(id: number, revisado: boolean): Promise<Respuesta> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revisar_duplicado", { p_id: id, p_revisado: revisado });
  if (error) return { ok: false, error: mensajeDeError(error) };
  refrescar();
  return { ok: true };
}

// ---------- importación de Excel ----------
export interface FilaImportar {
  fila: number;
  cedula: string;
  nombre: string;
  telefono: string;
  barrio: string;
  puesto: string;
  mesa: string;
}

export interface ResultadoImportacion {
  ok: boolean;
  error?: string;
  nuevos?: number;
  repetidos?: number;
  errores?: number;
  filas_con_error?: { fila: number; motivo: string }[];
}

const LOTE = 2000;

export async function importarVotantes(liderId: string, filas: FilaImportar[], autorizo: boolean): Promise<ResultadoImportacion> {
  if (!autorizo) return { ok: false, error: "Debes confirmar la autorización de datos." };
  if (!filas.length) return { ok: false, error: "No hay filas para importar." };
  if (filas.length > 20000) return { ok: false, error: "El archivo tiene más de 20.000 filas. Divídelo en partes." };

  const supabase = await createClient();
  const total: ResultadoImportacion = { ok: true, nuevos: 0, repetidos: 0, errores: 0, filas_con_error: [] };
  for (let i = 0; i < filas.length; i += LOTE) {
    const { data, error } = await supabase.rpc("importar_votantes", {
      p_lider: liderId,
      p_filas: filas.slice(i, i + LOTE),
      p_autorizo: autorizo,
    });
    if (error) {
      return { ...total, ok: false, error: `${mensajeDeError(error)} Ya se procesaron ${i} filas.` };
    }
    const r = data as { nuevos: number; repetidos: number; errores: number; filas_con_error: { fila: number; motivo: string }[] };
    total.nuevos! += r.nuevos;
    total.repetidos! += r.repetidos;
    total.errores! += r.errores;
    total.filas_con_error!.push(...r.filas_con_error);
  }
  refrescar();
  return total;
}
