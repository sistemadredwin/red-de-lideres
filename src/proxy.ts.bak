import { NextResponse, type NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/sesion-proxy";

// Primera barrera: sin sesión solo se ve /login y el formulario público del QR (/r/...).
// La barrera real está en cada página (exigirSesionActiva) y en la base de datos (RLS).
export async function proxy(request: NextRequest) {
  const { respuesta, hayUsuario } = await actualizarSesion(request);
  const ruta = request.nextUrl.pathname;
  const esPublica = ruta === "/login" || ruta.startsWith("/r/");

  if (!hayUsuario && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};