import Encabezado from "@/components/Encabezado";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Puestos de votación · Red de Líderes" };

export default async function Puestos() {
  await requirePerfil(["admin"]);
  const supabase = await createClient();
  const { data } = await supabase.from("resumen_puestos").select("puesto_id, puesto, votantes, mesas, confirmados").order("votantes", { ascending: false });
  const filas = data ?? [];
  return (
    <>
      <Encabezado titulo="Puestos de votación" detalle="Cuántos votantes hay en cada puesto. Sirve para planear el día de las elecciones: testigos, transporte y recordatorios." />
      <div className="card">
        {filas.length === 0 ? (
          <div className="empty">Aún no hay votantes registrados.</div>
        ) : (
          <div className="scroll">
            <table>
              <thead><tr><th>Puesto</th><th>Votantes</th><th>Mesas</th><th>Confirmados</th></tr></thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.puesto_id}>
                    <td>{f.puesto}</td>
                    <td>{f.votantes}</td>
                    <td>{f.mesas}</td>
                    <td>{f.confirmados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
