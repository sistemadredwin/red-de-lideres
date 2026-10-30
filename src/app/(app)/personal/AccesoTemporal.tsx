"use client";

import { useActionState } from "react";
import { restablecerClave, type EstadoPersonal } from "./acciones";

const inicial: EstadoPersonal = {};

export default function AccesoTemporal({ perfilId }: { perfilId: string }) {
  const accionFila = async (_anterior: EstadoPersonal, datos: FormData) => restablecerClave(datos);
  const [estado, accion, pendiente] = useActionState(accionFila, inicial);
  return (
    <div className="bloque-acceso">
      <form action={accion}>
        <input type="hidden" name="perfil_id" value={perfilId} />
        <button className="boton pequeno secundario" type="submit" disabled={pendiente}>
          {pendiente ? "Generando…" : "Restablecer clave"}
        </button>
      </form>
      {estado.error ? <p className="error" role="alert">{estado.error}</p> : null}
      {estado.credenciales ? (
        <div className="aviso credenciales" role="status">
          <strong>Entrega estos datos a la persona por un canal seguro:</strong>
          <span>Código: <code>{estado.credenciales.usuario}</code></span>
          <span>Clave temporal: <code>{estado.credenciales.clave}</code></span>
          <span>Se le pedirá cambiarla al iniciar sesión.</span>
        </div>
      ) : null}
      {estado.aviso ? <p className="error" role="alert">{estado.aviso}</p> : null}
    </div>
  );
}
