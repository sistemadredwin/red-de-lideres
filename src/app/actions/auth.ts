"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAnonClient } from "@/lib/supabase/anon";
import { emailDeUsuario, configuracionCompleta } from "@/lib/supabase/env";
import { DIAS_CLAVE, errorDeClave, normalizarUsuario, usuarioValido } from "@/lib/util";

export interface EstadoLogin {
  error?: string;
}

const MAX_FALLOS_USUARIO = 5; // seguidos, por código de acceso
const MAX_FALLOS_IP = 30; // por dirección, en la ventana
const MINUTOS_BLOQUEO = 15;
const MENSAJE_GENERICO = "Código de acceso o contraseña incorrectos.";

async function ipDelCliente(): Promise<string | null> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return (xff ? xff.split(",")[0].trim() : h.get("x-real-ip"))?.slice(0, 64) ?? null;
}

// Inicio de sesión con código de acceso. Cada intento queda en intentos_login.
// 5 fallos seguidos con el mismo código bloquean ese código 15 minutos; muchos
// fallos desde una misma dirección bloquean esa dirección.
export async function iniciarSesion(_previo: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  if (!configuracionCompleta()) {
    return { error: "La aplicación aún no está conectada a Supabase. Falta configurar las variables de entorno." };
  }
  const usuario = normalizarUsuario(String(formData.get("usuario") ?? ""));
  const clave = String(formData.get("clave") ?? "");
  if (!usuarioValido(usuario) || !clave || clave.length > 200) return { error: MENSAJE_GENERICO };

  const admin = createAdminClient();
  const ip = await ipDelCliente();
  const desde = new Date(Date.now() - MINUTOS_BLOQUEO * 60_000).toISOString();

  // ¿Bloqueado? Se cuentan los fallos recientes, hasta el último acierto.
  const { data: recientes } = await admin
    .from("intentos_login")
    .select("ok")
    .eq("usuario", usuario)
    .gt("created_at", desde)
    .order("id", { ascending: false })
    .limit(MAX_FALLOS_USUARIO);
  let seguidos = 0;
  for (const r of recientes ?? []) {
    if (r.ok) break;
    seguidos++;
  }
  let bloqueadoPorIp = false;
  if (ip) {
    const { count } = await admin
      .from("intentos_login")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("ok", false)
      .gt("created_at", desde);
    bloqueadoPorIp = (count ?? 0) >= MAX_FALLOS_IP;
  }
  if (seguidos >= MAX_FALLOS_USUARIO || bloqueadoPorIp) {
    return { error: "Acceso bloqueado por varios intentos fallidos. Espera unos minutos o pide ayuda a la administración." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: emailDeUsuario(usuario), password: clave });
  await admin.from("intentos_login").insert({ usuario, ip, ok: !error });

  if (error) {
    if (error.status === 429) return { error: "Demasiados intentos. Espera unos minutos antes de volver a intentarlo." };
    return { error: MENSAJE_GENERICO };
  }
  redirect("/");
}

export interface EstadoClave {
  ok?: boolean;
  error?: string;
}

// Cambio de contraseña (voluntario, o forzado cuando es temporal o venció).
// Pide la contraseña actual; solo aquí se reinicia el plazo de 7 días.
export async function cambiarMiClave(_previo: EstadoClave, formData: FormData): Promise<EstadoClave> {
  const actual = String(formData.get("actual") ?? "");
  const nueva = String(formData.get("nueva") ?? "");
  const repetir = String(formData.get("repetir") ?? "");
  const forzado = formData.get("forzado") === "1";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.email) return { error: "Tu sesión terminó. Entra de nuevo." };

  const errClave = errorDeClave(nueva);
  if (errClave) return { error: errClave };
  if (nueva !== repetir) return { error: "Las dos contraseñas no coinciden." };
  if (nueva === actual) return { error: "La contraseña nueva debe ser distinta de la actual." };

  // Comprueba la contraseña actual con un cliente aparte (no toca la sesión abierta).
  const { error: errActual } = await createAnonClient().auth.signInWithPassword({ email: auth.user.email, password: actual });
  if (errActual) return { error: "La contraseña actual no es correcta." };

  const admin = createAdminClient();
  const { data: p } = await admin.from("perfiles").select("id, rol").eq("auth_id", auth.user.id).maybeSingle();
  if (!p) return { error: "No se encontró tu cuenta." };

  const { error: errCambio } = await admin.auth.admin.updateUserById(auth.user.id, { password: nueva });
  if (errCambio) return { error: "No se pudo cambiar la contraseña. Intenta de nuevo." };

  await admin
    .from("perfiles")
    .update({
      debe_cambiar_clave: false,
      clave_vence_at: p.rol === "admin" ? null : new Date(Date.now() + DIAS_CLAVE * 86_400_000).toISOString(),
    })
    .eq("id", p.id);
  await admin.from("actividad").insert({ usuario_id: p.id, accion: "Cambió su contraseña", detalle: {} });

  revalidatePath("/", "layout");
  if (forzado) redirect("/");
  return { ok: true };
}
