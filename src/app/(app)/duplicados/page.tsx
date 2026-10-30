import { redirect } from "next/navigation";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { revisarDuplicado } from "../acciones-votantes";

type Duplicado = {
  id: number;
  cedula: string;
  votante: string;
  registro_primero: string;
  intento_registrar: string;
  origen: "manual" | "excel" | "qr";
  created_at: string;
  revisado: boolean;
};

export default async function PaginaDuplicados() {
  const perfil = await exigirSesionActiva();
  if (perfil.rol !== "admin") redirect("/inicio");
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("duplicados_detalle")
    .select("id, cedula, votante, registro_primero, intento_registrar, origen, created_at, revisado")
    .order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(`No se pudieron cargar los duplicados: ${error.message}`);

  const duplicados = (data ?? []) as Duplicado[];
  const pendientes = duplicados.filter((item) => !item.revisado).length;
  return (
    <>
      <h1>Duplicados</h1>
      <p className="subtitulo">Intentos repetidos de registro. El votante original no se modifica.</p>
      <section className="panel">
        <h2>{pendientes} pendientes</h2>
        {duplicados.length ? (
          <div className="tabla-contenedor">
            <table>
              <thead><tr><th>Cédula</th><th>Votante existente</th><th>Registro original</th><th>Intento nuevo</th><th>Origen</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {duplicados.map((duplicado) => (
                  <tr key={duplicado.id}>
                    <td>{duplicado.cedula}</td>
                    <td>{duplicado.votante}</td>
                    <td>{duplicado.registro_primero}</td>
                    <td>{duplicado.intento_registrar}</td>
                    <td>{duplicado.origen.toUpperCase()}</td>
                    <td>{new Date(duplicado.created_at).toLocaleString("es-CO")}</td>
                    <td>{duplicado.revisado ? "Revisado" : "Pendiente"}</td>
                    <td>
                      <form action={revisarDuplicado}>
                        <input type="hidden" name="id" value={duplicado.id} />
                        <input type="hidden" name="revisado" value={String(!duplicado.revisado)} />
                        <button className="boton pequeno secundario" type="submit">{duplicado.revisado ? "Reabrir" : "Marcar revisado"}</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="vacio">No hay intentos duplicados registrados.</p>}
      </section>
    </>
  );
}
