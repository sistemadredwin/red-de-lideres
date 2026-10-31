import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL, configuracionCompleta } from "./env";

// Rutas que se pueden abrir sin haber iniciado sesión.
const PUBLICAS = ["/login", "/salir", "/r/"];

// Refresca la sesión en cada petición y manda al login a quien no la tiene.
// Es solo una revisión rápida: la autorización real se hace en cada página y
// dentro de la base de datos.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!configuracionCompleta()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const esPublica = PUBLICAS.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : p + "/"));

  if (!data?.claims && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
