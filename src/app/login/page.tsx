import { redirect } from "next/navigation";
import { obtenerSesion, claveVencida } from "@/lib/sesion";
import FormularioLogin from "./FormularioLogin";

export default async function PaginaLogin() {
  const perfil = await obtenerSesion();
  if (perfil) redirect(claveVencida(perfil) ? "/cambiar-clave" : "/inicio");

  return (
    <main className="centro">
      <FormularioLogin />
    </main>
  );
}