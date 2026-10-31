import Encabezado from "@/components/Encabezado";
import FormRegistro from "@/components/FormRegistro";
import MetaCard from "@/components/MetaCard";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Opcion } from "@/lib/types";

export const metadata = { title: "Registrar votante · Red de Líderes" };

export default async function Registrar() {
  const perfil = await requirePerfil(["lider_comuna", "lider_barrio"]);
  const supabase = await createClient();

  const [{ data: barrios }, { data: puestos }, { data: comuna }, { data: avance }] = await Promise.all([
    supabase.from("barrios").select("id, nombre").eq("comuna_id", perfil.comuna_id ?? -1).order("nombre"),
    supabase.from("puestos_votacion").select("id, nombre").order("nombre"),
    supabase.from("comunas").select("nombre").eq("id", perfil.comuna_id ?? -1).maybeSingle(),
    supabase.from("avance_lideres").select("registrados, meta").eq("id", perfil.id).maybeSingle(),
  ]);

  return (
    <>
      <Encabezado titulo="Registrar votante" detalle="Llena los datos de la persona. La comuna se asigna según tu perfil." />
      <MetaCard perfilId={perfil.id} registrados={avance?.registrados ?? 0} meta={avance?.meta ?? perfil.meta} />
      <FormRegistro barrios={(barrios ?? []) as Opcion[]} puestos={(puestos ?? []) as Opcion[]} comuna={comuna?.nombre ?? ""} />
    </>
  );
}
