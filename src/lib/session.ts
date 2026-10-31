import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Perfil, Rol } from "@/lib/types";

// token_qr no está aquí a propósito: la base de datos no deja leerlo directamente.
const COLUMNAS = "id, cedula, usuario, nombre_completo, rol, grupo, comuna_id, meta, activo";

export interface Sesion {
  estado: "sin_sesion" | "sin_acceso" | "cambiar_clave" | "ok";
  perfil?: Perfil;
  motivo?: "temporal" | "vencida"; // por qué debe cambiar la contraseña
  diasRestantes?: number | null; // días que le quedan a su contraseña (null = no vence)
}

// Estado de quien tiene la sesión abierta. La identidad sale de getUser() (la
// confirma el servidor de Supabase); el estado de la contraseña se lee con la
// llave de servidor porque, mientras la clave está vencida, la base de datos
// le cierra a esa cuenta todo lo demás (mi_id() devuelve nulo).
export const getSesion = cache(async (): Promise<Sesion> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { estado: "sin_sesion" };

  const admin = createAdminClient();
  const { data: est } = await admin
    .from("perfiles")
    .select("activo, debe_cambiar_clave, clave_vence_at")
    .eq("auth_id", auth.user.id)
    .maybeSingle();
  if (!est || !est.activo) return { estado: "sin_acceso" };
  if (est.debe_cambiar_clave) return { estado: "cambiar_clave", motivo: "temporal" };
  if (est.clave_vence_at && new Date(est.clave_vence_at) <= new Date()) return { estado: "cambiar_clave", motivo: "vencida" };

  const { data: perfil } = await supabase.from("perfiles").select(COLUMNAS).eq("auth_id", auth.user.id).maybeSingle();
  if (!perfil) return { estado: "sin_acceso" };
  const dias = est.clave_vence_at ? Math.max(0, Math.ceil((new Date(est.clave_vence_at).getTime() - Date.now()) / 86_400_000)) : null;
  return { estado: "ok", perfil: perfil as Perfil, diasRestantes: dias };
});

// Perfil de quien tiene la sesión abierta (null si no hay sesión, está inactivo o debe cambiar la contraseña).
export async function getPerfil(): Promise<Perfil | null> {
  const s = await getSesion();
  return s.estado === "ok" ? (s.perfil ?? null) : null;
}

// Exige sesión (y, si se indica, uno de los roles). Si no cumple, redirige.
export async function requirePerfil(roles?: Rol[]): Promise<Perfil> {
  const s = await getSesion();
  if (s.estado === "sin_sesion") redirect("/login");
  if (s.estado === "sin_acceso") redirect("/salir?motivo=sin-acceso");
  if (s.estado === "cambiar_clave") redirect("/clave");
  const perfil = s.perfil!;
  if (roles && !roles.includes(perfil.rol)) redirect("/");
  return perfil;
}

// Dirección pública del sitio, para armar el enlace del QR.
export async function getOrigin(): Promise<string> {
  const fija = process.env.NEXT_PUBLIC_SITE_URL;
  if (fija) return fija.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function inicioPorRol(rol: Rol): string {
  if (rol === "admin" || rol === "coordinador") return "/resumen";
  return "/registrar";
}
