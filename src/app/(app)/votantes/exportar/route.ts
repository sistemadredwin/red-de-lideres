import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

type ExportRow = {
  cedula: string;
  nombre_completo: string;
  barrio_id: number;
  puesto_id: number;
  mesa: string | null;
  estado: string;
  registrado_por: string;
};
type Perfil = { id: string; nombre_completo: string; comuna_id: number | null };
type Catalogo = { id: number; nombre: string };

function celdaCsv(valor: string | number | null | undefined): string {
  let texto = String(valor ?? "");
  if (/^[\s]*[=+\-@]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

export async function GET(): Promise<Response> {
  const perfilActual = await exigirSesionActiva();
  if (!["admin", "coordinador"].includes(perfilActual.rol)) {
    return new Response("No autorizado", { status: 403 });
  }
  const supabase = await crearClienteServidor();
  const [votantesQuery, perfilesQuery, barriosQuery, puestosQuery, comunasQuery] = await Promise.all([
    supabase.from("votantes")
      .select("cedula, nombre_completo, barrio_id, puesto_id, mesa, estado, registrado_por")
      .eq("activo", true).order("created_at", { ascending: false }).limit(10000),
    supabase.from("perfiles").select("id, nombre_completo, comuna_id"),
    supabase.from("barrios").select("id, nombre"),
    supabase.from("puestos_votacion").select("id, nombre"),
    supabase.from("comunas").select("id, nombre"),
  ]);
  if (votantesQuery.error) throw new Error(`No se pudieron cargar los votantes para exportar: ${votantesQuery.error.message}`);
  if (perfilesQuery.error) throw new Error(`No se pudieron cargar los líderes para exportar: ${perfilesQuery.error.message}`);
  if (barriosQuery.error) throw new Error(`No se pudieron cargar los barrios para exportar: ${barriosQuery.error.message}`);
  if (puestosQuery.error) throw new Error(`No se pudieron cargar los puestos para exportar: ${puestosQuery.error.message}`);
  if (comunasQuery.error) throw new Error(`No se pudieron cargar las comunas para exportar: ${comunasQuery.error.message}`);

  const perfiles = new Map(((perfilesQuery.data ?? []) as Perfil[]).map((persona) => [persona.id, persona]));
  const barrios = new Map(((barriosQuery.data ?? []) as Catalogo[]).map((barrio) => [barrio.id, barrio.nombre]));
  const puestos = new Map(((puestosQuery.data ?? []) as Catalogo[]).map((puesto) => [puesto.id, puesto.nombre]));
  const comunas = new Map(((comunasQuery.data ?? []) as Catalogo[]).map((comuna) => [comuna.id, comuna.nombre]));
  const cabecera = ["cedula", "nombre", "comuna", "barrio", "puesto", "mesa", "registrado_por", "estado"];
  const filas = ((votantesQuery.data ?? []) as ExportRow[]).map((votante) => {
    const lider = perfiles.get(votante.registrado_por);
    return [
      votante.cedula, votante.nombre_completo,
      lider?.comuna_id ? comunas.get(lider.comuna_id) : "",
      barrios.get(votante.barrio_id), puestos.get(votante.puesto_id),
      votante.mesa, lider?.nombre_completo, votante.estado,
    ].map(celdaCsv).join(";");
  });
  const contenido = `\uFEFF${[cabecera.map(celdaCsv).join(";"), ...filas].join("\r\n")}`;
  return new Response(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="votantes.csv"',
      "Cache-Control": "no-store",
    },
  });
}
