// Lectura centralizada de las variables de entorno de Supabase.
// Acepta el nombre nuevo (publishable / secret) y el antiguo (anon / service_role).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

// Dominio interno con el que se arma el correo de cada persona: <codigo>@<dominio>
export const LOGIN_DOMAIN = process.env.NEXT_PUBLIC_LOGIN_EMAIL_DOMAIN ?? "campana.local";

export function emailDeUsuario(usuario: string): string {
  return `${usuario.toLowerCase()}@${LOGIN_DOMAIN}`;
}

export function configuracionCompleta(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);
}
