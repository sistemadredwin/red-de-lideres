"use server";

import { revalidatePath } from "next/cache";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import type { EstadoForm } from "@/lib/tipos";

type FilaImportacion = {
  fila: number;
  cedula: string;
  nombre: string;
  telefono: string;
  barrio: string;
  puesto: string;
  mesa: string;
};
type Resultado = {
  nuevos: number;
  repetidos: number;
  errores: number;
  filas_con_error: Array<{ fila: number; motivo: string }>;
};
export type EstadoImportacion = EstadoForm & { resultado?: Resultado };

export async function importarCsv(_anterior: EstadoImportacion, datos: FormData): Promise<EstadoImportacion> {
  const perfil = await exigirSesionActiva();
  if (perfil.rol !== "admin") return { error: "Solo el administrador puede importar listas." };
  const liderId = String(datos.get("lider_id") ?? "");
  const json = String(datos.get("filas") ?? "");
  if (!liderId) return { error: "Selecciona un líder para asignar los votantes." };
  if (!json || new TextEncoder().encode(json).length > 650_000) return { error: "El archivo está vacío o supera el tamaño permitido." };

  let filasDesconocidas: unknown;
  try {
    filasDesconocidas = JSON.parse(json) as unknown;
  } catch {
    return { error: "No se pudo interpretar el archivo. Revisa que sea un CSV válido." };
  }
  if (!Array.isArray(filasDesconocidas) || filasDesconocidas.length < 1 || filasDesconocidas.length > 2000) {
    return { error: "El archivo debe tener entre 1 y 2.000 filas de datos." };
  }

  const filas: FilaImportacion[] = [];
  for (const [indice, valor] of filasDesconocidas.entries()) {
    if (!valor || typeof valor !== "object") return { error: `La fila ${indice + 1} no tiene un formato válido.` };
    const fila = valor as Record<string, unknown>;
    const strings = ["cedula", "nombre", "telefono", "barrio", "puesto", "mesa"];
    if (strings.some((campo) => typeof fila[campo] !== "string")) {
      return { error: `La fila ${indice + 1} contiene datos no válidos.` };
    }
    if (!Number.isInteger(fila.fila) || (fila.fila as number) < 1) {
      return { error: `La fila ${indice + 1} no tiene un número de fila válido.` };
    }
    const filaValidada = fila as unknown as FilaImportacion;
    if (filaValidada.cedula.length > 20 || filaValidada.nombre.length > 200 ||
      filaValidada.telefono.length > 30 || filaValidada.barrio.length > 150 ||
      filaValidada.puesto.length > 200 || filaValidada.mesa.length > 20) {
      return { error: `La fila ${indice + 1} supera la longitud permitida.` };
    }
    filas.push(filaValidada);
  }

  const supabase = await crearClienteServidor();
  const { data: resultado, error } = await supabase.rpc("importar_votantes", {
    p_lider: liderId,
    p_filas: filas,
    p_autorizo: datos.get("autorizo") === "on",
  });
  if (error) return { error: `No se pudo importar el archivo: ${error.message}` };
  revalidatePath("/inicio");
  revalidatePath("/votantes");
  revalidatePath("/duplicados");
  return { resultado: resultado as Resultado };
}
