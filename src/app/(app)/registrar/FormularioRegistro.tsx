"use client";

import { useActionState } from "react";
import { registrarVotante } from "../acciones-votantes";
import CampoCatalogo, { type OpcionCatalogo } from "@/components/CampoCatalogo";
import ConfirmacionRegistro from "@/components/ConfirmacionRegistro";

export default function FormularioRegistro({
  barrios,
  puestos,
}: {
  barrios: OpcionCatalogo[];
  puestos: OpcionCatalogo[];
}) {
  const [estado, accion, pendiente] = useActionState(registrarVotante, {});

  return (
    <form action={accion} className="panel formulario">
      {estado.error ? <div className="error" role="alert">{estado.error}</div> : null}
      <div className="formulario-grid">
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
        <CampoCatalogo name="barrio_id" label="Barrio" placeholder="Escribe el nombre del barrio" opciones={barrios} />
        <CampoCatalogo name="puesto_id" label="Puesto de votación" placeholder="Escribe el nombre del puesto" opciones={puestos} />
        <label>
          Mesa (opcional)
          <input name="mesa" maxLength={20} />
        </label>
      </div>
      <ConfirmacionRegistro
        pendiente={pendiente}
        textoBoton="Finalizar"
        textoPendiente="Guardando..."
        textoAutorizacion="La persona autorizó el tratamiento de sus datos personales para los fines de esta campaña."
      />
    </form>
  );
}
