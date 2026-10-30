"use client";

import { useActionState } from "react";
import { registrarVotante } from "../acciones-votantes";

type Opcion = { id: number; nombre: string };

export default function FormularioRegistro({
  barrios,
  puestos,
}: {
  barrios: Opcion[];
  puestos: Opcion[];
}) {
  const [estado, accion, pendiente] = useActionState(registrarVotante, {});

  return (
    <form action={accion} className="panel formulario">
      {estado.error ? <div className="error" role="alert">{estado.error}</div> : null}
      <label>
        Cédula
        <input name="cedula" inputMode="numeric" autoComplete="off" required minLength={6} maxLength={10} />
      </label>
      <label>
        Nombre completo
        <input name="nombre" autoComplete="name" required maxLength={200} />
      </label>
      <label>
        Teléfono (opcional)
        <input name="telefono" type="tel" autoComplete="tel" maxLength={30} />
      </label>
      <label>
        Barrio
        <select name="barrio_id" required defaultValue="">
          <option value="" disabled>Selecciona un barrio</option>
          {barrios.map((barrio) => <option key={barrio.id} value={barrio.id}>{barrio.nombre}</option>)}
        </select>
      </label>
      <label>
        Puesto de votación
        <select name="puesto_id" required defaultValue="">
          <option value="" disabled>Selecciona un puesto</option>
          {puestos.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>)}
        </select>
      </label>
      <label>
        Mesa (opcional)
        <input name="mesa" maxLength={20} />
      </label>
      <label className="check">
        <input name="autorizo" type="checkbox" required />
        La persona autorizó el tratamiento de sus datos personales para los fines de esta campaña.
      </label>
      <button className="boton" type="submit" disabled={pendiente}>
        {pendiente ? "Guardando..." : "Guardar votante"}
      </button>
    </form>
  );
}
