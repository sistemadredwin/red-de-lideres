"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export interface RespuestaCatalogo {
  ok: boolean;
  error?: string;
}

function limpiar(t: string) {
  return t.replace(/\s+/g, " ").trim();
}

function mensaje(error: { code?: string }): string {
  return error.code === "23505" ? "Ya existe uno con ese nombre." : "No se pudo guardar. Intenta de nuevo.";
}

export async function crearComuna(nombre: string): Promise<RespuestaCatalogo> {
  await requirePerfil(["admin"]);
  const n = limpiar(nombre);
  if (!n) return { ok: false, error: "Escribe el nombre." };
  const supabase = await createClient();
  const { error } = await supabase.from("comunas").insert({ nombre: n });
  if (error) return { ok: false, error: mensaje(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function crearBarrios(comunaId: number, nombres: string): Promise<RespuestaCatalogo> {
  await requirePerfil(["admin"]);
  const lista = [...new Set(nombres.split(/\r?\n/).map(limpiar).filter(Boolean))];
  if (!lista.length) return { ok: false, error: "Escribe al menos un barrio (uno por línea)." };
  const supabase = await createClient();
  const { error } = await supabase.from("barrios").upsert(
    lista.map((nombre) => ({ comuna_id: comunaId, nombre })),
    { onConflict: "comuna_id,nombre", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: mensaje(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function crearPuestos(nombres: string): Promise<RespuestaCatalogo> {
  await requirePerfil(["admin"]);
  const lista = [...new Set(nombres.split(/\r?\n/).map(limpiar).filter(Boolean))];
  if (!lista.length) return { ok: false, error: "Escribe al menos un puesto (uno por línea)." };
  const supabase = await createClient();
  const { error } = await supabase.from("puestos_votacion").upsert(
    lista.map((nombre) => ({ nombre })),
    { onConflict: "nombre", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: mensaje(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}
