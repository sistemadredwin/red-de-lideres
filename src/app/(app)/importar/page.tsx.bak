import { redirect } from "next/navigation";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import ImportadorCsv from "./ImportadorCsv";

type LiderFila = { id: string; nombre_completo: string; comuna_id: number | null };
type Comuna = { id: number; nombre: string };

export default async function PaginaImportar() {
  const perfil = await exigirSesionActiva();
  if (perfil.rol !== "admin") redirect("/inicio");
  const supabase = await crearClienteServidor();
  const [lideresQuery, comunasQuery] = await Promise.all([
    supabase.from("perfiles").select("id, nombre_completo, comuna_id")
      .in("rol", ["lider_comuna", "lider_barrio"]).eq("activo", true).order("nombre_completo"),
    supabase.from("comunas").select("id, nombre"),
  ]);
  if (lideresQuery.error) throw new Error(`No se pudieron cargar los líderes: ${lideresQuery.error.message}`);
  if (comunasQuery.error) throw new Error(`No se pudieron cargar las comunas: ${comunasQuery.error.message}`);
  const comunas = new Map(((comunasQuery.data ?? []) as Comuna[]).map((comuna) => [comuna.id, comuna.nombre]));
  const lideres = ((lideresQuery.data ?? []) as LiderFila[]).map((lider) => ({
    id: lider.id,
    nombre_completo: lider.nombre_completo,
    comuna: lider.comuna_id ? comunas.get(lider.comuna_id) ?? "Sin comuna" : "Sin comuna",
  }));

  return (
    <>
      <h1>Importar lista</h1>
      <p className="subtitulo">Carga registros autorizados desde un CSV exportado de Excel.</p>
      <ImportadorCsv lideres={lideres} />
    </>
  );
}
