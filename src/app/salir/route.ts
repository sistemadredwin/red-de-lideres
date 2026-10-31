import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra la sesión y vuelve al login. Se usa desde el botón "Cerrar sesión" (POST)
// y cuando alguien tiene sesión pero su cuenta ya no está activa (GET con motivo).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const motivo = request.nextUrl.searchParams.get("motivo");
  const destino = new URL("/login", request.url);
  if (motivo === "sin-acceso") destino.searchParams.set("aviso", "sin-acceso");
  return NextResponse.redirect(destino);
}
