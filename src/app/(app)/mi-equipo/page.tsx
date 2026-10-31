import Barra from "@/components/Barra";
import Encabezado from "@/components/Encabezado";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mi equipo · Red de Líderes" };

export default async function MiEquipo() {
  const perfil = await requirePerfil(["lider_comuna"]);
  const supabase = await createClient();
  const { data } = await supabase.from("avance_lideres").select("id, nombre_completo, rol, meta, registrados, confirmados").order("nombre_completo");
  const filas = data ?? [];
  const total = filas.reduce((a, f) => a + f.registrados, 0);
  const metaTotal = filas.reduce((a, f) => a + f.meta, 0);
  const confirmados = filas.reduce((a, f) => a + f.confirmados, 0);

  return (
    <>
      <Encabezado titulo="Mi equipo" detalle="El avance tuyo y el de los líderes de barrio que dependen de ti." />
      <div className="grid kpis">
        <div className="kpi"><div className="n">{total}</div><div className="l">Votantes del equipo</div></div>
        <div className="kpi"><div className="n">{metaTotal}</div><div className="l">Meta del equipo</div></div>
        <div className="kpi"><div className="n">{total ? Math.round((confirmados / total) * 100) : 0}%</div><div className="l">Confirmados</div></div>
      </div>
      <div className="card">
        <h2>Avance frente a la meta</h2>
        {filas.map((f) => (
          <Barra key={f.id} etiqueta={f.id === perfil.id ? `${f.nombre_completo} (tú)` : f.nombre_completo} valor={f.registrados} total={f.meta} texto={`${f.registrados}/${f.meta}`} />
        ))}
        {filas.length <= 1 && <p className="note">Aún no tienes líderes de barrio a tu cargo. La administración los asigna.</p>}
      </div>
    </>
  );
}
