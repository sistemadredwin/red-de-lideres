"use server";

import type { EstadoForm } from "@/lib/tipos";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export async function registrarPorQr(token: string, _anterior: EstadoForm, datos: FormData): Promise<EstadoForm> {
  if (!/^[a-f0-9]{40}$/.test(token)) return { error: "Este código QR no es válido o ya no está activo." };
  const cedula = String(datos.get("cedula") ?? "").replace(/\D/g, "");
  const nombre = String(datos.get("nombre") ?? "").trim();
  const telefono = String(datos.get("telefono") ?? "").trim();
  const barrioId = Number(datos.get("barrio_id"));
  const puestoId = Number(datos.get("puesto_id"));
  const mesa = String(datos.get("mesa") ?? "").trim();
  if (!/^\d{6,10}$/.test(cedula)) return { error: "La cédula debe tener entre 6 y 10 números." };
  if (!nombre || nombre.length > 200) return { error: "Escribe el nombre completo (máximo 200 caracteres)." };
  if (!Number.isInteger(barrioId) || !Number.isInteger(puestoId)) return { error: "Selecciona un barrio y un puesto de votación." };
  if (datos.get("autorizo") !== "on") return { error: "Debes autorizar el tratamiento de tus datos para registrarte." };

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("registrar_votante_qr", {
    p_token: token,
    p_cedula: cedula,
    p_nombre: nombre,
    p_telefono: telefono || null,
    p_barrio_id: barrioId,
    p_puesto_id: puestoId,
    p_mesa: mesa || null,
    p_autorizo: true,
  });
  if (error) return { error: `No se pudo enviar el registro: ${error.message}` };
  if (data?.resultado === "recibido") return { error: "" };
  if (data?.resultado === "demasiados_intentos") return { error: "Se alcanzó el límite temporal de registros. Inténtalo más tarde." };
  return { error: `No se pudo registrar: ${data?.motivo ?? "verifica los datos e inténtalo nuevamente."}` };
}
