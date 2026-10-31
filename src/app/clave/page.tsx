import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import FormClave from "@/components/FormClave";
import { getSesion, inicioPorRol } from "@/lib/session";

export const metadata = { title: "Cambiar contraseña · Red de Líderes" };

// Pantalla obligatoria: quien tiene una contraseña temporal o vencida no puede
// usar nada más hasta cambiarla.
export default async function ClaveObligatoria() {
  const s = await getSesion();
  if (s.estado === "sin_sesion") redirect("/login");
  if (s.estado === "sin_acceso") redirect("/salir?motivo=sin-acceso");
  if (s.estado === "ok") redirect(inicioPorRol(s.perfil!.rol));
  return (
    <div className="pub">
      <Logo />
      <h1 style={{ marginTop: 6 }}>{s.motivo === "vencida" ? "Tu contraseña venció" : "Cambia tu contraseña"}</h1>
      <p className="sub">
        {s.motivo === "vencida"
          ? "Por seguridad las contraseñas duran 7 días. Escribe la actual y elige una nueva."
          : "La contraseña que te dieron es temporal. Escribe esa y elige una propia para continuar."}
      </p>
      <FormClave forzado />
      <form action="/salir" method="post" style={{ marginTop: 12 }}>
        <button className="btn ghost small" type="submit">Cerrar sesión</button>
      </form>
    </div>
  );
}
