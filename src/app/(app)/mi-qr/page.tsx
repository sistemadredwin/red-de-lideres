import Encabezado from "@/components/Encabezado";
import QrAcciones from "@/components/QrAcciones";
import QrImagen from "@/components/QrImagen";
import { getOrigin, requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mi código QR · Red de Líderes" };

export default async function MiQr() {
  const perfil = await requirePerfil(["lider_comuna", "lider_barrio"]);
  const supabase = await createClient();
  const { data: token } = await supabase.rpc("mi_qr");
  if (!token) return <><Encabezado titulo="Mi código QR" detalle="Tu código QR no está disponible. Pide ayuda a la administración." /></>;
  const url = `${await getOrigin()}/r/${token}`;
  return (
    <>
      <Encabezado titulo="Mi código QR" detalle="Quien lo escanee puede registrarse desde su celular y queda en tu lista." />
      <div className="card qrcard">
        <div className="qrbox">
          <QrImagen url={url} perfilId={perfil.id} />
        </div>
        <div>
          <h3>{perfil.nombre_completo}</h3>
          <label htmlFor="enlace">Enlace</label>
          <input id="enlace" type="text" readOnly value={url} />
          <QrAcciones perfilId={perfil.id} url={url} nombre={perfil.nombre_completo} />
        </div>
      </div>
    </>
  );
}
