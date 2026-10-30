"use client";

type Props = {
  pendiente: boolean;
  textoBoton: string;
  textoPendiente: string;
  textoAutorizacion: string;
};

export default function ConfirmacionRegistro({
  pendiente,
  textoBoton,
  textoPendiente,
  textoAutorizacion,
}: Props) {
  return (
    <section className="confirmacion-registro" aria-labelledby="confirmacion-registro-titulo">
      <div className="confirmacion-registro-encabezado">
        <h2 id="confirmacion-registro-titulo">Finalizar registro</h2>
      </div>
      <label className="check confirmacion-registro-check">
        <input name="autorizo" type="checkbox" required />
        <span>{textoAutorizacion}</span>
      </label>
      <button className="boton confirmacion-registro-boton" type="submit" disabled={pendiente}>
        {pendiente ? textoPendiente : textoBoton}
      </button>
    </section>
  );
}
