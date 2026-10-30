"use client";

import { useActionState } from "react";
import { registrarPorQr } from "./acciones";
import type { EstadoForm } from "@/lib/tipos";
import CampoCatalogo, { type OpcionCatalogo } from "@/components/CampoCatalogo";
import ConfirmacionRegistro from "@/components/ConfirmacionRegistro";

type EstadoPublico = EstadoForm & { enviado?: boolean };

export default function FormularioPublico({
  token,
  barrios,
  puestos,
}: {
  token: string;
  barrios: OpcionCatalogo[];
  puestos: OpcionCatalogo[];
}) {
  const accionToken = registrarPorQr.bind(null, token);
  const [estado, accion, pendiente] = useActionState(
    async (anterior: EstadoForm, datos: FormData): Promise<EstadoPublico> => {
      const resultado = await accionToken(anterior, datos);
      return resultado.error === "" ? { enviado: true } : resultado;
    },
    {},
  );

  if ((estado as EstadoPublico).enviado) {
    return (
      <section className="panel centrado">
        <h2>¡Listo, recibimos tu registro!</h2>
        <p>Gracias por completar el formulario.</p>
        <p>Si la cédula ya estaba registrada, el sistema evitó crear otro registro.</p>
      </section>
    );
  }

  return (
    <form action={accion} className="panel formulario">
      {estado.error ? <div className="error" role="alert">{estado.error}</div> : null}
      <div className="formulario-grid">
        <label>Cédula<input name="cedula" inputMode="numeric" autoComplete="off" required minLength={6} maxLength={10} /></label>
        <label>Nombre completo<input name="nombre" autoComplete="name" required maxLength={200} /></label>
        <label>Teléfono (opcional)<input name="telefono" type="tel" autoComplete="tel" maxLength={30} /></label>
        <CampoCatalogo name="barrio_id" label="Barrio" placeholder="Escribe el nombre del barrio" opciones={barrios} />
        <CampoCatalogo name="puesto_id" label="Puesto de votación" placeholder="Escribe el nombre del puesto" opciones={puestos} />
        <label>Mesa (opcional)<input name="mesa" maxLength={20} /></label>
      </div>
      <ConfirmacionRegistro
        pendiente={pendiente}
        textoBoton="Registrarme"
        textoPendiente="Enviando registro..."
        textoAutorizacion="Autorizo el tratamiento de mis datos personales para los fines de esta campaña."
      />
    </form>
  );
}
