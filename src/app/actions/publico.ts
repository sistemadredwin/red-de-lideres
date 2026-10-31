"use server";

import { createAnonClient } from "@/lib/supabase/anon";
import { cedulaValida, soloDigitos } from "@/lib/util";
import type { Opcion, ResultadoRegistro } from "@/lib/types";

export interface InfoQr {
  resultado: "ok" | "codigo_invalido";
  lider?: string;
  comuna?: string;
  barrios?: Opcion[];
  puestos?: Opcion[];
}

// Datos para mostrar el formulario del QR (sin sesión).
export async function infoQr(token: string): Promise<InfoQr> {
  if (!/^[a-f0-9]{40}$/.test(token)) return { resultado: "codigo_invalido" };
  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("qr_info", { p_token: token });
  if (error || !data) return { resultado: "codigo_invalido" };
  return data as InfoQr;
}

export interface DatosQr {
  token: string;
  cedula: string;
  nombre: string;
  telefono: string;
  barrioId: number | null;
  puestoId: number | null;
  mesa: string;
  autorizo: boolean;
}

// El votante se registra solo; queda en la lista del líder dueño del QR.
export async function registrarPorQr(d: DatosQr): Promise<ResultadoRegistro> {
  const cedula = soloDigitos(d.cedula);
  if (!cedulaValida(cedula)) return { resultado: "error", motivo: "Escribe tu cédula solo con números, sin puntos." };
  if (!d.nombre.trim()) return { resultado: "error", motivo: "Escribe tu nombre completo." };
  if (!d.barrioId || !d.puestoId) return { resultado: "error", motivo: "Elige tu barrio y tu puesto de votación." };
  if (!d.autorizo) return { resultado: "error", motivo: "Debes autorizar el tratamiento de tus datos para registrarte." };

  const supabase = createAnonClient();
  const { data, error } = await supabase.rpc("registrar_votante_qr", {
    p_token: d.token,
    p_cedula: cedula,
    p_nombre: d.nombre,
    p_telefono: d.telefono,
    p_barrio_id: d.barrioId,
    p_puesto_id: d.puestoId,
    p_mesa: d.mesa,
    p_autorizo: d.autorizo,
  });
  if (error) return { resultado: "error", motivo: "No se pudo completar el registro. Intenta de nuevo." };
  return data as ResultadoRegistro;
}
