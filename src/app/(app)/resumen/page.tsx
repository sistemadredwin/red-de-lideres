import Link from "next/link";
import Barra from "@/components/Barra";
import Encabezado from "@/components/Encabezado";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS, ESTADO_COLOR, ESTADO_LABEL } from "@/lib/types";
import { porcentaje } from "@/lib/util";

export const metadata = { title: "Resumen · Red de Líderes" };

export default async function Resumen() {
  const perfil = await requirePerfil(["admin", "coordinador"]);
  const esAdmin = perfil.rol === "admin";
  const supabase = await createClient();

  // Los conteos los hace la base de datos; la seguridad por fila limita lo que cuenta cada rol.
  const contar = (filtro?: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    const q = base();
    return (filtro ? filtro(q) : q).then((r) => r.count ?? 0);
  };
  function base() {
    return supabase.from("votantes").select("id", { count: "exact", head: true }).eq("activo", true);
  }

  const [total, porEstado, comunas, avance, pendientes] = await Promise.all([
    contar(),
    Promise.all(ESTADOS.map((e) => contar((q) => q.eq("estado", e)))),
    supabase.from("comunas").select("id, nombre").order("nombre"),
    supabase.from("avance_lideres").select("id, nombre_completo, meta, registrados").order("nombre_completo"),
    esAdmin ? supabase.from("intentos_duplicados").select("id", { count: "exact", head: true }).eq("revisado", false).then((r) => r.count ?? 0) : Promise.resolve(0),
  ]);

  const porComuna = esAdmin
    ? await Promise.all((comunas.data ?? []).map(async (c) => ({ nombre: c.nombre, n: await contar((q) => q.eq("comuna_id", c.id)) })))
    : [];
  porComuna.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { numeric: true, sensitivity: "base" }));
  const lideres = avance.data ?? [];
  const metaTotal = lideres.reduce((a, l) => a + l.meta, 0);
  const confirmados = porEstado[ESTADOS.indexOf("confirmado")];

  return (
    <>
      <Encabezado titulo={esAdmin ? "Resumen general" : "Resumen de tu comuna"} detalle="Así va el registro hasta hoy." />

      {esAdmin && pendientes > 0 && (
        <div className="flash err">
          Hay {pendientes} cédula(s) repetida(s) por revisar. <Link className="btn small ghost" href="/duplicados">Ver duplicados</Link>
        </div>
      )}

      <div className="grid kpis">
        <div className="kpi"><div className="n">{total}</div><div className="l">Votantes registrados</div></div>
        <div className="kpi"><div className="n">{lideres.length}</div><div className="l">Líderes registrando</div></div>
        <div className="kpi"><div className="n">{porcentaje(confirmados, total)}%</div><div className="l">Confirmados</div></div>
        {esAdmin ? (
          <div className={`kpi${pendientes ? " red" : ""}`}><div className="n">{pendientes}</div><div className="l">Duplicados sin revisar</div></div>
        ) : (
          <div className="kpi"><div className="n">{metaTotal}</div><div className="l">Meta de la comuna</div></div>
        )}
      </div>

      <div className="two">
        <div className="card">
          <h2>Avance frente a la meta</h2>
          {lideres.map((l) => (
            <Barra key={l.id} etiqueta={l.nombre_completo} valor={l.registrados} total={l.meta} texto={`${l.registrados}/${l.meta}`} />
          ))}
          {lideres.length === 0 && <div className="empty">Aún no hay líderes activos.</div>}
        </div>
        <div className="card">
          <h2>Estado de los votantes</h2>
          <div className="stack" role="img" aria-label="Votantes por estado">
            {ESTADOS.map((e, i) => (
              <i key={e} style={{ width: `${porcentaje(porEstado[i], total)}%`, background: ESTADO_COLOR[e] }} />
            ))}
          </div>
          <div className="legend">
            {ESTADOS.map((e, i) => (
              <span key={e} style={{ "--c": ESTADO_COLOR[e] } as React.CSSProperties}>
                {ESTADO_LABEL[e]}: <b>{porEstado[i]}</b>
              </span>
            ))}
          </div>
        </div>
      </div>

      {esAdmin && (
        <div className="card">
          <h2>Votantes por comuna</h2>
          {porComuna.map((c) => (
            <Barra key={c.nombre} etiqueta={c.nombre} valor={c.n} total={total || 1} texto={`${c.n} ${c.n === 1 ? "votante" : "votantes"}`} />
          ))}
          {porComuna.length === 0 && <div className="empty">Aún no hay comunas cargadas. Agrégalas en Comunas y barrios.</div>}
        </div>
      )}
    </>
  );
}
