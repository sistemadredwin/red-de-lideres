import Encabezado from "@/components/Encabezado";
import Paginador from "@/components/Paginador";
import QrAcciones from "@/components/QrAcciones";
import QrImagen from "@/components/QrImagen";
import { getOrigin, requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ROL_LABEL, type Rol } from "@/lib/types";
import { paginaDe } from "@/lib/util";

export const metadata = { title: "Códigos QR · Red de Líderes" };

const POR_PAGINA = 12;

export default async function CodigosQr({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePerfil(["admin"]);
  const pagina = paginaDe((await searchParams).pagina);
  const origen = await getOrigin();
  const supabase = await createClient();
  const desde = (pagina - 1) * POR_PAGINA;
  const { data, count } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, rol, qr_activo, comunas(nombre)", { count: "exact" })
    .in("rol", ["lider_comuna", "lider_barrio"])
    .eq("activo", true)
    .order("nombre_completo")
    .range(desde, desde + POR_PAGINA - 1);
  const lideres = (data ?? []) as unknown as { id: string; nombre_completo: string; rol: Rol; qr_activo: boolean; comunas: { nombre: string } | null }[];

  // El código de cada líder se lee con una función de la base de datos (solo el administrador).
  const tokens = await Promise.all(lideres.map(async (l) => (await supabase.rpc("qr_de", { p_perfil: l.id })).data as string | null));

  return (
    <>
      <Encabezado titulo="Códigos QR" detalle="Cada líder tiene un código fijo y distinto: no se puede cambiar, solo pausar. Lo que se registre por él queda en su lista." />
      {lideres.length === 0 && <div className="card"><div className="empty">Aún no hay líderes activos.</div></div>}
      <div className="qgrid">
        {lideres.map((l, i) => {
          const url = `${origen}/r/${tokens[i]}`;
          return (
            <div className="card" style={{ margin: 0 }} key={l.id}>
              <div className="qrbox" style={{ margin: "0 auto 12px", maxWidth: 210 }}>
                <QrImagen url={url} perfilId={l.id} />
              </div>
              <h3 style={{ margin: 0 }}>{l.nombre_completo}</h3>
              <p style={{ color: "var(--muted)", margin: 0 }}>{ROL_LABEL[l.rol]}, {l.comunas?.nombre}</p>
              <QrAcciones perfilId={l.id} url={url} nombre={l.nombre_completo} esAdmin qrActivo={l.qr_activo} />
            </div>
          );
        })}
      </div>
      <Paginador ruta="/codigos-qr" pagina={pagina} total={count ?? 0} porPagina={POR_PAGINA} filtros={{}} />
    </>
  );
}
