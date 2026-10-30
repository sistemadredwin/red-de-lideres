"use client";

import { useId, useRef, useState } from "react";

export type OpcionCatalogo = {
  id: number;
  nombre: string;
  detalle?: string;
};

type Props = {
  name: string;
  label: string;
  placeholder: string;
  opciones: OpcionCatalogo[];
};

export default function CampoCatalogo({ name, label, placeholder, opciones }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [seleccion, setSeleccion] = useState<OpcionCatalogo | null>(null);
  const termino = normalizar(texto);
  const coincidencias = termino && !seleccion
    ? opciones.filter((opcion) =>
        normalizar(`${opcion.nombre} ${opcion.detalle ?? ""}`).includes(termino),
      )
    : [];
  const sugerencias = coincidencias.slice(0, 8);

  function cambiarTexto(valor: string) {
    setTexto(valor);
    setSeleccion(null);
    inputRef.current?.setCustomValidity(valor ? "Elige una opción de la lista." : "");
  }

  function seleccionar(opcion: OpcionCatalogo) {
    setTexto(opcion.nombre);
    setSeleccion(opcion);
    inputRef.current?.setCustomValidity("");
  }

  return (
    <div className="campo-catalogo">
      <label htmlFor={id}>{label}</label>
      <input
        ref={inputRef}
        id={id}
        type="search"
        value={texto}
        onChange={(evento) => cambiarTexto(evento.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        required
        aria-describedby={`${id}-ayuda`}
      />
      <input type="hidden" name={name} value={seleccion?.id ?? ""} />
      {sugerencias.length ? (
        <div className="campo-catalogo-sugerencias" aria-label={`${label}: sugerencias`}>
          {sugerencias.map((opcion) => (
            <button
              className="campo-catalogo-opcion"
              key={opcion.id}
              type="button"
              onClick={() => seleccionar(opcion)}
            >
              <span>{opcion.nombre}</span>
              {opcion.detalle ? <span className="campo-catalogo-detalle">{opcion.detalle}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <p className="campo-catalogo-ayuda" id={`${id}-ayuda`} aria-live="polite">
        {seleccion
          ? `${label} seleccionado${seleccion.detalle ? ` · ${seleccion.detalle}` : ""}`
          : termino
            ? coincidencias.length
              ? `Elige una opción${coincidencias.length > sugerencias.length ? ` · mostrando ${sugerencias.length} de ${coincidencias.length}` : ""}.`
              : `No encontramos coincidencias para “${texto}”.`
            : `Escribe para buscar ${label.toLocaleLowerCase()}.`}
      </p>
    </div>
  );
}

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}
