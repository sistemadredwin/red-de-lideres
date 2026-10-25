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

export interface Perfil {
  id: string;
  usuario: string;
  nombre_completo: string;
  rol: Rol;
  grupo: string | null;
  comuna_id: number | null;
  activo: boolean;
  debe_cambiar_clave: boolean;
  clave_vence_at: string | null;
}

export interface EstadoForm {
  error?: string;
}

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: "Administrador",
  coordinador: "Coordinador",
  lider_comuna: "Líder de comuna",
  lider_barrio: "Líder de barrio",
  logistica: "Logística",
  administrativo: "Administrativo",
  publicidad: "Publicidad",
  redes: "Redes",
  aspirante_consejo: "Aspirante al Concejo",
  aspirante_edil: "Aspirante a edil",
};