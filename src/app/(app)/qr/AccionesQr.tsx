"use client";

import { useState } from "react";

export default function AccionesQr({ ruta }: { ruta: string }) {
  const [mensaje, setMensaje] = useState("");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${ruta}`);
      setMensaje("Enlace copiado.");
    } catch (error) {
      setMensaje(`No se pudo copiar el enlace: ${error instanceof Error ? error.message : "error desconocido."}`);
    }
  }

  return (
    <div className="acciones">
      <a className="enlace" href={ruta} target="_blank" rel="noreferrer">Abrir formulario</a>
      <button className="boton pequeno secundario" type="button" onClick={copiar}>Copiar enlace</button>
      {mensaje ? <span role="status" className="nota">{mensaje}</span> : null}
    </div>
  );
}
