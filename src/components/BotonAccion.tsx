"use client";

import { useState, useTransition } from "react";

// Botón pequeño que ejecuta una acción del servidor y muestra el error si falla.
export default function BotonAccion({
  texto,
  accion,
  confirmar,
  clase = "btn small ghost",
}: {
  texto: string;
  accion: () => Promise<{ ok: boolean; error?: string }>;
  confirmar?: string;
  clase?: string;
}) {
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();
  return (
    <span>
      <button
        className={clase}
        disabled={pendiente}
        onClick={() => {
          if (confirmar && !window.confirm(confirmar)) return;
          setError("");
          empezar(async () => {
            const r = await accion();
            if (!r.ok) setError(r.error ?? "No se pudo completar.");
          });
        }}
      >
        {pendiente ? "…" : texto}
      </button>
      {error && <small style={{ color: "var(--alert)", display: "block", whiteSpace: "normal" }}>{error}</small>}
    </span>
  );
}
