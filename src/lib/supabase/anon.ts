import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "./env";

// Cliente SIN sesión: ejecuta como "anon". Solo sirve para las dos funciones
// públicas del QR (qr_info y registrar_votante_qr).
export function createAnonClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
