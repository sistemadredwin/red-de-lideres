"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { importarVotantes, type ResultadoImportacion } from "@/app/actions/votantes";
import { revisarImportacion, type FilaRevisada } from "@/app/actions/importar";
import { leerPlanilla, normalizarNombre, type Cabecera, type FilaExcel, type Planilla } from "@/lib/excel";

interface Lider {
  id: string;
  nombre: string;
  comuna: string;
}

const MAX_BYTES = 8 * 1024 * 1024;

export default function ImportarExcel({ lideres }: { lideres: Lider[] }) {
  const [liderId, setLiderId] = useState(lideres[0]?.id ?? "");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [autorizo, setAutorizo] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState<{ nombre: string; filas: FilaRevisada[]; originales: FilaExcel[]; cabecera: Cabecera; autoLider: boolean } | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [pendiente, empezar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  function elegir(f: File | undefined | null) {
    if (!f) return;
    setArchivo(f);
    setError("");
  }

  function revisar() {
    setError("");
    setResultado(null);
    if (!liderId) return setError("Elige a qué líder se asignará la lista.");
    if (!archivo) return setError("Elige un archivo de Excel (.xlsx).");
    if (!/\.xlsx$/i.test(archivo.name)) return setError("El archivo debe ser de Excel en formato .xlsx. Si es un .xls, ábrelo en Excel y guárdalo como .xlsx.");
    if (archivo.size > MAX_BYTES) return setError("El archivo pesa más de 8 MB. Divídelo en partes.");
    if (!autorizo) return setError("Marca la confirmación de autorización antes de continuar.");

    empezar(async () => {
      let planilla: Planilla;
      try {
        const { readSheet } = await import("read-excel-file/browser");
        planilla = leerPlanilla((await readSheet(archivo)) as unknown[][]);
      } catch (causa) {
        console.error("No se pudo leer el archivo de Excel.", causa);
        setError("No se pudo leer el archivo. Verifica que sea un .xlsx válido y que no esté dañado.");
        return;
      }

      if (!planilla.filas.length) {
        setError("No encontré votantes en el archivo. Usa la plantilla y llena desde la primera fila de la tabla.");
        return;
      }
      if (planilla.filas.some((fila) => !fila.barrio)) {
        setError("El Excel se pudo leer, pero falta indicar el barrio en el encabezado de la planilla. Complétalo y vuelve a cargar el archivo.");
        return;
      }

      // Si la planilla trae el nombre del líder y coincide con uno solo, se asigna sola.
      let destino = liderId;
      let auto = false;
      const buscado = normalizarNombre(planilla.cabecera.lider);
      if (buscado) {
        const coincide = lideres.filter((l) => normalizarNombre(l.nombre) === buscado);
        if (coincide.length === 1) {
          destino = coincide[0].id;
          auto = true;
          setLiderId(destino);
        }
      }
      try {
        const r = await revisarImportacion(destino, planilla.filas);
        if (!r.ok || !r.filas) return setError(r.error ?? "No se pudo revisar el archivo.");
        setRevision({ nombre: archivo.name, filas: r.filas, originales: planilla.filas, cabecera: planilla.cabecera, autoLider: auto });
      } catch (causa) {
        console.error("No se pudo revisar la planilla contra la base de datos.", causa);
        setError("La planilla se leyó correctamente, pero no se pudo revisar contra la base de datos. Recarga la página y vuelve a intentar.");
      }
    });
  }

  function confirmar() {
    if (!revision) return;
    const aImportar = revision.filas.filter((f) => f.estado !== "error");
    const originales = new Map(revision.originales.map((o) => [o.fila, o]));
    empezar(async () => {
      const r = await importarVotantes(
        liderId,
        aImportar.map((f) => originales.get(f.fila)!),
        autorizo,
      );
      setResultado({ ...r, errores: (r.errores ?? 0) + revision.filas.length - aImportar.length });
      setRevision(null);
      setArchivo(null);
      setAutorizo(false);
    });
  }

  // ---------- vista previa ----------
  if (revision) {
    const cuenta = (e: FilaRevisada["estado"]) => revision.filas.filter((f) => f.estado === e).length;
    const lider = lideres.find((l) => l.id === liderId);
    return (
      <>
        <div className="grid kpis">
          <div className="kpi"><div className="n">{cuenta("nueva")}</div><div className="l">Nuevas</div></div>
          <div className={`kpi${cuenta("repetida") ? " red" : ""}`}><div className="n">{cuenta("repetida")}</div><div className="l">Repetidas</div></div>
          <div className="kpi"><div className="n">{cuenta("error")}</div><div className="l">Con errores (se omiten)</div></div>
        </div>
        <div className="card">
          <p className="note">
            Archivo: {revision.nombre}. Se asignará a <b>{lider?.nombre}</b>{revision.autoLider ? " (tomado de la planilla)" : ""}.
            {revision.cabecera.lider && !revision.autoLider && <> La planilla dice “{revision.cabecera.lider}”: revisa que sea el líder correcto.</>}
            {revision.cabecera.barrio && <> Barrio de la planilla: <b>{revision.cabecera.barrio}</b>.</>}
          </p>
          {error && <div className="flash err" role="alert">{error}</div>}
          <div className="scroll">
            <table>
              <thead>
                <tr><th>Fila</th><th>Cédula</th><th>Nombre</th><th>Barrio</th><th>Puesto</th><th>Resultado</th></tr>
              </thead>
              <tbody>
                {revision.filas.slice(0, 100).map((f) => (
                  <tr key={f.fila} className={f.estado === "repetida" ? "dup" : ""}>
                    <td>{f.fila}</td>
                    <td>{f.cedula}</td>
                    <td>{f.nombre}</td>
                    <td>{f.barrio}</td>
                    <td>{f.puesto}</td>
                    <td>
                      {f.estado === "nueva" && <span className="tag ok">Nueva</span>}
                      {f.estado === "repetida" && <><span className="tag red">Repetida</span> {f.motivo}</>}
                      {f.estado === "error" && <><span className="tag warn">Revisar</span> {f.motivo}</>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {revision.filas.length > 100 && <p className="note" style={{ marginTop: 10 }}>Se muestran las primeras 100 de {revision.filas.length} filas.</p>}
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={confirmar} disabled={pendiente || cuenta("nueva") + cuenta("repetida") === 0}>
              {pendiente ? "Importando…" : `Importar ${cuenta("nueva") + cuenta("repetida")} filas`}
            </button>
            <button className="btn ghost" onClick={() => setRevision(null)} disabled={pendiente}>Cancelar</button>
          </div>
          {cuenta("repetida") > 0 && <p className="note" style={{ marginTop: 10 }}>Las repetidas no se duplican: las de otro líder quedan anotadas en Duplicados.</p>}
        </div>
      </>
    );
  }

  // ---------- selección del archivo ----------
  return (
    <>
      {resultado && (
        <div className={`flash ${resultado.ok ? ((resultado.repetidos ?? 0) > 0 ? "warn" : "ok") : "err"}`} role="status">
          {resultado.ok ? (
            <>
              <b>Importación terminada.</b> Se guardaron {resultado.nuevos} votantes nuevos.
              {(resultado.repetidos ?? 0) > 0 && <> Había {resultado.repetidos} cédulas repetidas. <Link href="/duplicados">Ver duplicados</Link>.</>}
              {(resultado.errores ?? 0) > 0 && <> Se omitieron {resultado.errores} filas con errores.</>}
            </>
          ) : (
            resultado.error
          )}
        </div>
      )}
      <div className="card">
        <div className="grid form">
          <div className="field">
            <label htmlFor="imp-l">Asignar a</label>
            <select id="imp-l" value={liderId} onChange={(e) => setLiderId(e.target.value)}>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre} ({l.comuna})</option>
              ))}
            </select>
            <small>Los votantes quedan a nombre de este líder.</small>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <a className="btn ghost small" href={`/plantilla?lider=${liderId}`}>Descargar planilla de este líder</a>
          <a className="btn ghost small" href="/plantilla">Planilla en blanco</a>
          <span className="note">Usa siempre la planilla del sistema: así los barrios y los puestos coinciden.</span>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label htmlFor="imp-f">Archivo de Excel</label>
          <label
            className={`drop${arrastrando ? " over" : ""}${archivo ? " has" : ""}`}
            htmlFor="imp-f"
            onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files[0]); }}
          >
            <b>{archivo ? archivo.name : "Arrastra aquí tu archivo o haz clic para elegirlo"}</b>
            <span>Planilla .xlsx: nombres y apellidos, cédula, teléfono, puesto de votación y mesa. El barrio y el líder se toman del encabezado.</span>
          </label>
          <input ref={entrada} id="imp-f" className="vh" type="file" accept=".xlsx" onChange={(e) => elegir(e.target.files?.[0])} />
        </div>
        <label className="check">
          <input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} />
          Confirmo que cuento con la autorización de estas personas para tratar sus datos.
        </label>
        {error && <div className="flash err" role="alert">{error}</div>}
        <button className="btn" onClick={revisar} disabled={pendiente}>
          {pendiente ? "Revisando…" : "Revisar archivo"}
        </button>
      </div>
    </>
  );
}
