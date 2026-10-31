import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import FormularioPublico from "./FormularioPublico";
import type { OpcionCatalogo } from "@/components/CampoCatalogo";

type InfoQr =
  | { resultado: "codigo_invalido" }
  | { resultado: "ok"; lider: string; comuna: string; barrios: OpcionCatalogo[]; puestos: OpcionCatalogo[] };

export default async function PaginaQrPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{40}$/.test(token)) return <main className="publico"><h1>Código no válido</h1><p>Verifica que el enlace del código QR sea correcto.</p></main>;

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.rpc("qr_info", { p_token: token });
  if (error) throw new Error(`No se pudo verificar el código QR: ${error.message}`);
  const info = data as InfoQr;
  if (info.resultado !== "ok") {
    return <main className="publico"><h1>Este código ya no está activo</h1><p>Pide a tu líder un enlace válido.</p></main>;
  }

  return (
    <main className="publico">
      <LinkMarca />
      <h1>Regístrate</h1>
      <p className="subtitulo">Te invita {info.lider}, de {info.comuna}.</p>
      <FormularioPublico token={token} barrios={info.barrios} puestos={info.puestos} />
    </main>
  );
}

function LinkMarca() {
  return <Link className="marca-publica" href="/">Red de Líderes</Link>;
}
