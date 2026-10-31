import Encabezado from "@/components/Encabezado";
import FormClave from "@/components/FormClave";
import { getSesion, requirePerfil } from "@/lib/session";
import { ROL_LABEL } from "@/lib/types";

export const metadata = { title: "Mi cuenta · Red de Líderes" };

export default async function Cuenta() {
  const perfil = await requirePerfil();
  const { diasRestantes } = await getSesion();
  const vigencia = diasRestantes === null || diasRestantes === undefined ? "Tu contraseña no vence." : `Tu contraseña vence en ${diasRestantes} día${diasRestantes === 1 ? "" : "s"}.`;
  return (
    <>
      <Encabezado titulo="Mi cuenta" detalle={`${perfil.nombre_completo} · ${ROL_LABEL[perfil.rol]} · Código ${perfil.usuario}. ${vigencia}`} />
      <FormClave />
    </>
  );
}
