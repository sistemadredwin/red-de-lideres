"use client";

import { useActionState } from "react";
import { cambiarClave } from "./acciones";
import type { EstadoForm } from "@/lib/tipos";

const inicial: EstadoForm = {};

export default function FormularioClave() {
  const [estado, accion, pendiente] = useActionState(cambiarClave, inicial);

  return (
    <form action={accion} className="tarjeta">
      <h1>Cambia tu contraseña</h1>
      <p>Mínimo 12 caracteres, con letras y números. No puede ser igual a la anterior.</p>
      {estado.error ? <div className="error" role="alert">{estado.error}</div> : null}
      <label>
        Contraseña nueva
        <input name="nueva" type="password" autoComplete="new-password" required minLength={12} maxLength={72} />
      </label>
      <label>
        Repite la contraseña nueva
        <input name="repetir" type="password" autoComplete="new-password" required minLength={12} maxLength={72} />
      </label>
      <button className="boton" type="submit" disabled={pendiente}>
        {pendiente ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}