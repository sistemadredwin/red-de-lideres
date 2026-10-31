import Encabezado from "@/components/Encabezado";
import Paginador from "@/components/Paginador";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { fechaCorta, paginaDe } from "@/lib/util";

export const metadata = { title: "Actividad · Red de Líderes" };

const POR_PAGINA = 50;

export default async function Actividad({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePerfil(["admin"]);
  const pagina = paginaDe((await searchParams).pagina);
  const supabase = await createClient();
  const desde = (pagina - 1) * POR_PAGINA;
  const { data, count } = await supabase
    .from("actividad")
    .select("id, accion, detalle, created_at, perfiles(nombre_completo)", { count: "exact" })
    .order("id", { ascending: false })
    .range(desde, desde + POR_PAGINA - 1);
  const filas = (data ?? []) as unknown as { id: number; accion: string; detalle: Record<string, unknown>; created_at: string; perfiles: { nombre_completo: string } | null }[];

  return (
    <>
      <Encabezado titulo="Registro de actividad" detalle="Queda anotado quién registró a quién, quién cambió una meta y quién revisó cada duplicado." />
      <div className="card">
        {filas.length === 0 ? (
          <div className="empty">Todavía no hay actividad.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Fecha y hora</th><th>Persona</th><th>Qué hizo</th><th>Detalle</th></tr></thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td>{fechaCorta(f.created_at)}</td>
                    <td>{f.perfiles?.nombre_completo ?? "—"}</td>
                    <td>{f.accion}</td>
                    <td className="note">{Object.entries(f.detalle ?? {}).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginador ruta="/actividad" pagina={pagina} total={count ?? 0} porPagina={POR_PAGINA} filtros={{}} />
      </div>
    </>
  );
}
