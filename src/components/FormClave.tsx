"use client";

import { useActionState } from "react";
import { cambiarMiClave, type EstadoClave } from "@/app/actions/auth";

export default function FormClave({ forzado = false }: { forzado?: boolean }) {
  const [estado, accion, pendiente] = useActionState<EstadoClave, FormData>(cambiarMiClave, {});
  return (
    <form action={accion} className="card" style={{ maxWidth: 460 }}>
      <h2>{forzado ? "Elige tu contraseña nueva" : "Cambiar contraseña"}</h2>
      {estado.ok && <div className="flash ok" role="status">Contraseña cambiada. Tienes 7 días hasta el próximo cambio.</div>}
      {estado.error && <div className="flash err" role="alert">{estado.error}</div>}
      <input type="hidden" name="forzado" value={forzado ? "1" : "0"} />
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="actual">{forzado ? "Contraseña que te dieron" : "Contraseña actual"}</label>
        <input id="actual" name="actual" type="password" autoComplete="current-password" required />
      </div>
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="nueva">Contraseña nueva</label>
        <input id="nueva" name="nueva" type="password" autoComplete="new-password" required minLength={10} maxLength={72} />
        <small>Mínimo 10 caracteres, con letras y números.</small>
      </div>
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="repetir">Repite la contraseña nueva</label>
        <input id="repetir" name="repetir" type="password" autoComplete="new-password" required />
      </div>
      <button className="btn" disabled={pendiente}>{pendiente ? "Guardando…" : "Guardar contraseña"}</button>
    </form>
  );
}
