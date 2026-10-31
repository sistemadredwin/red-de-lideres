"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface Enlace {
  href: string;
  texto: string;
  insignia?: number;
}

export default function NavLinks({ enlaces }: { enlaces: Enlace[] }) {
  const ruta = usePathname();
  return (
    <nav className="nav" aria-label="Menú principal">
      {enlaces.map((e) => (
        <Link key={e.href} href={e.href} className="nb" aria-current={ruta === e.href || ruta.startsWith(e.href + "/") ? "page" : undefined}>
          <span>{e.texto}</span>
          {e.insignia ? <span className="bd">{e.insignia}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
