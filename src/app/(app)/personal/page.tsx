import { redirect } from "next/navigation";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { ETIQUETA_ROL, type Rol } from "@/lib/tipos";
import FormularioPersona from "./FormularioPersona";
import AccesoTemporal from "./AccesoTemporal";
import { cambiarMeta } from "../acciones-votantes";
import { cambiarActivoPersona } from "./acciones";

type Persona = {
  id: string;
  auth_id: string | null;
  usuario: string;
  cedula: string;
  nombre_completo: string;
  area: string | null;
  rol: Rol;
  grupo: string | null;
  comuna_id: number | null;
  supervisor_id: string | null;
  meta: number;
  activo: boolean;
};
type Comuna = { id: number; nombre: string };

export default async function PaginaPersonal() {
  const perfil = await exigirSesionActiva();
  if (perfil.rol !== "admin") redirect("/inicio");
  const supabase = await crearClienteServidor();
  const [personasQuery, comunasQuery] = await Promise.all([
    supabase.from("perfiles")
    .select("id, auth_id, usuario, cedula, nombre_completo, area, rol, grupo, comuna_id, supervisor_id, meta, activo")
      .order("nombre_completo"),
    supabase.from("comunas").select("id, nombre").order("nombre"),
  ]);
  if (personasQuery.error) throw new Error(`No se pudo cargar el personal: ${personasQuery.error.message}`);
  if (comunasQuery.error) throw new Error(`No se pudieron cargar las comunas: ${comunasQuery.error.message}`);
  const personas = (personasQuery.data ?? []) as Persona[];
  const comunas = (comunasQuery.data ?? []) as Comuna[];
  const nombresComuna = new Map(comunas.map((comuna) => [comuna.id, comuna.nombre]));
  const supervisores = personas.filter((persona) => persona.rol === "lider_comuna" && persona.activo);

  return (
    <>
      <h1>Personal del equipo</h1>
      <p className="subtitulo">Administra roles, metas y accesos del equipo.</p>
      <FormularioPersona comunas={comunas} supervisores={supervisores} />
      <section className="panel">
        <h2>{personas.length} personas</h2>
        <div className="tabla-contenedor">
          <table>
            <thead><tr><th>Nombre</th><th>Código</th><th>Cédula</th><th>Rol</th><th>Zona o área</th><th>Comuna</th><th>Grupo</th><th>Meta</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {personas.map((persona) => (
                <tr key={persona.id}>
                  <td>{persona.nombre_completo}</td>
                  <td>{persona.usuario}</td>
                  <td>{persona.cedula}</td>
                  <td>{ETIQUETA_ROL[persona.rol]}</td>
                  <td>{persona.area ?? "—"}</td>
                  <td>{persona.comuna_id ? nombresComuna.get(persona.comuna_id) ?? "—" : "—"}</td>
                  <td>{persona.grupo ?? "—"}</td>
                  <td>
                    {persona.rol === "lider_comuna" || persona.rol === "lider_barrio" ? (
                      <form action={cambiarMeta} className="acciones-form">
                        <input type="hidden" name="perfil_id" value={persona.id} />
                        <input name="meta" type="number" min={1} max={100000} defaultValue={persona.meta} aria-label={`Meta de ${persona.nombre_completo}`} />
                        <button className="boton pequeno secundario" type="submit">Guardar</button>
                      </form>
                    ) : "—"}
                  </td>
                  <td>{persona.activo ? "Activo" : "Inactivo"}{persona.auth_id ? "" : " · Sin acceso"}</td>
                  <td className="acciones-tabla">
                    {persona.auth_id && persona.activo ? <AccesoTemporal perfilId={persona.id} /> : null}
                    {persona.id !== perfil.id ? (
                      <form action={cambiarActivoPersona}>
                        <input type="hidden" name="perfil_id" value={persona.id} />
                        <input type="hidden" name="activo" value={String(!persona.activo)} />
                        <button className="boton pequeno secundario" type="submit">{persona.activo ? "Desactivar" : "Activar"}</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
