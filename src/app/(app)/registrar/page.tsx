import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import FormularioRegistro from "./FormularioRegistro";

type Barrio = { id: number; nombre: string; comuna_id: number };
type Puesto = { id: number; nombre: string; direccion: string | null };
type Comuna = { id: number; nombre: string };

export default async function PaginaRegistrar() {
  const perfil = await exigirSesionActiva();
  if (!["lider_comuna", "lider_barrio"].includes(perfil.rol)) {
    return <p className="error" role="alert">Esta pantalla está disponible para líderes de comuna y barrio.</p>;
  }

  const supabase = await crearClienteServidor();
  const [barriosQuery, puestosQuery, comunasQuery] = await Promise.all([
    supabase.from("barrios").select("id, nombre, comuna_id").order("comuna_id").order("nombre"),
    supabase.from("puestos_votacion").select("id, nombre, direccion").order("nombre"),
    supabase.from("comunas").select("id, nombre").order("nombre"),
  ]);
  if (barriosQuery.error) throw new Error(`No se pudieron cargar los barrios: ${barriosQuery.error.message}`);
  if (puestosQuery.error) throw new Error(`No se pudieron cargar los puestos de votación: ${puestosQuery.error.message}`);
  if (comunasQuery.error) throw new Error(`No se pudieron cargar las comunas: ${comunasQuery.error.message}`);

  const comunas = new Map(((comunasQuery.data ?? []) as Comuna[]).map((comuna) => [comuna.id, comuna.nombre]));
  const barrios = ((barriosQuery.data ?? []) as Barrio[]).map((barrio) => {
    const comuna = comunas.get(barrio.comuna_id);
    if (!comuna) throw new Error(`No se encontró la comuna del barrio ${barrio.nombre}.`);
    return { id: barrio.id, nombre: barrio.nombre, detalle: comuna };
  });
  const puestos = ((puestosQuery.data ?? []) as Puesto[]).map((puesto) => ({
    id: puesto.id,
    nombre: puesto.nombre,
    detalle: puesto.direccion ?? undefined,
  }));

  return (
    <>
      <h1>Registrar votante</h1>
      <p className="subtitulo">Completa los datos de la persona y confirma su autorización.</p>
      <FormularioRegistro barrios={barrios} puestos={puestos} />
    </>
  );
}
