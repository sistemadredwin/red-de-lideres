import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

// Cliente con la llave secreta: se salta las reglas de seguridad. SOLO se usa
// en el servidor, para crear cuentas de acceso, y siempre después de comprobar
// que quien lo pide es administrador. Esta llave nunca debe llegar al navegador.
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY en las variables de entorno.");
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
