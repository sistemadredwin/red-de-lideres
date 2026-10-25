import type { Rol } from "./tipos";

interface Opcion {
  href: string;
  etiqueta: string;
  roles: Rol[] | "todos";
}

const OPCIONES: Opcion[] = [{ href: "/inicio", etiqueta: "Inicio", roles: "todos" }];

export function opcionesParaRol(rol: Rol): Opcion[] {
  return OPCIONES.filter((o) => o.roles === "todos" || o.roles.includes(rol));
}