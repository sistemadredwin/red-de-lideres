"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { claveVencida } from "@/lib/sesion";
import type { EstadoForm } from "@/lib/tipos";

const MENSAJE_GENERICO = "Código o contraseña incorrectos.";
const VENTANA_MINUTOS = 15;
const MAX_FALLOS_USUARIO = 5;
const MAX_FALLOS_IP = 20;

export async function iniciarSesion(_previo: EstadoForm, datos: FormData): Promise<EstadoForm> {
  const usuario = String(datos.get("usuario") ?? "").trim().toUpperCase();
  const clave = String(datos.get("clave") ?? "");

  if (!/^[A-Z0-9][A-Z0-9-]{3,19}$/.test(usuario) || clave.length < 1 || clave.length > 200) {
    return { error: MENSAJE_GENERICO };
  }

  const cabeceras = await headers();
  const ip = (cabeceras.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconocida";

  const admin = crearClienteAdmin();
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000).toISOString();
  const [porUsuario, porIp] = await Promise.all([
    admin.from("intentos_login").select("id", { count: "exact", head: true })
      .eq("usuario", usuario).eq("ok", false).gte("created_at", desde),
    admin.from("intentos_login").select("id", { count: "exact", head: true })
      .eq("ip", ip).eq("ok", false).gte("created_at", desde),
  ]);
  if ((porUsuario.count ?? 0) >= MAX_FALLOS_USUARIO || (porIp.count ?? 0) >= MAX_FALLOS_IP) {
    return { error: `Demasiados intentos. Espera ${VENTANA_MINUTOS} minutos e inténtalo de nuevo.` };
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${usuario.toLowerCase()}@campana.local`,
    password: clave,
  });

  await admin.from("intentos_login").insert({ usuario, ip, ok: !error });
  if (error || !data.user) return { error: MENSAJE_GENERICO };

  const { data: perfil } = await admin
    .from("perfiles")
    .select("activo, debe_cambiar_clave, clave_vence_at")
    .eq("auth_id", data.user.id)
    .maybeSingle();

  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut();
    return { error: MENSAJE_GENERICO };
  }

  redirect(claveVencida(perfil) ? "/cambiar-clave" : "/inicio");
}