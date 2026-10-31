import Encabezado from "@/components/Encabezado";
import FilaPersona, { type PersonaFila } from "@/components/FilaPersona";
import FormPersona from "@/components/FormPersona";
import Link from "next/link";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ROL_LABEL, type Rol } from "@/lib/types";
import { fechaCorta, textoDe } from "@/lib/util";

export const metadata = { title: "Personal · Red de Líderes" };

interface Fila {
  id: string;
  auth_id: string | null;
  usuario: string;
  grupo: "G8" | null;
  debe_cambiar_clave: boolean;
  clave_vence_at: string | null;
  nombre_completo: string;
  rol: Rol;
  meta: number;
  activo: boolean;
  supervisor_id: string | null;
  comunas: { nombre: string } | null;
}

export default async function Personal({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const perfil = await requirePerfil(["admin"]);
  const rolFiltro = textoDe((await searchParams).rol);
  const supabase = await createClient();

  let consulta = supabase.from("perfiles").select("id, auth_id, usuario, grupo, debe_cambiar_clave, clave_vence_at, nombre_completo, rol, meta, activo, supervisor_id, comunas(nombre)").order("nombre_completo").limit(500);
  if (rolFiltro) consulta = consulta.eq("rol", rolFiltro);
  const [{ data }, { data: comunas }, { data: lc }] = await Promise.all([
    consulta,
    supabase.from("comunas").select("id, nombre").order("nombre"),
    supabase.from("perfiles").select("id, nombre_completo, comunas(nombre)").eq("rol", "lider_comuna").eq("activo", true).order("nombre_completo"),
  ]);

  const filas = (data ?? []) as unknown as Fila[];
  const nombrePorId = new Map(filas.map((f) => [f.id, f.nombre_completo]));
  const personas: PersonaFila[] = filas.map((f) => ({
    id: f.id,
    usuario: f.usuario,
    grupo: f.grupo,
    clave: f.rol === "admin" ? "Clave sin vencimiento" : f.debe_cambiar_clave ? "Clave temporal: debe cambiarla" : f.clave_vence_at ? (new Date(f.clave_vence_at) <= new Date() ? "Clave vencida" : `Clave vence ${fechaCorta(f.clave_vence_at).split(",")[0]}`) : "",
    nombre_completo: f.nombre_completo,
    rol: f.rol,
    meta: f.meta,
    activo: f.activo,
    tieneAcceso: f.auth_id !== null,
    zona: f.comunas?.nombre ?? "—",
    supervisor: f.supervisor_id ? (nombrePorId.get(f.supervisor_id) ?? "") : "",
    esYo: f.id === perfil.id,
  }));
  const lideresComuna = ((lc ?? []) as unknown as { id: string; nombre_completo: string; comunas: { nombre: string } | null }[]).map((l) => ({
    id: l.id,
    nombre: `${l.nombre_completo} (${l.comunas?.nombre ?? ""})`,
  }));

  return (
    <>
      <Encabezado titulo="Personal del equipo" detalle="Todo el equipo en un solo lugar. Cada persona que entra al sistema tiene su código de acceso y una contraseña que cambia cada 7 días." />
      <FormPersona comunas={comunas ?? []} lideresComuna={lideresComuna} />
      <div className="card">
        <h2>{personas.length} personas</h2>
        <form className="tools" method="get" action="/personal">
          <select name="rol" defaultValue={rolFiltro} aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            {(Object.keys(ROL_LABEL) as Rol[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
          </select>
          <button className="btn" type="submit">Filtrar</button>
          {rolFiltro && <Link className="btn ghost" href="/personal">Limpiar</Link>}
        </form>
        <div className="scroll">
          <table>
            <thead><tr><th>Nombre</th><th>Código de acceso</th><th>Rol</th><th>Zona</th><th>Meta</th><th>Estado</th><th></th></tr></thead>
            <tbody>{personas.map((p) => <FilaPersona key={p.id} p={p} />)}</tbody>
          </table>
        </div>
        {personas.length === 0 && <div className="empty">No hay personas con ese filtro.</div>}
      </div>
    </>
  );
}
