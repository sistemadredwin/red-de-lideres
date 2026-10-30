import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import type { Perfil } from "@/lib/tipos";

// Perfil de quien tiene sesión (o null). Se lee con la llave de servidor porque una
// cuenta con la clave vencida no puede leer nada por RLS, ni siquiera su propio perfil.
export const obtenerSesion = cache(async (): Promise<Perfil | null> => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await crearClienteAdmin()
    .from("perfiles")
    .select("id, usuario, nombre_completo, area, rol, grupo, comuna_id, barrio_id, supervisor_id, meta, qr_activo, activo, debe_cambiar_clave, clave_vence_at")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!data || !data.activo) return null;
  return data as Perfil;
});

export function claveVencida(p: Pick<Perfil, "debe_cambiar_clave" | "clave_vence_at">): boolean {
  return p.debe_cambiar_clave || (p.clave_vence_at !== null && new Date(p.clave_vence_at) <= new Date());
}

// Para la pantalla de cambio de clave: basta con tener sesión.
export async function exigirSesion(): Promise<Perfil> {
  const perfil = await obtenerSesion();
  if (!perfil) redirect("/login");
  return perfil;
}

// Para todo lo demás: sesión válida Y clave vigente.
export async function exigirSesionActiva(): Promise<Perfil> {
  const perfil = await exigirSesion();
  if (claveVencida(perfil)) redirect("/cambiar-clave");
  return perfil;
}