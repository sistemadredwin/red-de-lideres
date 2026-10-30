"use client";

import QRCode from "qrcode";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function ImagenQr({ ruta, nombre }: { ruta: string; nombre: string }) {
  const [imagen, setImagen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    QRCode.toDataURL(`${window.location.origin}${ruta}`, { errorCorrectionLevel: "M", margin: 1, width: 280 })
      .then((dataUrl) => {
        if (vigente) setImagen(dataUrl);
      })
      .catch((causa: unknown) => {
        if (vigente) setError(causa instanceof Error ? causa.message : "Error desconocido.");
      });
    return () => { vigente = false; };
  }, [ruta]);

  if (error) return <p className="error" role="alert">No se pudo generar el código QR: {error}</p>;
  if (!imagen) return <p className="nota" aria-live="polite">Generando código QR…</p>;
  return <Image className="qr-imagen" src={imagen} alt={`Código QR de ${nombre}`} width={280} height={280} unoptimized />;
}
