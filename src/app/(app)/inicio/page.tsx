import { crearClienteServidor } from "@/lib/supabase/servidor";
import { exigirSesionActiva } from "@/lib/sesion";

type Avance = {
  id: string;
  nombre_completo: string;
  meta: number;
  registrados: number;
  confirmados: number;
};

function errorConsulta(error: { message: string } | null): void {
  if (error) throw new Error(`No se pudo cargar el resumen: ${error.message}`);
}

export default async function PaginaInicio() {
  const perfil = await exigirSesionActiva();
  const supabase = await crearClienteServidor();
  const [total, confirmados, avance, duplicados] = await Promise.all([
    supabase.from("votantes").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("votantes").select("id", { count: "exact", head: true })
      .eq("activo", true).eq("estado", "confirmado"),
    supabase.from("avance_lideres")
      .select("id, nombre_completo, meta, registrados, confirmados")
      .order("registrados", { ascending: false }).limit(12),
    perfil.rol === "admin"
      ? supabase.from("intentos_duplicados").select("id", { count: "exact", head: true }).eq("revisado", false)
      : Promise.resolve({ count: null, error: null }),
  ]);
  errorConsulta(total.error);
  errorConsulta(confirmados.error);
  errorConsulta(avance.error);
  errorConsulta(duplicados.error);

  const cantidad = total.count ?? 0;
  const cantidadConfirmada = confirmados.count ?? 0;
  const metas = (avance.data ?? []) as Avance[];
  const porcentaje = cantidad ? Math.round((cantidadConfirmada / cantidad) * 100) : 0;

  return (
    <>
      <h1>Resumen</h1>
      <p className="subtitulo">Así va el registro del equipo.</p>
      <section className="kpis" aria-label="Indicadores">
        <article className="kpi"><strong>{cantidad.toLocaleString("es-CO")}</strong><span>Votantes registrados</span></article>
        <article className="kpi"><strong>{metas.length.toLocaleString("es-CO")}</strong><span>Líderes registrando</span></article>
        <article className="kpi"><strong>{porcentaje}%</strong><span>Confirmados</span></article>
        {perfil.rol === "admin" ? (
          <article className="kpi"><strong>{(duplicados.count ?? 0).toLocaleString("es-CO")}</strong><span>Duplicados por revisar</span></article>
        ) : null}
      </section>
      <section className="panel">
        <h2>Avance de líderes</h2>
        {metas.length ? (
          <div className="tabla-contenedor">
            <table>
              <thead><tr><th>Líder</th><th>Registrados</th><th>Meta</th><th>Confirmados</th><th>Avance</th></tr></thead>
              <tbody>
                {metas.map((lider) => {
                  const avancePct = lider.meta ? Math.min(100, Math.round((lider.registrados / lider.meta) * 100)) : 0;
                  return (
                    <tr key={lider.id}>
                      <td>{lider.nombre_completo}</td>
                      <td>{lider.registrados}</td>
                      <td>{lider.meta}</td>
                      <td>{lider.confirmados}</td>
                      <td><div className="barra-progreso" role="progressbar" aria-valuenow={avancePct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${avancePct}%` }} /></div>{avancePct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="vacio">Todavía no hay líderes activos en tu alcance.</p>}
      </section>
    </>
  );
}