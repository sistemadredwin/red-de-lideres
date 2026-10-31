import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LoginForm from "./LoginForm";
import { getSesion, inicioPorRol } from "@/lib/session";
import { configuracionCompleta } from "@/lib/supabase/env";

export const metadata = { title: "Iniciar sesión · Red de Líderes" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const { aviso } = await searchParams;
  if (configuracionCompleta()) {
    const s = await getSesion();
    if (s.estado === "ok") redirect(inicioPorRol(s.perfil!.rol));
    if (s.estado === "cambiar_clave") redirect("/clave");
  }
  return (
    <main className="login login-simple">
      <section className="login-card">
        <Logo />
        <h1>Buenaventura estoy contigo</h1>
        <h2>Iniciar sesión</h2>
        {aviso === "sin-acceso" && (
          <div className="flash warn" role="alert">
            Tu cuenta no está activa. Pide a la administración que la revise.
          </div>
        )}
        <LoginForm />
        <p style={{ margin: "12px 0 0", fontSize: 13, color: "var(--muted)" }}>
          ¿Olvidaste tu contraseña? Pide a la administración que la restablezca.
        </p>
      </section>
    </main>
  );
}
