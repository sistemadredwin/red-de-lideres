import Link from "next/link";
import Logo from "@/components/Logo";
import NavLinks, { type Enlace } from "@/components/NavLinks";
import { requirePerfil } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ROL_LABEL, type Perfil } from "@/lib/types";

async function enlacesDe(perfil: Perfil): Promise<Enlace[]> {
  switch (perfil.rol) {
    case "admin": {
      const supabase = await createClient();
      const { count } = await supabase
        .from("intentos_duplicados")
        .select("id", { count: "exact", head: true })
        .eq("revisado", false);
      return [
        { href: "/resumen", texto: "Resumen" },
        { href: "/votantes", texto: "Votantes" },
        { href: "/duplicados", texto: "Duplicados", insignia: count ?? 0 },
        { href: "/importar", texto: "Importar lista" },
        { href: "/personal", texto: "Personal" },
        { href: "/codigos-qr", texto: "Códigos QR" },
        { href: "/puestos", texto: "Puestos de votación" },
        { href: "/catalogos", texto: "Comunas y barrios" },
        { href: "/actividad", texto: "Actividad" },
      ];
    }
    case "coordinador":
      return [
        { href: "/resumen", texto: "Resumen de mi comuna" },
        { href: "/votantes", texto: "Votantes de mi comuna" },
      ];
    case "lider_comuna":
      return [
        { href: "/registrar", texto: "Registrar votante" },
        { href: "/mis-votantes", texto: "Mis votantes" },
        { href: "/mi-equipo", texto: "Mi equipo" },
        { href: "/mi-qr", texto: "Mi código QR" },
      ];
    default:
      return [
        { href: "/registrar", texto: "Registrar votante" },
        { href: "/mis-votantes", texto: "Mis votantes" },
        { href: "/mi-qr", texto: "Mi código QR" },
      ];
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requirePerfil();
  const enlaces = await enlacesDe(perfil);
  return (
    <div className="app">
      <aside className="side">
        <Logo />
        <NavLinks enlaces={enlaces} />
        <div className="who">
          <div>
            <b>{perfil.nombre_completo}</b>
            <span>{ROL_LABEL[perfil.rol]}</span>
          </div>
          <div className="row">
            <Link className="btn small ghost" href="/cuenta">
              Mi cuenta
            </Link>
            <form action="/salir" method="post">
              <button className="btn small ghost" type="submit">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
