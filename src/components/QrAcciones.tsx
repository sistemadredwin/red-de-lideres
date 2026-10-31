"use client";

import { useState, useTransition } from "react";
import { cambiarQrActivo } from "@/app/actions/votantes";

export default function QrAcciones({ perfilId, url, nombre, esAdmin = false, qrActivo = true }: { perfilId: string; url: string; nombre: string; esAdmin?: boolean; qrActivo?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar. Selecciona el enlace y cópialo a mano.");
    }
  }

  // Descarga el QR como imagen PNG (para imprimirlo en volantes o camisetas).
  function descargar() {
    const svg = document.querySelector<SVGSVGElement>(`svg.qr[data-perfil="${perfilId}"]`) ?? document.querySelector<SVGSVGElement>("svg.qr");
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const lado = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = lado;
      canvas.height = lado;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, lado, lado);
      ctx.drawImage(img, 0, 0, lado, lado);
      const a = document.createElement("a");
      a.download = `qr-${nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
  }

  function alternar() {
    setError("");
    empezar(async () => {
      const r = await cambiarQrActivo(perfilId, !qrActivo);
      if (!r.ok) setError(r.error ?? "No se pudo cambiar el estado del QR.");
    });
  }

  return (
    <div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn small" onClick={copiar}>
          {copiado ? "Enlace copiado" : "Copiar enlace"}
        </button>
        <button className="btn small ghost" onClick={descargar}>
          Descargar imagen
        </button>
        {esAdmin && (
          <button className="btn small ghost" onClick={alternar} disabled={pendiente}>
            {qrActivo ? "Pausar QR" : "Reactivar QR"}
          </button>
        )}
      </div>
      {error && (
        <div className="flash err" role="alert" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
    </div>
  );
}
