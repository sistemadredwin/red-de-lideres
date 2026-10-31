export type Rol =
  | "admin"
  | "coordinador"
  | "lider_comuna"
  | "lider_barrio"
  | "logistica"
  | "administrativo"
  | "publicidad"
  | "redes"
  | "aspirante_consejo"
  | "aspirante_edil";

export type Estado = "por_contactar" | "contactado" | "confirmado";

export const ROL_LABEL: Record<Rol, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  lider_comuna: "Líder de comuna",
  lider_barrio: "Líder de barrio",
  logistica: "Logística",
  administrativo: "Administrativo",
  publicidad: "Publicidad",
  redes: "Redes",
  aspirante_consejo: "Aspirante a consejo",
  aspirante_edil: "Aspirante a edil",
};

export const ESTADOS: Estado[] = ["por_contactar", "contactado", "confirmado"];

export const ESTADO_LABEL: Record<Estado, string> = {
  por_contactar: "Por contactar",
  contactado: "Contactado",
  confirmado: "Confirmado",
};

export const ESTADO_COLOR: Record<Estado, string> = {
  por_contactar: "#b7c2bb",
  contactado: "#f5c400",
  confirmado: "#1e7b45",
};

// Quiénes pueden entrar al sistema (tienen cuenta de acceso).
export const ROLES_CON_ACCESO: Rol[] = ["admin", "coordinador", "lider_comuna", "lider_barrio"];

export const esLider = (rol: Rol) => rol === "lider_comuna" || rol === "lider_barrio";

export interface Perfil {
  id: string;
  cedula: string;
  usuario: string;
  nombre_completo: string;
  rol: Rol;
  comuna_id: number | null;
  meta: number;
  grupo: "G8" | null;
  activo: boolean;
}

export interface VotanteFila {
  id: number;
  cedula: string;
  nombre_completo: string;
  telefono: string | null;
  mesa: string | null;
  estado: Estado;
  origen: "manual" | "excel" | "qr";
  verificado: boolean;
  activo: boolean;
  created_at: string;
  barrios: { nombre: string } | null;
  puestos_votacion: { nombre: string } | null;
  comunas: { nombre: string } | null;
  perfiles: { nombre_completo: string } | null;
}

export interface Opcion {
  id: number;
  nombre: string;
}

// Resultado que devuelven las funciones de registro de la base de datos.
export interface ResultadoRegistro {
  resultado: "ok" | "duplicado" | "recibido" | "error" | "codigo_invalido" | "demasiados_intentos";
  motivo?: string;
  id?: number;
}
