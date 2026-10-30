"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { ETIQUETA_ROL, type EstadoForm, type Rol } from "@/lib/tipos";

export type EstadoPersonal = EstadoForm & {
  credenciales?: { usuario: string; clave: string };
  aviso?: string;
};

const ROLES = Object.keys(ETIQUETA_ROL).filter((rol) => rol !== "admin") as Exclude<Rol, "admin">[];
const ROLES_CON_ACCESO: Rol[] = ["coordinador", "lider_comuna", "lider_barrio"];
const ROLES_CON_COMUNA: Rol[] = ["coordinador", "lider_comuna"];

function claveTemporal(usuario: string): string {
  let clave = "";
  do {
    const aleatoria = randomBytes(24).toString("base64url");
    clave = `${aleatoria.slice(0, 20)}A7${aleatoria.slice(20)}`;
  } while (clave.toLowerCase().includes(usuario.toLowerCase()));
  return clave;
}

async function exigirAdmin(): Promise<void> {
  const perfil = await exigirSesionActiva();
  if (perfil.rol !== "admin") throw new Error("Solo el administrador puede gestionar al personal.");
}

export async function crearPersona(_anterior: EstadoPersonal, datos: FormData): Promise<EstadoPersonal> {
  await exigirAdmin();
  const nombre = String(datos.get("nombre") ?? "").trim();
  const area = String(datos.get("area") ?? "").trim();
  const usuario = String(datos.get("usuario") ?? "").trim().toUpperCase();
  const cedula = String(datos.get("cedula") ?? "").replace(/\D/g, "");
  const rol = String(datos.get("rol") ?? "") as Rol;
  const grupoTexto = String(datos.get("grupo") ?? "");
  const comunaTexto = String(datos.get("comuna_id") ?? "");
  const supervisorId = String(datos.get("supervisor_id") ?? "") || null;
  const meta = Number(datos.get("meta") || 20);
  const comunaId = comunaTexto ? Number(comunaTexto) : null;

  if (nombre.length < 2 || nombre.length > 200) return { error: "El nombre debe tener entre 2 y 200 caracteres." };
  if (area.length > 120) return { error: "La zona o área no puede superar 120 caracteres." };
  if (!/^[A-Z0-9][A-Z0-9-]{3,19}$/.test(usuario)) return { error: "El código debe tener entre 4 y 20 letras mayúsculas, números o guiones." };
  if (!/^\d{6,10}$/.test(cedula)) return { error: "La cédula debe tener entre 6 y 10 números." };
  if (usuario === cedula) return { error: "El código de acceso debe ser diferente de la cédula." };
  if (!ROLES.includes(rol as Exclude<Rol, "admin">)) return { error: "Selecciona un rol válido." };
  if (grupoTexto && grupoTexto !== "G8") return { error: "El grupo solo puede ser G8 o quedar vacío." };
  if (ROLES_CON_COMUNA.includes(rol) && (!Number.isInteger(comunaId) || !comunaId)) {
    return { error: "Selecciona la comuna para este rol." };
  }
  if (rol === "lider_barrio" && !supervisorId) return { error: "Selecciona el líder de comuna supervisor." };
  if (supervisorId && rol !== "lider_barrio") return { error: "El supervisor solo se asigna a un líder de barrio." };
  if ((rol === "lider_comuna" || rol === "lider_barrio") && (!Number.isInteger(meta) || meta < 1 || meta > 100000)) {
    return { error: "La meta debe estar entre 1 y 100.000." };
  }

  const admin = crearClienteAdmin();
  const [usuarioExistente, cedulaExistente] = await Promise.all([
    admin.from("perfiles").select("id").eq("usuario", usuario).maybeSingle(),
    admin.from("perfiles").select("id").eq("cedula", cedula).maybeSingle(),
  ]);
  if (usuarioExistente.error) return { error: `No se pudo validar el código: ${usuarioExistente.error.message}` };
  if (cedulaExistente.error) return { error: `No se pudo validar la cédula: ${cedulaExistente.error.message}` };
  if (usuarioExistente.data) return { error: "Ese código de acceso ya está asignado." };
  if (cedulaExistente.data) return { error: "Esa cédula ya pertenece a otra persona del equipo." };

  let comunaFinal = comunaId;
  if (supervisorId) {
    const { data: supervisor, error } = await admin.from("perfiles")
      .select("id, rol, comuna_id, activo").eq("id", supervisorId).maybeSingle();
    if (error) return { error: `No se pudo validar el supervisor: ${error.message}` };
    if (!supervisor || !supervisor.activo || supervisor.rol !== "lider_comuna") {
      return { error: "El supervisor debe ser un líder de comuna activo." };
    }
    comunaFinal = supervisor.comuna_id;
  }

  const debeCrearAcceso = ROLES_CON_ACCESO.includes(rol);
  const clave = debeCrearAcceso ? claveTemporal(usuario) : "";
  const email = `${usuario.toLowerCase()}@campana.local`;
  let authId: string | null = null;
  if (debeCrearAcceso) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: clave,
      email_confirm: true,
    });
    if (error) return { error: `No se pudo crear el acceso de Supabase: ${error.message}` };
    authId = data.user.id;
  }

  const { data: nuevoPerfil, error: errorPerfil } = await admin.from("perfiles").insert({
    auth_id: authId,
    usuario,
    cedula,
    nombre_completo: nombre,
    area: area || null,
    rol,
    grupo: grupoTexto || null,
    comuna_id: comunaFinal,
    supervisor_id: supervisorId,
    meta: rol === "lider_comuna" || rol === "lider_barrio" ? meta : 0,
    debe_cambiar_clave: debeCrearAcceso,
    clave_vence_at: null,
    activo: true,
  }).select("id").single();
  if (errorPerfil) {
    if (authId) {
      const { error: errorLimpieza } = await admin.auth.admin.deleteUser(authId);
      if (errorLimpieza) {
        return { error: `No se pudo crear el perfil (${errorPerfil.message}) ni limpiar su cuenta de acceso (${errorLimpieza.message}). Avisa al administrador.` };
      }
    }
    return { error: `No se pudo crear el perfil: ${errorPerfil.message}` };
  }

  const supabase = await crearClienteServidor();
  const { error: errorActividad } = await supabase.rpc("anotar_actividad", {
    p_accion: "Agregó una persona al equipo",
    p_detalle: { perfil: nuevoPerfil.id, rol: ETIQUETA_ROL[rol] },
  });
  revalidatePath("/personal");
  revalidatePath("/inicio");
  return {
    credenciales: debeCrearAcceso ? { usuario, clave } : undefined,
    aviso: errorActividad ? `La persona quedó creada, pero no se pudo registrar la acción: ${errorActividad.message}` : undefined,
  };
}

