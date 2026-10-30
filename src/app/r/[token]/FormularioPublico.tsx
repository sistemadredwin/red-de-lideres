"use client";

import { useActionState } from "react";
import { registrarPorQr } from "./acciones";
import type { EstadoForm } from "@/lib/tipos";

type Opcion = { id: number; nombre: string };
type EstadoPublico = EstadoForm & { enviado?: boolean };

export default function FormularioPublico({
  token,
  barrios,
  puestos,
}: {
  token: string;
  barrios: Opcion[];
  puestos: Opcion[];
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
      <label>Cédula<input name="cedula" inputMode="numeric" autoComplete="off" required minLength={6} maxLength={10} /></label>
      <label>Nombre completo<input name="nombre" autoComplete="name" required maxLength={200} /></label>
      <label>Teléfono (opcional)<input name="telefono" type="tel" autoComplete="tel" maxLength={30} /></label>
      <label>Barrio<select name="barrio_id" required defaultValue=""><option value="" disabled>Selecciona un barrio</option>{barrios.map((barrio) => <option key={barrio.id} value={barrio.id}>{barrio.nombre}</option>)}</select></label>
      <label>Puesto de votación<select name="puesto_id" required defaultValue=""><option value="" disabled>Selecciona un puesto</option>{puestos.map((puesto) => <option key={puesto.id} value={puesto.id}>{puesto.nombre}</option>)}</select></label>
      <label>Mesa (opcional)<input name="mesa" maxLength={20} /></label>
      <label className="check"><input name="autorizo" type="checkbox" required />Autorizo el tratamiento de mis datos personales para los fines de esta campaña.</label>
      <button className="boton" type="submit" disabled={pendiente}>{pendiente ? "Enviando..." : "Registrarme"}</button>
    </form>
  );
}
