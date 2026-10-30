import { redirect } from "next/navigation";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

type ResumenPuesto = {
  puesto_id: number;
  puesto: string;
  votantes: number;
  mesas: number;
  confirmados: number;
};

export default async function PaginaPuestos() {
  const perfil = await exigirSesionActiva();
  if (perfil.rol !== "admin") redirect("/inicio");
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("resumen_puestos")
    .select("puesto_id, puesto, votantes, mesas, confirmados")
    .order("votantes", { ascending: false });
  if (error) throw new Error(`No se pudo cargar el resumen de puestos: ${error.message}`);
  const puestos = (data ?? []) as ResumenPuesto[];

  return (
    <>
      <h1>Puestos de votación</h1>
      <p className="subtitulo">Votantes y mesas por puesto para apoyar la planificación electoral.</p>
      <section className="panel">
        {puestos.length ? (
          <div className="tabla-contenedor">
            <table>
              <thead><tr><th>Puesto</th><th>Votantes</th><th>Mesas</th><th>Confirmados</th></tr></thead>
              <tbody>
                {puestos.map((puesto) => (
                  <tr key={puesto.puesto_id}><td>{puesto.puesto}</td><td>{puesto.votantes}</td><td>{puesto.mesas}</td><td>{puesto.confirmados}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="vacio">Aún no hay votantes registrados.</p>}
      </section>
    </>
  );
}
