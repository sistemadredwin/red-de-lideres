import "server-only";
import { createClient } from "@supabase/supabase-js";

function variableRequerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta configurar ${nombre} en el archivo .env.local.`);
  return valor;
}

export function crearClienteAdmin() {
  return createClient(variableRequerida("NEXT_PUBLIC_SUPABASE_URL"), variableRequerida("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function crearClienteSinSesion() {
  return createClient(variableRequerida("NEXT_PUBLIC_SUPABASE_URL"), variableRequerida("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}