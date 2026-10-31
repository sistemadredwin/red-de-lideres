import Link from "next/link";
import EstadoSelect from "@/components/EstadoSelect";
import BotonAccion from "@/components/BotonAccion";
import Paginador from "@/components/Paginador";
import { cambiarActivoVotante } from "@/app/actions/votantes";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS, ESTADO_LABEL, esLider, type Perfil, type VotanteFila } from "@/lib/types";
import { POR_PAGINA, fechaCorta, limpiarBusqueda, paginaDe, textoDe } from "@/lib/util";

type Params = Record<string, string | string[] | undefined>;

const COLUMNAS = `id, cedula, nombre_completo, telefono, mesa, estado, origen, verificado, activo, created_at, registrado_por,
  barrios(nombre), puestos_votacion(nombre), comunas(nombre), perfiles!registrado_por(nombre_completo)`;

// Lista paginada de votantes. La base de datos decide qué filas puede ver cada
// persona (RLS); aquí solo se aplican los filtros que la persona elige.
export default async function ListaVotantes({
  ruta,
  perfil,
  params,
  mostrarComuna,
  mostrarLider,
}: {
  ruta: string;
  perfil: Perfil;
  params: Params;
  mostrarComuna: boolean;
  mostrarLider: boolean;
}) {
  const supabase = await createClient();
  const esAdmin = perfil.rol === "admin";
  const pagina = paginaDe(params.pagina);
  const q = limpiarBusqueda(textoDe(params.q));
  const estado = textoDe(params.estado);
  const comuna = textoDe(params.comuna);
  const lider = textoDe(params.lider);
  const barrio = textoDe(params.barrio);

  let consulta = supabase.from("votantes").select(COLUMNAS, { count: "exact" });
  if (q) consulta = consulta.or(`cedula.ilike.%${q}%,nombre_completo.ilike.%${q}%`);
  if (ESTADOS.includes(estado as never)) consulta = consulta.eq("estado", estado);
  if (comuna && /^\d+$/.test(comuna)) consulta = consulta.eq("comuna_id", Number(comuna));
  if (lider && /^[0-9a-f-]{36}$/.test(lider)) consulta = consulta.eq("registrado_por", lider);
  if (barrio && /^\d+$/.test(barrio)) consulta = consulta.eq("barrio_id", Number(barrio));
  const desde = (pagina - 1) * POR_PAGINA;
  const { data, count, error } = await consulta.order("id", { ascending: false }).range(desde, desde + POR_PAGINA - 1);

  // Barrios para el filtro: el administrador ve todos; los demás, solo los de su comuna.
  let consultaBarrios = supabase.from("barrios").select("id, nombre, comuna_id, comunas(nombre)").order("nombre");
  if (!esAdmin && perfil.comuna_id) consultaBarrios = consultaBarrios.eq("comuna_id", perfil.comuna_id);
  if (esAdmin && /^\d+$/.test(comuna)) consultaBarrios = consultaBarrios.eq("comuna_id", Number(comuna));

  const [{ data: lideres }, { data: comunas }, { data: barrios }] = await Promise.all([
    mostrarLider
      ? supabase.from("perfiles").select("id, nombre_completo, rol").in("rol", ["lider_comuna", "lider_barrio"]).eq("activo", true).order("nombre_completo")
      : Promise.resolve({ data: [] as { id: string; nombre_completo: string; rol: string }[] }),
    mostrarComuna ? supabase.from("comunas").select("id, nombre").order("nombre") : Promise.resolve({ data: [] as { id: number; nombre: string }[] }),
    consultaBarrios,
  ]);

  const filas = (data ?? []) as unknown as (VotanteFila & { registrado_por: string })[];
  const filtros = { q, estado, comuna, lider, barrio };
  const exportar = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();

  return (
    <div className="card">
      <h2>{count ?? 0} resultados</h2>
      <form className="tools" method="get" action={ruta}>
        <input type="search" name="q" placeholder="Buscar por cédula o nombre" defaultValue={q} aria-label="Buscar" />
        {mostrarComuna && (
          <select name="comuna" defaultValue={comuna} aria-label="Comuna">
            <option value="">Todas las comunas</option>
            {(comunas ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        )}
        <select name="barrio" defaultValue={barrio} aria-label="Barrio">
          <option value="">Todos los barrios</option>
          {(barrios ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.nombre}
            </option>
          ))}
        </select>
        {mostrarLider && (
          <select name="lider" defaultValue={lider} aria-label="Líder">
            <option value="">Todos los líderes</option>
            {(lideres ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre_completo}
              </option>
            ))}
          </select>
        )}
        <select name="estado" defaultValue={estado} aria-label="Estado">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABEL[e]}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Buscar
        </button>
        {(q || estado || comuna || lider || barrio) && (
          <Link className="btn ghost" href={ruta}>
            Limpiar
          </Link>
        )}
        {esAdmin && (
          <a className="btn ghost" href={`/exportar${exportar ? `?${exportar}` : ""}`}>
            Exportar a Excel
          </a>
        )}
      </form>

      {error && (
        <div className="flash err" role="alert">
          No se pudo cargar la lista. Intenta de nuevo.
        </div>
      )}

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Cédula</th>
              <th>Nombre</th>
              <th>Comuna</th>
              <th>Barrio</th>
              <th>Puesto</th>
              {mostrarLider && <th>Registrado por</th>}
              <th>Estado</th>
              {esAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filas.map((v) => (
              <tr key={v.id} className={v.activo ? "" : "off"}>
                <td>
                  {v.cedula}
                  {!v.activo && <> <span className="tag">de baja</span></>}
                </td>
                <td>
                  {v.nombre_completo}
                  {v.origen === "qr" && <> <span className="tag">QR</span>{!v.verificado && <> <span className="tag warn">Sin verificar</span></>}</>}
                </td>
                <td>{v.comunas?.nombre}</td>
                <td>{v.barrios?.nombre}</td>
                <td>{v.puestos_votacion?.nombre}</td>
                {mostrarLider && <td>{v.perfiles?.nombre_completo}</td>}
                <td>
                  <EstadoSelect id={v.id} estado={v.estado} nombre={v.nombre_completo} editable={v.activo && (esAdmin || (esLider(perfil.rol) && v.registrado_por === perfil.id))} />
                </td>
                {esAdmin && (
                  <td>
                    <BotonAccion
                      texto={v.activo ? "Dar de baja" : "Reactivar"}
                      accion={cambiarActivoVotante.bind(null, v.id, !v.activo)}
                      confirmar={v.activo ? `¿Dar de baja a ${v.nombre_completo}? No se borra: se puede reactivar.` : undefined}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filas.length === 0 && !error && <div className="empty">{q || estado || comuna || lider ? "Ningún votante coincide con la búsqueda." : "Aún no hay votantes registrados."}</div>}
      <Paginador ruta={ruta} pagina={pagina} total={count ?? 0} porPagina={POR_PAGINA} filtros={filtros} />
      <p className="note" style={{ marginTop: 8 }}>
        Fecha del último registro mostrado: {filas[0] ? fechaCorta(filas[0].created_at) : "—"}
      </p>
    </div>
  );
}
