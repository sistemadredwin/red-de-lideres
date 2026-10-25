import Link from "next/link";
import { exigirSesionActiva } from "@/lib/sesion";
import { opcionesParaRol } from "@/lib/menu";
import { ETIQUETA_ROL } from "@/lib/tipos";
import { cerrarSesion } from "./acciones";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const perfil = await exigirSesionActiva();
  const opciones = opcionesParaRol(perfil.rol);

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">Red de Líderes</div>
        <nav>
          {opciones.map((o) => (
            <Link key={o.href} href={o.href}>{o.etiqueta}</Link>
          ))}
        </nav>
        <div className="quien">
          <strong>{perfil.nombre_completo}</strong>
          <span>{ETIQUETA_ROL[perfil.rol]}{perfil.grupo ? ` · ${perfil.grupo}` : ""}</span>
          <form action={cerrarSesion}>
            <button type="submit" className="boton secundario">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="contenido">{children}</main>
    </div>
  );
}