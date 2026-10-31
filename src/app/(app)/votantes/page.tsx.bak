import { redirect } from "next/navigation";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cambiarEstadoVotante, darDeBajaVotante, verificarVotante } from "../acciones-votantes";

type PerfilCorto = { id: string; nombre_completo: string; comuna_id: number | null };
type Catalogo = { id: number; nombre: string };
type Votante = {
  id: number;
  cedula: string;
  nombre_completo: string;
  barrio_id: number;
  puesto_id: number;
  mesa: string | null;
  estado: "por_contactar" | "contactado" | "confirmado";
  registrado_por: string;
  origen: "manual" | "excel" | "qr";
  verificado: boolean;
};

const ETIQUETA_ESTADO = {
  por_contactar: "Por contactar",
  contactado: "Contactado",
  confirmado: "Confirmado",
} as const;

export default async function PaginaVotantes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const perfil = await exigirSesionActiva();
  if (!["admin", "coordinador"].includes(perfil.rol)) redirect("/inicio");

  const parametros = await searchParams;
  const busqueda = (parametros.q ?? "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 60);
  const estado = ["por_contactar", "contactado", "confirmado"].includes(parametros.estado ?? "")
    ? parametros.estado
    : "";
  const supabase = await crearClienteServidor();
  let consulta = supabase.from("votantes")
    .select("id, cedula, nombre_completo, barrio_id, puesto_id, mesa, estado, registrado_por, origen, verificado", { count: "exact" })
    .eq("activo", true).order("created_at", { ascending: false }).limit(500);
  if (busqueda) consulta = consulta.or(`cedula.ilike.%${busqueda}%,nombre_completo.ilike.%${busqueda}%`);
  if (estado) consulta = consulta.eq("estado", estado);

  const [votantesQuery, perfilesQuery, barriosQuery, puestosQuery, comunasQuery] = await Promise.all([
    consulta,
    supabase.from("perfiles").select("id, nombre_completo, comuna_id"),
    supabase.from("barrios").select("id, nombre"),
    supabase.from("puestos_votacion").select("id, nombre"),
    supabase.from("comunas").select("id, nombre"),
  ]);
  if (votantesQuery.error) throw new Error(`No se pudieron cargar los votantes: ${votantesQuery.error.message}`);
  if (perfilesQuery.error) throw new Error(`No se pudieron cargar los líderes: ${perfilesQuery.error.message}`);
  if (barriosQuery.error) throw new Error(`No se pudieron cargar los barrios: ${barriosQuery.error.message}`);
  if (puestosQuery.error) throw new Error(`No se pudieron cargar los puestos: ${puestosQuery.error.message}`);
  if (comunasQuery.error) throw new Error(`No se pudieron cargar las comunas: ${comunasQuery.error.message}`);

  const votantes = (votantesQuery.data ?? []) as Votante[];
  const perfiles = new Map(((perfilesQuery.data ?? []) as PerfilCorto[]).map((persona) => [persona.id, persona]));
  const barrios = new Map(((barriosQuery.data ?? []) as Catalogo[]).map((barrio) => [barrio.id, barrio.nombre]));
  const puestos = new Map(((puestosQuery.data ?? []) as Catalogo[]).map((puesto) => [puesto.id, puesto.nombre]));
  const comunas = new Map(((comunasQuery.data ?? []) as Catalogo[]).map((comuna) => [comuna.id, comuna.nombre]));

  return (
    <>
      <h1>Votantes</h1>
      <p className="subtitulo">Busca y revisa los registros visibles para tu rol.</p>
      <section className="panel">
        <h2>{(votantesQuery.count ?? votantes.length).toLocaleString("es-CO")} resultados</h2>
        <form className="filtros" method="get">
          <input name="q" type="search" defaultValue={busqueda} placeholder="Buscar por cédula o nombre" aria-label="Buscar votantes" />
          <select name="estado" defaultValue={estado} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
          </select>
          <button type="submit" className="boton">Buscar</button>
          <a className="boton secundario enlace-boton" href="/votantes/exportar">Exportar CSV</a>
        </form>
        {votantes.length ? (
          <div className="tabla-contenedor">
            <table>
              <thead><tr><th>Cédula</th><th>Nombre</th><th>Comuna</th><th>Barrio</th><th>Puesto</th><th>Registrado por</th><th>Estado</th>{perfil.rol === "admin" ? <th>Acciones</th> : null}</tr></thead>
              <tbody>
                {votantes.map((votante) => {
                  const lider = perfiles.get(votante.registrado_por);
                  return (
                    <tr key={votante.id}>
                      <td>{votante.cedula}</td>
                      <td>{votante.nombre_completo}{votante.origen === "qr" ? <span className="etiqueta">QR</span> : null}{votante.origen === "qr" && !votante.verificado ? <span className="etiqueta advertencia">Sin verificar</span> : null}</td>
                      <td>{lider?.comuna_id ? comunas.get(lider.comuna_id) ?? "—" : "—"}</td>
                      <td>{barrios.get(votante.barrio_id) ?? "—"}</td>
                      <td>{puestos.get(votante.puesto_id) ?? "—"}{votante.mesa ? ` · Mesa ${votante.mesa}` : ""}</td>
                      <td>{lider?.nombre_completo ?? "—"}</td>
                      <td>
                        {perfil.rol === "admin" ? (
                          <form action={cambiarEstadoVotante} className="acciones-form">
                            <input type="hidden" name="id" value={votante.id} />
                            <select name="estado" aria-label={`Estado de ${votante.nombre_completo}`} defaultValue={votante.estado}>
                              {Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                            </select>
                            <button className="boton pequeno secundario" type="submit">Guardar</button>
                          </form>
                        ) : ETIQUETA_ESTADO[votante.estado]}
                      </td>
                      {perfil.rol === "admin" ? (
                        <td>
                          {votante.origen === "qr" && !votante.verificado ? (
                            <form action={verificarVotante}>
                              <input type="hidden" name="id" value={votante.id} />
                              <button className="boton pequeno secundario" type="submit">Verificar QR</button>
                            </form>
                          ) : null}
                          <form action={darDeBajaVotante}>
                            <input type="hidden" name="id" value={votante.id} />
                            <input type="hidden" name="activo" value="false" />
                            <button className="boton pequeno secundario" type="submit">Dar de baja</button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="vacio">No hay votantes que coincidan con los filtros.</p>}
        {votantesQuery.count && votantesQuery.count > votantes.length ? <p className="nota">Se muestran los primeros 500 resultados. Refina la búsqueda para ver otros registros.</p> : null}
      </section>
    </>
  );
}
