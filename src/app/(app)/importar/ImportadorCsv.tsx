"use client";

import { useRef, useState, useActionState } from "react";
import { importarCsv, type EstadoImportacion } from "./acciones";

type FilaImportacion = {
  fila: number;
  cedula: string;
  nombre: string;
  telefono: string;
  barrio: string;
  puesto: string;
  mesa: string;
};
type Lider = { id: string; nombre_completo: string; comuna: string };

const inicial: EstadoImportacion = {};
const encabezados: Record<keyof Omit<FilaImportacion, "fila">, string[]> = {
  cedula: ["cedula", "cc", "documento", "identificacion"],
  nombre: ["nombre", "nombres", "nombrecompleto"],
  telefono: ["telefono", "celular", "tel"],
  barrio: ["barrio"],
  puesto: ["puestodevotacion", "puestovotacion", "puesto"],
  mesa: ["mesa"],
};

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");
}

function parsearCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  const fuente = texto.replace(/^\uFEFF/, "");
  let comas = 0;
  let puntosYComas = 0;
  let enEncabezado = false;
  let comillasEncabezado = false;
  for (let i = 0; i < fuente.length && !enEncabezado; i++) {
    const caracter = fuente[i];
    if (caracter === '"' && fuente[i + 1] === '"' && comillasEncabezado) {
      i++;
    } else if (caracter === '"') {
      comillasEncabezado = !comillasEncabezado;
    } else if (!comillasEncabezado && caracter === ",") {
      comas++;
    } else if (!comillasEncabezado && caracter === ";") {
      puntosYComas++;
    } else if (!comillasEncabezado && (caracter === "\n" || caracter === "\r")) {
      enEncabezado = true;
    }
  }
  const separador = puntosYComas > comas ? ";" : ",";

  for (let i = 0; i < fuente.length; i++) {
    const caracter = fuente[i];
    if (entreComillas) {
      if (caracter === '"' && fuente[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (caracter === '"') {
        entreComillas = false;
      } else {
        celda += caracter;
      }
    } else if (caracter === '"' && celda.length === 0) {
      entreComillas = true;
    } else if (caracter === separador) {
      fila.push(celda.trim());
      celda = "";
    } else if (caracter === "\n" || caracter === "\r") {
      if (caracter === "\r" && fuente[i + 1] === "\n") i++;
      fila.push(celda.trim());
      if (fila.some((valor) => valor !== "")) filas.push(fila);
      fila = [];
      celda = "";
    } else {
      celda += caracter;
    }
  }
  if (entreComillas) throw new Error("El CSV tiene una comilla sin cerrar.");
  if (celda || fila.length) {
    fila.push(celda.trim());
    if (fila.some((valor) => valor !== "")) filas.push(fila);
  }
  return filas;
}

function leerFilas(texto: string): FilaImportacion[] {
  const filas = parsearCsv(texto);
  if (filas.length < 2) throw new Error("El archivo necesita una fila de encabezados y al menos una fila con datos.");
  const primera = filas[0].map(normalizar);
  const indices: Partial<Record<keyof Omit<FilaImportacion, "fila">, number>> = {};
  for (const [campo, nombres] of Object.entries(encabezados) as [keyof typeof encabezados, string[]][]) {
    const indice = primera.findIndex((valor) => nombres.includes(valor));
    if (indice >= 0) indices[campo] = indice;
  }
  if (indices.cedula === undefined || indices.nombre === undefined) {
    throw new Error("No encontré las columnas obligatorias: cédula y nombre.");
  }
  if (indices.barrio === undefined || indices.puesto === undefined) {
    throw new Error("Incluye también las columnas barrio y puesto de votación.");
  }

  return filas.slice(1).map((celdas, indiceFila) => {
    const valor = (campo: keyof typeof encabezados) => celdas[indices[campo] ?? -1] ?? "";
    return {
      fila: indiceFila + 2,
      cedula: valor("cedula").replace(/\D/g, ""),
      nombre: valor("nombre"),
      telefono: valor("telefono"),
      barrio: valor("barrio"),
      puesto: valor("puesto"),
      mesa: valor("mesa"),
    };
  });
}

export default function ImportadorCsv({ lideres }: { lideres: Lider[] }) {
  const [estado, accion, pendiente] = useActionState(importarCsv, inicial);
  const [filas, setFilas] = useState<FilaImportacion[]>([]);
  const [errorArchivo, setErrorArchivo] = useState("");
  const entrada = useRef<HTMLInputElement>(null);
  const filasJson = JSON.stringify(filas);

  async function seleccionarArchivo(archivo?: File) {
    setFilas([]);
    setErrorArchivo("");
    if (!archivo) return;
    if (!archivo.name.toLowerCase().endsWith(".csv")) {
      setErrorArchivo("Por seguridad, esta versión importa archivos .csv. En Excel, usa Guardar como → CSV UTF-8.");
      return;
    }
    if (archivo.size > 1_000_000) {
      setErrorArchivo("El archivo supera el límite de 1 MB.");
      return;
    }
    try {
      const resultado = leerFilas(await archivo.text());
      if (resultado.length > 2000) throw new Error("El máximo permitido es 2.000 filas por archivo.");
      if (new TextEncoder().encode(JSON.stringify(resultado)).length > 650_000) {
        throw new Error("El archivo tiene demasiado contenido para procesarse. Divídelo en archivos más pequeños.");
      }
      setFilas(resultado);
    } catch (causa) {
      setErrorArchivo(causa instanceof Error ? causa.message : "No se pudo leer el CSV.");
    }
  }

  return (
    <div className="panel">
      {estado.error ? <div className="error" role="alert">{estado.error}</div> : null}
      {estado.resultado ? (
        <div className="aviso" role="status">
          Importación terminada: {estado.resultado.nuevos} nuevos, {estado.resultado.repetidos} repetidos y {estado.resultado.errores} con errores.
          {estado.resultado.filas_con_error.length ? (
            <ul>{estado.resultado.filas_con_error.slice(0, 20).map((fila, i) => <li key={`${fila.fila}-${i}`}>Fila {fila.fila}: {fila.motivo}</li>)}</ul>
          ) : null}
        </div>
      ) : null}
      {errorArchivo ? <div className="error" role="alert">{errorArchivo}</div> : null}
      {lideres.length ? (
        <form action={accion} className="formulario">
          <label>
            Asignar a
            <select name="lider_id" required defaultValue="">
              <option value="" disabled>Selecciona un líder</option>
              {lideres.map((lider) => <option key={lider.id} value={lider.id}>{lider.nombre_completo} ({lider.comuna})</option>)}
            </select>
          </label>
          <label>
            Archivo CSV
            <input ref={entrada} type="file" accept=".csv,text/csv" required onChange={(evento) => seleccionarArchivo(evento.target.files?.[0])} />
          </label>
          {filas.length ? (
            <>
              <p>{filas.length} filas listas. Vista previa de las primeras 20:</p>
              <div className="tabla-contenedor">
                <table>
                  <thead><tr><th>Fila</th><th>Cédula</th><th>Nombre</th><th>Barrio</th><th>Puesto</th></tr></thead>
                  <tbody>{filas.slice(0, 20).map((fila) => <tr key={fila.fila}><td>{fila.fila}</td><td>{fila.cedula}</td><td>{fila.nombre}</td><td>{fila.barrio}</td><td>{fila.puesto}</td></tr>)}</tbody>
                </table>
              </div>
              <input type="hidden" name="filas" value={filasJson} />
              <label className="check"><input name="autorizo" type="checkbox" required />Confirmo que cuento con autorización para tratar los datos de las personas de esta lista.</label>
              <button className="boton" type="submit" disabled={pendiente || Boolean(estado.resultado)}>
                {pendiente ? "Importando..." : estado.resultado ? "Importación terminada" : `Importar ${filas.length} filas`}
              </button>
            </>
          ) : null}
        </form>
      ) : <p className="vacio">No hay líderes activos disponibles para asignar registros.</p>}
      <p className="nota">Columnas necesarias: cédula, nombre, barrio y puesto de votación. Opcionales: teléfono y mesa. Máximo 2.000 filas.</p>
    </div>
  );
}
