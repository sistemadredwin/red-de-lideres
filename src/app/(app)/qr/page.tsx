import { redirect } from "next/navigation";
import { exigirSesionActiva } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cambiarQrActivo } from "../acciones-votantes";
import ImagenQr from "./ImagenQr";
import AccionesQr from "./AccionesQr";

type PerfilQr = {
  id: string;
  nombre_completo: string;
  rol: "lider_comuna" | "lider_barrio";
  comuna_id: number | null;
  qr_activo: boolean;
};
type Comuna = { id: number; nombre: string };

export default async function PaginaQr() {
  const perfil = await exigirSesionActiva();
  if (perfil.rol !== "admin" && perfil.rol !== "lider_comuna" && perfil.rol !== "lider_barrio") redirect("/inicio");
  const supabase = await crearClienteServidor();

  if (perfil.rol !== "admin") {
    const { data: token, error } = await supabase.rpc("mi_qr");
    if (error) throw new Error(`No se pudo cargar tu código QR: ${error.message}`);
    if (!token) return <p className="error" role="alert">Tu perfil todavía no tiene un código QR asignado.</p>;
    const ruta = `/r/${token}`;
    return (
      <>
        <h1>Mi código QR</h1>
        <p className="subtitulo">Quien escanee este código podrá completar el formulario público.</p>
        <section className="panel qr-panel">
          {perfil.activo ? <ImagenQr ruta={ruta} nombre={perfil.nombre_completo} /> : null}
          <div>
            <h2>{perfil.nombre_completo}</h2>
            <p>{perfil.qr_activo ? "Código activo" : "Código pausado por la administración"}</p>
            {perfil.qr_activo ? <AccionesQr ruta={ruta} /> : null}
          </div>
        </section>
      </>
    );
  }

  const [perfilesQuery, comunasQuery] = await Promise.all([
    supabase.from("perfiles").select("id, nombre_completo, rol, comuna_id, qr_activo")
      .in("rol", ["lider_comuna", "lider_barrio"]).eq("activo", true).order("nombre_completo"),
    supabase.from("comunas").select("id, nombre"),
  ]);
  if (perfilesQuery.error) throw new Error(`No se pudieron cargar los líderes: ${perfilesQuery.error.message}`);
  if (comunasQuery.error) throw new Error(`No se pudieron cargar las comunas: ${comunasQuery.error.message}`);
  const perfiles = (perfilesQuery.data ?? []) as PerfilQr[];
  const comunas = new Map(((comunasQuery.data ?? []) as Comuna[]).map((comuna) => [comuna.id, comuna.nombre]));
  const codigos = await Promise.all(perfiles.map(async (persona) => {
    const { data: token, error } = await supabase.rpc("qr_de", { p_perfil: persona.id });
    if (error) throw new Error(`No se pudo cargar el QR de ${persona.nombre_completo}: ${error.message}`);
    return { persona, token: token as string | null };
  }));

  return (
    <>
      <h1>Códigos QR</h1>
      <p className="subtitulo">Cada líder tiene un enlace fijo; puedes pausar o reactivar su código.</p>
      <section className="qr-grid">
        {codigos.map(({ persona, token }) => {
          if (!token) return <article className="panel" key={persona.id}><p className="error">El perfil de {persona.nombre_completo} no tiene un código asignado.</p></article>;
          const ruta = `/r/${token}`;
          return (
            <article className="panel qr-card" key={persona.id}>
              {persona.qr_activo ? <ImagenQr ruta={ruta} nombre={persona.nombre_completo} /> : <p className="aviso">Código pausado</p>}
              <h2>{persona.nombre_completo}</h2>
              <p>{comunas.get(persona.comuna_id ?? -1) ?? "Sin comuna asignada"}</p>
              {persona.qr_activo ? <AccionesQr ruta={ruta} /> : null}
              <form action={cambiarQrActivo}>
                <input type="hidden" name="perfil_id" value={persona.id} />
                <input type="hidden" name="activo" value={String(!persona.qr_activo)} />
                <button className="boton pequeno secundario" type="submit">{persona.qr_activo ? "Pausar QR" : "Reactivar QR"}</button>
              </form>
            </article>
          );
        })}
      </section>
    </>
  );
}
