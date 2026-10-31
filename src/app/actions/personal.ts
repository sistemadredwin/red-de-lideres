"use server";

import { revalidatePath } from "next/cache";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailDeUsuario } from "@/lib/supabase/env";
import { ROLES_CON_ACCESO, type Rol } from "@/lib/types";
import { DIAS_CLAVE, cedulaValida, claveTemporal, codigoAcceso, normalizarUsuario, soloDigitos, usuarioValido } from "@/lib/util";

export interface RespuestaPersona {
  ok: boolean;
  error?: string;
  claveTemporal?: string;
  nombre?: string;
  usuario?: string;
}

export interface DatosPersona {
  nombre: string;
  cedula: string;
  telefono: string;
  usuario: string; // vacío = se genera uno
  rol: Rol;
  g8: boolean;
  comunaId: number | null;
  supervisorId: string | null;
  meta: number | null;
}

const ROLES_VALIDOS: Rol[] = [
  "admin", "coordinador", "lider_comuna", "lider_barrio", "logistica",
  "administrativo", "publicidad", "redes", "aspirante_consejo", "aspirante_edil",
];

const PREFIJO: Partial<Record<Rol, string>> = { admin: "ADM", coordinador: "COO", lider_comuna: "LID", lider_barrio: "LID" };

// Crea a una persona del equipo con su código de acceso (que NO es la cédula).
// Si su rol entra al sistema, también crea su cuenta con una contraseña temporal
// que se muestra una sola vez y que debe cambiar al entrar.
export async function crearPersona(d: DatosPersona): Promise<RespuestaPersona> {
  await requirePerfil(["admin"]); // solo el administrador

  const cedula = soloDigitos(d.cedula);
  if (!d.nombre.trim()) return { ok: false, error: "Escribe el nombre completo." };
  if (!cedulaValida(cedula)) return { ok: false, error: "La cédula debe tener entre 6 y 10 números." };
  if (!ROLES_VALIDOS.includes(d.rol)) return { ok: false, error: "Rol no válido." };
  if ((d.rol === "coordinador" || d.rol === "lider_comuna") && !d.comunaId) return { ok: false, error: "Este rol necesita una comuna." };
  if (d.rol === "lider_barrio" && !d.supervisorId) return { ok: false, error: "Un líder de barrio debe depender de un líder de comuna." };
  const meta = d.meta ?? 20;
  if (!Number.isInteger(meta) || meta < 0 || meta > 100000) return { ok: false, error: "La meta debe ser un número entre 0 y 100.000." };

  let usuario = normalizarUsuario(d.usuario);
  if (usuario) {
    if (!usuarioValido(usuario)) return { ok: false, error: "El código de acceso lleva de 4 a 20 letras, números o guiones." };
    if (usuario.replace(/\D/g, "") === cedula) return { ok: false, error: "El código de acceso no puede ser la cédula." };
  } else {
    usuario = codigoAcceso(PREFIJO[d.rol] ?? "EQP");
  }

  const admin = createAdminClient();
  const { data: existe } = await admin.from("perfiles").select("cedula, usuario").or(`cedula.eq.${cedula},usuario.eq.${usuario}`).limit(1);
  if (existe && existe.length) {
    return { ok: false, error: existe[0].cedula === cedula ? "Ya existe una persona del equipo con esa cédula." : "Ese código de acceso ya está en uso. Prueba con otro." };
  }

  const conAcceso = ROLES_CON_ACCESO.includes(d.rol);
  const clave = conAcceso ? claveTemporal() : undefined;
  let authId: string | null = null;

  if (conAcceso) {
    const { data, error } = await admin.auth.admin.createUser({
      email: emailDeUsuario(usuario),
      password: clave!,
      email_confirm: true,
    });
    if (error || !data.user) return { ok: false, error: "No se pudo crear la cuenta de acceso. Intenta con otro código de acceso." };
    authId = data.user.id;
  }

  const { error: errPerfil } = await admin.from("perfiles").insert({
    auth_id: authId,
    usuario,
    cedula,
    nombre_completo: d.nombre.trim(),
    telefono: d.telefono.trim() || null,
    rol: d.rol,
    grupo: d.g8 ? "G8" : null,
    comuna_id: d.rol === "lider_barrio" ? null : d.comunaId,
    supervisor_id: d.rol === "lider_barrio" ? d.supervisorId : null,
    meta,
    debe_cambiar_clave: conAcceso,
    clave_vence_at: conAcceso && d.rol !== "admin" ? new Date(Date.now() + DIAS_CLAVE * 86_400_000).toISOString() : null,
  });
  if (errPerfil) {
    if (authId) await admin.auth.admin.deleteUser(authId); // deshace la cuenta si el perfil falló
    return { ok: false, error: errPerfil.message.length < 120 ? errPerfil.message : "No se pudo guardar a la persona." };
  }

  const supabase = await createClient();
  await supabase.rpc("anotar_actividad", { p_accion: "Creó a una persona del equipo", p_detalle: { usuario, rol: d.rol } });
  revalidatePath("/", "layout");
  return { ok: true, claveTemporal: clave, nombre: d.nombre.trim(), usuario };
}

// Contraseña temporal nueva para alguien que la olvidó. Además desbloquea la cuenta.
export async function restablecerClave(perfilId: string): Promise<RespuestaPersona> {
  await requirePerfil(["admin"]);
  const admin = createAdminClient();
  const { data: p } = await admin.from("perfiles").select("auth_id, nombre_completo, usuario, rol").eq("id", perfilId).maybeSingle();
  if (!p?.auth_id) return { ok: false, error: "Esta persona no tiene cuenta de acceso." };
  const clave = claveTemporal();
  const { error } = await admin.auth.admin.updateUserById(p.auth_id, { password: clave });
  if (error) return { ok: false, error: "No se pudo restablecer la contraseña." };
  await admin.from("perfiles").update({ debe_cambiar_clave: true }).eq("id", perfilId);
  await admin.from("intentos_login").delete().eq("usuario", p.usuario).eq("ok", false);
  const supabase = await createClient();
  await supabase.rpc("anotar_actividad", { p_accion: "Restableció la contraseña de una persona", p_detalle: { usuario: p.usuario } });
  return { ok: true, claveTemporal: clave, nombre: p.nombre_completo, usuario: p.usuario };
}

export async function cambiarActivoPerfil(perfilId: string, activo: boolean): Promise<{ ok: boolean; error?: string }> {
  await requirePerfil(["admin"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cambiar_activo_perfil", { p_perfil: perfilId, p_activo: activo });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "No se pudo cambiar el estado." };
  revalidatePath("/", "layout");
  return { ok: true };
}
