import BotonAccion from "@/components/BotonAccion";
import Encabezado from "@/components/Encabezado";
import Paginador from "@/components/Paginador";
import { revisarDuplicado } from "@/app/actions/votantes";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { POR_PAGINA, fechaCorta, paginaDe } from "@/lib/util";

export const metadata = { title: "Duplicados · Red de Líderes" };

const ORIGEN = { manual: "Formulario", excel: "Excel", qr: "QR" } as const;

interface Fila {
  id: number;
  cedula: string;
  votante: string;
  registro_primero: string;
  intento_registrar: string;
  origen: keyof typeof ORIGEN;
  created_at: string;
  revisado: boolean;
}

export default async function Duplicados({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePerfil(["admin"]);
  const pagina = paginaDe((await searchParams).pagina);
  const supabase = await createClient();
  const desde = (pagina - 1) * POR_PAGINA;
  const { data, count } = await supabase
    .from("duplicados_detalle")
    .select("id, cedula, votante, registro_primero, intento_registrar, origen, created_at, revisado", { count: "exact" })
    .order("revisado", { ascending: true })
    .order("created_at", { ascending: false })
    .range(desde, desde + POR_PAGINA - 1);
  const filas = (data ?? []) as Fila[];

  return (
    <>
      <Encabezado titulo="Cédulas repetidas" detalle="Cada fila es un intento de registrar a alguien que ya estaba en el sistema. Solo la administración ve esta pantalla." />
      <div className="card">
        {filas.length === 0 ? (
          <div className="empty">No hay duplicados. Todo está limpio.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Cédula</th><th>Nombre</th><th>La registró primero</th><th>Intentó registrarla</th><th>Por</th><th>Fecha</th><th></th></tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.id} className={`dup${f.revisado ? " done" : ""}`}>
                    <td>{f.cedula}</td>
                    <td>{f.votante}</td>
                    <td>{f.registro_primero}</td>
                    <td>{f.intento_registrar}</td>
                    <td>{ORIGEN[f.origen]}</td>
                    <td>{fechaCorta(f.created_at)}</td>
                    <td>
                      <BotonAccion texto={f.revisado ? "Reabrir" : "Marcar revisado"} accion={revisarDuplicado.bind(null, f.id, !f.revisado)} clase="btn small ghost" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Paginador ruta="/duplicados" pagina={pagina} total={count ?? 0} porPagina={POR_PAGINA} filtros={{}} />
      </div>
    </>
  );
}
