import Encabezado from "@/components/Encabezado";
import ImportarExcel from "@/components/ImportarExcel";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Importar lista · Red de Líderes" };

export default async function Importar() {
  await requirePerfil(["admin"]);
  const supabase = await createClient();
  const [{ data: lideres }, { data: comunas }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre_completo, comuna_id").in("rol", ["lider_comuna", "lider_barrio"]).eq("activo", true).order("nombre_completo"),
    supabase.from("comunas").select("id, nombre"),
  ]);
  const nombreComuna = new Map((comunas ?? []).map((c) => [c.id, c.nombre]));
  const opciones = (lideres ?? []).map((l) => ({ id: l.id, nombre: l.nombre_completo, comuna: nombreComuna.get(l.comuna_id) ?? "" }));

  return (
    <>
      <Encabezado titulo="Importar lista" detalle="Sube un archivo de Excel con los votantes de un líder. Antes de guardar, verás qué filas son nuevas, repetidas o tienen errores." />
      {opciones.length === 0 ? (
        <div className="card"><div className="empty">Primero crea al menos un líder en Personal.</div></div>
      ) : (
        <ImportarExcel lideres={opciones} />
      )}
    </>
  );
}
