import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import FormularioRegistro from "./FormularioRegistro";

type Opcion = { id: number; nombre: string; comuna_id?: number };

export default async function PaginaRegistrar() {
  const perfil = await exigirSesionActiva();
  if (!["lider_comuna", "lider_barrio"].includes(perfil.rol)) {
    return <p className="error" role="alert">Esta pantalla está disponible para líderes de comuna y barrio.</p>;
  }

  const supabase = await crearClienteServidor();
  const [barriosQuery, puestosQuery] = await Promise.all([
    supabase.from("barrios").select("id, nombre, comuna_id").order("nombre"),
    supabase.from("puestos_votacion").select("id, nombre").order("nombre"),
  ]);
  if (barriosQuery.error) throw new Error(`No se pudieron cargar los barrios: ${barriosQuery.error.message}`);
  if (puestosQuery.error) throw new Error(`No se pudieron cargar los puestos de votación: ${puestosQuery.error.message}`);

  const barrios = (barriosQuery.data ?? []) as Opcion[];
  const puestos = (puestosQuery.data ?? []) as Opcion[];
  const barriosDelLider = perfil.comuna_id
    ? barrios.filter((barrio) => barrio.comuna_id === perfil.comuna_id)
    : [];

  return (
    <>
      <h1>Registrar votante</h1>
      <p className="subtitulo">Completa los datos de la persona y confirma su autorización.</p>
      <FormularioRegistro barrios={barriosDelLider} puestos={puestos} />
    </>
  );
}
