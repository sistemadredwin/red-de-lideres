"use client";

import { useState, useTransition } from "react";
import { cambiarEstado } from "@/app/actions/votantes";
import { ESTADOS, ESTADO_LABEL, type Estado } from "@/lib/types";

export default function EstadoSelect({ id, estado, editable, nombre }: { id: number; estado: Estado; editable: boolean; nombre: string }) {
  const [valor, setValor] = useState<Estado>(estado);
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();

  if (!editable) return <span className="tag">{ESTADO_LABEL[estado]}</span>;

  function cambiar(nuevo: Estado) {
    const anterior = valor;
    setValor(nuevo);
    setError("");
    empezar(async () => {
      const r = await cambiarEstado(id, nuevo);
      if (!r.ok) {
        setValor(anterior);
        setError(r.error ?? "No se pudo cambiar.");
      }
    });
  }

  return (
    <span>
      <select value={valor} disabled={pendiente} onChange={(e) => cambiar(e.target.value as Estado)} aria-label={`Estado de ${nombre}`} style={{ minWidth: 140 }}>
        {ESTADOS.map((e) => (
          <option key={e} value={e}>
            {ESTADO_LABEL[e]}
          </option>
        ))}
      </select>
      {error && <small style={{ color: "var(--alert)", display: "block" }}>{error}</small>}
    </span>
  );
}
