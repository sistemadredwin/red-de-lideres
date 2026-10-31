"use client";

import { useState, useTransition } from "react";
import { cambiarMeta } from "@/app/actions/votantes";
import { porcentaje } from "@/lib/util";

export default function MetaCard({ perfilId, registrados, meta }: { perfilId: string; registrados: number; meta: number }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(meta));
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();
  const pct = porcentaje(registrados, meta);

  function guardar() {
    setError("");
    empezar(async () => {
      const r = await cambiarMeta(perfilId, Number(valor));
      if (r.ok) setEditando(false);
      else setError(r.error ?? "No se pudo guardar.");
    });
  }

  return (
    <div className="card">
      <div className="mhead">
        <h3>
          Tu meta: {registrados} de {meta} votantes
        </h3>
        {editando ? (
          <div className="metaedit">
            <input type="number" min={1} value={valor} onChange={(e) => setValor(e.target.value)} aria-label="Nueva meta" />
            <button className="btn small" onClick={guardar} disabled={pendiente}>
              Guardar
            </button>
            <button className="btn small ghost" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button className="btn small ghost" onClick={() => { setValor(String(meta)); setEditando(true); }}>
            Cambiar meta
          </button>
        )}
      </div>
      {error && (
        <div className="flash err" role="alert">
          {error}
        </div>
      )}
      <div className="bar" style={{ gridTemplateColumns: "1fr 50px" }}>
        <span className="tr">
          <i style={{ width: `${pct}%` }} />
        </span>
        <b>{pct}%</b>
      </div>
    </div>
  );
}
