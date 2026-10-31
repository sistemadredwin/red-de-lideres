import Logo from "@/components/Logo";
import FormQr from "@/components/FormQr";
import { infoQr } from "@/app/actions/publico";

export const metadata = { title: "Regístrate · Red de Líderes", robots: { index: false, follow: false } };

// Página pública: la abre quien escanea el QR de un líder. No pide contraseña.
export default async function RegistroPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const info = await infoQr(token);

  return (
    <div className="pub">
      <Logo />
      {info.resultado === "ok" ? (
        <FormQr token={token} lider={info.lider ?? ""} comuna={info.comuna ?? ""} barrios={info.barrios ?? []} puestos={info.puestos ?? []} />
      ) : (
        <div className="card">
          <h2>Este código ya no está activo</h2>
          <p style={{ color: "var(--muted)" }}>Pide ayuda a tu líder.</p>
        </div>
      )}
    </div>
  );
}
