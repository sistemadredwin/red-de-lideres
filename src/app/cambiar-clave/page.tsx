import { exigirSesion } from "@/lib/sesion";
import FormularioClave from "./FormularioClave";

export default async function PaginaCambiarClave() {
  await exigirSesion();
  return (
    <main className="centro">
      <FormularioClave />
    </main>
  );
}