"use client";

import { useActionState } from "react";
import { iniciarSesion } from "./acciones";
import type { EstadoForm } from "@/lib/tipos";

const inicial: EstadoForm = {};

export default function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, inicial);

  return (
    <form action={accion} className="tarjeta">
      <h1>Red de Líderes</h1>
      <p>Entra con tu código de acceso.</p>
      {estado.error ? <div className="error" role="alert">{estado.error}</div> : null}
      <label>
        Código de acceso
        <input name="usuario" autoComplete="username" autoCapitalize="characters" required maxLength={20} />
      </label>
      <label>
        Contraseña
        <input name="clave" type="password" autoComplete="current-password" required maxLength={200} />
      </label>
      <button className="boton" type="submit" disabled={pendiente}>
        {pendiente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}