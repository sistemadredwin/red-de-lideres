"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { crearClienteAdmin, crearClienteSinSesion } from "@/lib/supabase/admin";
import { obtenerSesion } from "@/lib/sesion";
import type { EstadoForm } from "@/lib/tipos";

const DIAS_VIGENCIA = 7;

export async function cambiarClave(_previo: EstadoForm, datos: FormData): Promise<EstadoForm> {
  const perfil = await obtenerSesion();
  if (!perfil) redirect("/login");

  const nueva = String(datos.get("nueva") ?? "");
  const repetir = String(datos.get("repetir") ?? "");

  if (nueva.length < 12 || nueva.length > 72) return { error: "La contraseña debe tener entre 12 y 72 caracteres." };
  if (!/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) return { error: "Debe tener letras y números." };
  if (nueva.toLowerCase().includes(perfil.usuario.toLowerCase())) {
    return { error: "No puede contener tu código de acceso." };
  }
  if (nueva !== repetir) return { error: "Las dos contraseñas no coinciden." };

  const email = `${perfil.usuario.toLowerCase()}@campana.local`;
  const prueba = await crearClienteSinSesion().auth.signInWithPassword({ email, password: nueva });
  if (!prueba.error) return { error: "La nueva contraseña no puede ser igual a la anterior." };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: "No se pudo cambiar la contraseña. Prueba con otra más larga o distinta." };

  const vence = perfil.rol === "admin" ? null : new Date(Date.now() + DIAS_VIGENCIA * 86_400_000).toISOString();
  const { error: errorPerfil } = await crearClienteAdmin()
    .from("perfiles")
    .update({ debe_cambiar_clave: false, clave_vence_at: vence })
    .eq("id", perfil.id);
  if (errorPerfil) return { error: "La contraseña cambió, pero no se pudo actualizar tu cuenta. Avisa al administrador." };

  redirect("/inicio");
}