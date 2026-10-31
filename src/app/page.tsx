import { redirect } from "next/navigation";
import { getSesion, inicioPorRol } from "@/lib/session";

// La raíz solo decide a dónde mandar a cada persona según su estado y su rol.
export default async function Inicio() {
  const s = await getSesion();
  if (s.estado === "sin_sesion") redirect("/login");
  if (s.estado === "sin_acceso") redirect("/salir?motivo=sin-acceso");
  if (s.estado === "cambiar_clave") redirect("/clave");
  redirect(inicioPorRol(s.perfil!.rol));
}
