"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoForm } from "@/lib/tipos";

const ESTADOS = ["por_contactar", "contactado", "confirmado"] as const;

export async function registrarVotante(_anterior: EstadoForm, datos: FormData): Promise<EstadoForm> {
  const perfil = await exigirSesionActiva();
  if (!["lider_comuna", "lider_barrio"].includes(perfil.rol)) {
    return { error: "Tu rol no puede registrar votantes." };
  }

  const cedula = String(datos.get("cedula") ?? "").replace(/\D/g, "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  const telefono = String(datos.get("telefono") ?? "").trim();
  const barrioId = Number(datos.get("barrio_id"));
  const puestoId = Number(datos.get("puesto_id"));
  const mesa = String(datos.get("mesa") ?? "").trim();
  const autorizo = datos.get("autorizo") === "on";

  if (!/^\d{6,10}$/.test(cedula)) return { error: "La cédula debe tener entre 6 y 10 números." };
  if (!nombre || nombre.length > 200) return { error: "Escribe el nombre completo (máximo 200 caracteres)." };
  if (!Number.isInteger(barrioId) || !Number.isInteger(puestoId)) return { error: "Selecciona un barrio y un puesto de votación." };
  if (!autorizo) return { error: "Confirma que la persona autorizó el tratamiento de sus datos." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("registrar_votante", {
    p_cedula: cedula,
    p_nombre: nombre,
    p_telefono: telefono || null,
    p_barrio_id: barrioId,
    p_puesto_id: puestoId,
    p_mesa: mesa || null,
    p_autorizo: true,
    p_lider_id: null,
  });
  if (error) return { error: `No se pudo guardar el registro: ${error.message}` };
  if (data?.resultado === "duplicado") return { error: "Esta cédula ya está registrada. No se creó otro registro." };
  if (data?.resultado !== "ok") return { error: `No se guardó el registro: ${data?.motivo ?? "verifica los datos e inténtalo de nuevo."}` };

  revalidatePath("/inicio");
  revalidatePath("/mis-votantes");
  redirect("/mis-votantes");
}

export async function cambiarEstadoVotante(datos: FormData): Promise<void> {
  const perfil = await exigirSesionActiva();
  if (!["admin", "lider_comuna", "lider_barrio"].includes(perfil.rol)) {
    throw new Error("Tu rol no puede modificar el estado de votantes.");
  }
  const id = Number(datos.get("id"));
  const estado = String(datos.get("estado") ?? "");
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("El identificador del votante no es válido.");
  if (!ESTADOS.includes(estado as (typeof ESTADOS)[number])) throw new Error("El estado seleccionado no es válido.");

  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_estado_votante", {
    p_votante: id,
    p_estado: estado,
  });
  if (error) throw new Error(`No se pudo actualizar el estado: ${error.message}`);
  revalidatePath("/mis-votantes");
  revalidatePath("/votantes");
  revalidatePath("/inicio");
}

export async function cambiarMeta(datos: FormData): Promise<void> {
  const perfil = await exigirSesionActiva();
  const id = String(datos.get("perfil_id") ?? "");
  const meta = Number(datos.get("meta"));
  if (!id || !Number.isInteger(meta) || meta < 1 || meta > 100000) {
    throw new Error("La meta debe ser un número entero entre 1 y 100.000.");
  }
  if (perfil.rol !== "admin" && perfil.id !== id) throw new Error("Solo puedes cambiar tu propia meta.");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_meta", { p_perfil: id, p_meta: meta });
  if (error) throw new Error(`No se pudo guardar la meta: ${error.message}`);
  revalidatePath("/personal");
  revalidatePath("/inicio");
  revalidatePath("/qr");
}

export async function darDeBajaVotante(datos: FormData): Promise<void> {
  await exigirAdmin();
  const id = Number(datos.get("id"));
  const activo = datos.get("activo") === "true";
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("El identificador del votante no es válido.");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_activo_votante", { p_votante: id, p_activo: activo });
  if (error) throw new Error(`No se pudo actualizar el votante: ${error.message}`);
  revalidatePath("/votantes");
  revalidatePath("/inicio");
}

export async function verificarVotante(datos: FormData): Promise<void> {
  await exigirAdmin();
  const id = Number(datos.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("El identificador del votante no es válido.");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("verificar_votante", { p_votante: id });
  if (error) throw new Error(`No se pudo verificar el registro: ${error.message}`);
  revalidatePath("/votantes");
  revalidatePath("/mis-votantes");
}

export async function revisarDuplicado(datos: FormData): Promise<void> {
  await exigirAdmin();
  const id = Number(datos.get("id"));
  const revisado = datos.get("revisado") === "true";
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("El identificador del duplicado no es válido.");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("revisar_duplicado", { p_id: id, p_revisado: revisado });
  if (error) throw new Error(`No se pudo actualizar el duplicado: ${error.message}`);
  revalidatePath("/duplicados");
  revalidatePath("/inicio");
}

export async function cambiarQrActivo(datos: FormData): Promise<void> {
  await exigirAdmin();
  const id = String(datos.get("perfil_id") ?? "");
  const activo = datos.get("activo") === "true";
  if (!id) throw new Error("El perfil del líder no es válido.");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.rpc("cambiar_qr_activo", { p_perfil: id, p_activo: activo });
  if (error) throw new Error(`No se pudo actualizar el código QR: ${error.message}`);
  revalidatePath("/qr");
}

async function exigirAdmin(): Promise<void> {
  const perfil = await exigirSesionActiva();
  if (perfil.rol !== "admin") throw new Error("Solo el administrador puede realizar esta acción.");
}
