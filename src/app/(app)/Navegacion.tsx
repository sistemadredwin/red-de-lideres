"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OpcionMenu } from "@/lib/menu";

export default function Navegacion({ opciones }: { opciones: OpcionMenu[] }) {
  const ruta = usePathname();

  return (
    <nav aria-label="Navegación principal">
      {opciones.map((opcion) => (
        <Link
          key={opcion.href}
          href={opcion.href}
          aria-current={ruta === opcion.href ? "page" : undefined}
        >
          {opcion.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
