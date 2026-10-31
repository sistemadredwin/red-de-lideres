import { redirect } from "next/navigation";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cambiarEstadoVotante, cambiarMeta } from "../acciones-votantes";

type Votante = {
  id: number;
  cedula: string;
  nombre_completo: string;
  telefono: string | null;
  barrio_id: number;
  puesto_id: number;
  mesa: string | null;
  estado: "por_contactar" | "contactado" | "confirmado";
  verificado: boolean;
  origen: "manual" | "excel" | "qr";
  created_at: string;
};
type Catalogo = { id: number; nombre: string };

const ETIQUETA_ESTADO = {
  por_contactar: "Por contactar",
  contactado: "Contactado",
  confirmado: "Confirmado",
} as const;

export default async function PaginaMisVotantes() {
  const perfil = await exigirSesionActiva();
  if (!["lider_comuna", "lider_barrio"].includes(perfil.rol)) redirect("/inicio");

  const supabase = await crearClienteServidor();
  const [votantesQuery, barriosQuery, puestosQuery, metaQuery] = await Promise.all([
    supabase.from("votantes")
      .select("id, cedula, nombre_completo, telefono, barrio_id, puesto_id, mesa, estado, verificado, origen, created_at", { count: "exact" })
      .eq("registrado_por", perfil.id).eq("activo", true).order("created_at", { ascending: false }).limit(500),
    supabase.from("barrios").select("id, nombre"),
    supabase.from("puestos_votacion").select("id, nombre"),
    supabase.from("perfiles").select("meta").eq("id", perfil.id).single(),
  ]);
  if (votantesQuery.error) throw new Error(`No se pudieron cargar tus votantes: ${votantesQuery.error.message}`);
  if (barriosQuery.error) throw new Error(`No se pudieron cargar los barrios: ${barriosQuery.error.message}`);
  if (puestosQuery.error) throw new Error(`No se pudieron cargar los puestos: ${puestosQuery.error.message}`);
  if (metaQuery.error) throw new Error(`No se pudo cargar tu meta: ${metaQuery.error.message}`);

  const votantes = (votantesQuery.data ?? []) as Votante[];
  const barrios = new Map(((barriosQuery.data ?? []) as Catalogo[]).map((barrio) => [barrio.id, barrio.nombre]));
  const puestos = new Map(((puestosQuery.data ?? []) as Catalogo[]).map((puesto) => [puesto.id, puesto.nombre]));
  const meta = metaQuery.data.meta as number;
  const totalRegistrados = votantesQuery.count ?? votantes.length;
  const avance = meta ? Math.min(100, Math.round((totalRegistrados / meta) * 100)) : 0;

  return (
    <>
      <h1>Mis votantes</h1>
      <p className="subtitulo">Actualiza el estado de cada persona a medida que avanzas.</p>
      <section className="panel">
        <h2>Tu meta: {totalRegistrados} de {meta} votantes</h2>
        <div className="barra-progreso grande" role="progressbar" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${avance}%` }} />
        </div>
        <strong>{avance}%</strong>
        <form action={cambiarMeta} className="acciones-form meta-formulario">
          <input type="hidden" name="perfil_id" value={perfil.id} />
          <label htmlFor="meta">Cambiar meta</label>
          <input id="meta" name="meta" type="number" min={1} max={100000} defaultValue={meta} required />
          <button className="boton pequeno secundario" type="submit">Guardar meta</button>
        </form>
      </section>
      <section className="panel">
        <h2>{votantesQuery.count ?? votantes.length} registrados</h2>
        {votantes.length ? (
          <div className="tabla-contenedor">
            <table>
              <thead><tr><th>Cédula</th><th>Nombre</th><th>Barrio</th><th>Puesto</th><th>Mesa</th><th>Origen</th><th>Estado</th></tr></thead>
              <tbody>
                {votantes.map((votante) => (
                  <tr key={votante.id}>
                    <td>{votante.cedula}</td>
                    <td>{votante.nombre_completo}{votante.origen === "qr" ? <span className="etiqueta"> QR</span> : null}{votante.origen === "qr" && !votante.verificado ? <span className="etiqueta advertencia">Sin verificar</span> : null}</td>
                    <td>{barrios.get(votante.barrio_id) ?? "—"}</td>
                    <td>{puestos.get(votante.puesto_id) ?? "—"}</td>
                    <td>{votante.mesa ?? "—"}</td>
                    <td>{votante.origen.toUpperCase()}</td>
                    <td>
                      <form action={cambiarEstadoVotante} className="acciones-form">
                        <input type="hidden" name="id" value={votante.id} />
                        <select name="estado" aria-label={`Estado de ${votante.nombre_completo}`} defaultValue={votante.estado}>
                          {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                        </select>
                        <button className="boton pequeno secundario" type="submit">Guardar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {votantesQuery.count && votantesQuery.count > votantes.length ? <p className="nota">Se muestran los primeros 500 registros.</p> : null}
          </div>
        ) : <p className="vacio">Aún no has registrado votantes. Empieza en “Registrar votante”.</p>}
      </section>
    </>
  );
}
