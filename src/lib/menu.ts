import type { Rol } from "./tipos";

export interface OpcionMenu {
  href: string;
  etiqueta: string;
  roles: Rol[] | "todos";
}

const ADMIN: Rol[] = ["admin"];
const COORDINACION: Rol[] = ["admin", "coordinador"];
const LIDERES: Rol[] = ["admin", "lider_comuna", "lider_barrio"];
const TODOS: Rol[] = [
  "admin", "coordinador", "lider_comuna", "lider_barrio", "logistica",
  "administrativo", "publicidad", "redes", "aspirante_consejo", "aspirante_edil",
];

const OPCIONES: OpcionMenu[] = [
  { href: "/inicio", etiqueta: "Resumen", roles: TODOS },
  { href: "/votantes", etiqueta: "Votantes", roles: COORDINACION },
  { href: "/duplicados", etiqueta: "Duplicados", roles: ADMIN },
  { href: "/importar", etiqueta: "Importar lista", roles: ADMIN },
  { href: "/personal", etiqueta: "Personal", roles: ADMIN },
  { href: "/qr", etiqueta: "Códigos QR", roles: LIDERES },
  { href: "/puestos", etiqueta: "Puestos de votación", roles: ADMIN },
  { href: "/registrar", etiqueta: "Registrar votante", roles: ["lider_comuna", "lider_barrio"] },
  { href: "/mis-votantes", etiqueta: "Mis votantes", roles: ["lider_comuna", "lider_barrio"] },
];

export function opcionesParaRol(rol: Rol): OpcionMenu[] {
  return OPCIONES.filter((o) => o.roles === "todos" || o.roles.includes(rol));
}