"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/app/actions/auth";

export default function LoginForm() {
  const [estado, accion, pendiente] = useActionState<EstadoLogin, FormData>(iniciarSesion, {});
  return (
    <form action={accion}>
      {estado.error && (
        <div className="flash err" role="alert">
          {estado.error}
        </div>
      )}
      <div className="field" style={{ marginBottom: 12 }}>
        <label htmlFor="usuario">Código de acceso</label>
        <input id="usuario" name="usuario" type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" required maxLength={30} />
      </div>
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="clave">Contraseña</label>
        <input id="clave" name="clave" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn" style={{ width: "100%" }} disabled={pendiente}>
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
