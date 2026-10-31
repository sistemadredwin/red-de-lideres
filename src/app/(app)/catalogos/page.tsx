import Encabezado from "@/components/Encabezado";
import FormCatalogos from "@/components/FormCatalogos";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Comunas y barrios · Red de Líderes" };

export default async function Catalogos() {
  await requirePerfil(["admin"]);
  const supabase = await createClient();
  const [{ data: comunas }, { data: barrios }, { count: puestos }] = await Promise.all([
    supabase.from("comunas").select("id, nombre").order("nombre"),
    supabase.from("barrios").select("id, comuna_id, nombre").order("nombre").limit(3000),
    supabase.from("puestos_votacion").select("id", { count: "exact", head: true }),
  ]);
  const lista = comunas ?? [];

  return (
    <>
      <Encabezado titulo="Comunas, barrios y puestos" detalle="Las listas oficiales que usan los formularios y el Excel. Escribe los nombres tal como deben aparecer." />
      <FormCatalogos comunas={lista} />
      <div className="card">
        <h2>{lista.length} comunas · {(barrios ?? []).length} barrios · {puestos ?? 0} puestos de votación</h2>
        {lista.length === 0 && <div className="empty">Empieza agregando las comunas.</div>}
        {lista.map((c) => {
          const propios = (barrios ?? []).filter((b) => b.comuna_id === c.id);
          return (
            <details key={c.id} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>{c.nombre} ({propios.length} barrios)</summary>
              <p className="note" style={{ margin: "8px 0 0" }}>{propios.map((b) => b.nombre).join(" · ") || "Sin barrios todavía."}</p>
            </details>
          );
        })}
      </div>
    </>
  );
}