export async function restablecerClave(datos: FormData): Promise<EstadoPersonal> {
  await exigirAdmin();
  const perfilId = String(datos.get("perfil_id") ?? "");
  if (!perfilId) return { error: "Selecciona un perfil válido." };
  const admin = crearClienteAdmin();
  const { data: perfil, error: errorPerfil } = await admin.from("perfiles")
    .select("id, usuario, auth_id, activo").eq("id", perfilId).maybeSingle();
  if (errorPerfil) return { error: `No se pudo cargar el perfil: ${errorPerfil.message}` };
  if (!perfil || !perfil.auth_id || !perfil.activo) return { error: "La persona no tiene un acceso activo para restablecer." };

  const clave = claveTemporal(perfil.usuario);
  const { error: errorAuth } = await admin.auth.admin.updateUserById(perfil.auth_id, { password: clave });
  if (errorAuth) return { error: `No se pudo restablecer la contraseña: ${errorAuth.message}` };
  const { error: errorActualizar } = await admin.from("perfiles")
    .update({ debe_cambiar_clave: true, clave_vence_at: null }).eq("id", perfil.id);
  if (errorActualizar) {
    revalidatePath("/personal");
    return {
      credenciales: { usuario: perfil.usuario, clave },
      aviso: `La clave temporal ya está activa, pero no se pudo exigir el cambio al ingresar: ${errorActualizar.message}`,
    };
  }

  const supabase = await crearClienteServidor();
  const { error: errorActividad } = await supabase.rpc("anotar_actividad", {
    p_accion: "Restableció una contraseña",
    p_detalle: { perfil: perfil.id },
  });
  revalidatePath("/personal");
  return {
    credenciales: { usuario: perfil.usuario, clave },
    aviso: errorActividad ? `La contraseña se restableció, pero no se pudo registrar la acción: ${errorActividad.message}` : undefined,
  };
}

export async function cambiarActivoPersona(datos: FormData): Promise<void> {
  const admin = await exigirSesionActiva();
  if (admin.rol !== "admin") throw new Error("Solo el administrador puede activar o desactivar personas.");
  const perfilId = String(datos.get("perfil_id") ?? "");
  const activo = datos.get("activo") === "true";
  if (!perfilId) throw new Error("Selecciona un perfil válido.");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_activo_perfil", { p_perfil: perfilId, p_activo: activo });
  if (error) throw new Error(`No se pudo actualizar el perfil: ${error.message}`);
  revalidatePath("/personal");
  revalidatePath("/inicio");
}
