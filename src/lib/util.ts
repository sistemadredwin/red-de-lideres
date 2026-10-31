// Utilidades compartidas (sin dependencias del servidor).

export const soloDigitos = (t: string) => t.replace(/\D/g, "");

export const cedulaValida = (t: string) => /^\d{6,10}$/.test(t);

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
}

export function porcentaje(n: number, total: number): number {
  return total > 0 ? Math.min(100, Math.round((n / total) * 100)) : 0;
}

export function paginaDe(valor: string | string[] | undefined): number {
  const n = parseInt(Array.isArray(valor) ? valor[0] : (valor ?? "1"), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function textoDe(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export const POR_PAGINA = 25;

// Texto de búsqueda seguro para usarlo dentro de un filtro de PostgREST.
export function limpiarBusqueda(t: string): string {
  return t.replace(/[,()%*\\]/g, " ").trim().slice(0, 60);
}

function azar(alfabeto: string, longitud: number): string {
  const bytes = new Uint8Array(longitud);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

// Contraseña temporal legible (sin caracteres que se confunden). Siempre trae letras y números.
export function claveTemporal(longitud = 12): string {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const numeros = "23456789";
  return azar(letras, longitud - 3) + azar(numeros, 3);
}

// Código de acceso (lo que la persona escribe para entrar; NO es su cédula).
// Se guarda en mayúsculas; el correo interno de Supabase usa la versión en minúsculas.
export const normalizarUsuario = (t: string) => t.trim().toUpperCase();
export const usuarioValido = (t: string) => /^[A-Z0-9][A-Z0-9-]{3,19}$/.test(t);
export function codigoAcceso(prefijo = "LID"): string {
  return `${prefijo}-${azar("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6)}`;
}

// La contraseña de todos (menos el administrador) dura 7 días.
export const DIAS_CLAVE = 7;

// Reglas de la contraseña nueva. Devuelve el mensaje de error o null si está bien.
export function errorDeClave(clave: string): string | null {
  if (clave.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (clave.length > 72) return "La contraseña es demasiado larga (máximo 72 caracteres).";
  if (!/[A-Za-z]/.test(clave) || !/\d/.test(clave)) return "La contraseña debe mezclar letras y números.";
  return null;
}
