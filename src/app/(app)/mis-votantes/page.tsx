import Encabezado from "@/components/Encabezado";
import ListaVotantes from "@/components/ListaVotantes";
import MetaCard from "@/components/MetaCard";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mis votantes · Red de Líderes" };

export default async function MisVotantes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const perfil = await requirePerfil(["lider_comuna", "lider_barrio"]);
  const params = await searchParams;
  const supabase = await createClient();
  const { data: avance } = await supabase.from("avance_lideres").select("registrados, meta").eq("id", perfil.id).maybeSingle();
  const equipo = perfil.rol === "lider_comuna";

  return (
    <>
      <Encabezado
        titulo="Mis votantes"
        detalle={equipo ? "Los que registraste tú y los de tus líderes de barrio. Cambia el estado de los tuyos a medida que avanzas con cada persona." : "Cambia el estado de cada persona a medida que avanzas con ella."}
      />
      <div className="row" style={{ marginBottom: 12 }}>
        <a className="btn ghost small" href="/plantilla">Descargar mi planilla (Excel)</a>
      </div>
      <MetaCard perfilId={perfil.id} registrados={avance?.registrados ?? 0} meta={avance?.meta ?? perfil.meta} />
      <ListaVotantes ruta="/mis-votantes" perfil={perfil} params={params} mostrarComuna={false} mostrarLider={equipo} />
    </>
  );
}
