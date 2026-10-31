"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { cedulaExiste, registrarVotante } from "@/app/actions/votantes";
import type { Opcion } from "@/lib/types";
import { soloDigitos } from "@/lib/util";

type Aviso = { tipo: "ok" | "err" | "warn"; texto: string } | null;

export default function FormRegistro({ barrios, puestos, comuna }: { barrios: Opcion[]; puestos: Opcion[]; comuna: string }) {
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [barrioId, setBarrioId] = useState("");
  const [puestoId, setPuestoId] = useState("");
  const [mesa, setMesa] = useState("");
  const [autorizo, setAutorizo] = useState(false);
  const [vivo, setVivo] = useState<"libre" | "existe" | null>(null);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [pendiente, empezar] = useTransition();
  const ultima = useRef("");

  // Aviso en vivo: espera un momento después de escribir y pregunta a la base de datos.
  useEffect(() => {
    const limpia = soloDigitos(cedula);
    ultima.current = limpia;
    const t = setTimeout(async () => {
      if (limpia.length < 6) return setVivo(null);
      const existe = await cedulaExiste(limpia);
      if (ultima.current === limpia) setVivo(existe === null ? null : existe ? "existe" : "libre");
    }, limpia.length < 6 ? 0 : 400);
    return () => clearTimeout(t);
  }, [cedula]);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setAviso(null);
    empezar(async () => {
      const r = await registrarVotante({
        cedula,
        nombre,
        telefono,
        barrioId: barrioId ? Number(barrioId) : null,
        puestoId: puestoId ? Number(puestoId) : null,
        mesa,
        autorizo,
      });
      if (r.resultado === "ok") {
        setAviso({ tipo: "ok", texto: `Votante guardado: ${nombre.trim()}.` });
        setCedula("");
        setNombre("");
        setTelefono("");
        setMesa("");
        setAutorizo(false);
        setVivo(null);
      } else if (r.resultado === "duplicado") {
        setAviso({ tipo: "err", texto: "Esta cédula ya está en el sistema, así que no se guardó de nuevo. La administración fue avisada." });
      } else {
        setAviso({ tipo: "err", texto: ("motivo" in r && r.motivo) || "No se pudo guardar." });
      }
    });
  }

  return (
    <form className="card" onSubmit={guardar}>
      {aviso && (
        <div className={`flash ${aviso.tipo}`} role="status">
          {aviso.texto}
        </div>
      )}
      <div className="grid form">
        <div className="field">
          <label htmlFor="r-ced">Cédula</label>
          <input id="r-ced" type="text" inputMode="numeric" maxLength={12} autoComplete="off" value={cedula} onChange={(e) => setCedula(e.target.value)} />
          <div className={`live ${vivo === "existe" ? "bad" : vivo === "libre" ? "good" : ""}`} aria-live="polite">
            {vivo === "existe" && "Esta cédula ya está registrada. No se puede registrar de nuevo."}
            {vivo === "libre" && "Cédula disponible."}
          </div>
        </div>
        <div className="field">
          <label htmlFor="r-nom">Nombre completo</label>
          <input id="r-nom" type="text" autoComplete="off" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <small>Como aparece en la cédula</small>
        </div>
        <div className="field">
          <label htmlFor="r-tel">Teléfono (opcional)</label>
          <input id="r-tel" type="tel" autoComplete="off" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="r-com">Comuna</label>
          <input id="r-com" type="text" value={comuna} readOnly />
        </div>
        <div className="field">
          <label htmlFor="r-bar">Barrio</label>
          <select id="r-bar" value={barrioId} onChange={(e) => setBarrioId(e.target.value)}>
            <option value="">Elige un barrio</option>
            {barrios.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-pue">Puesto de votación</label>
          <select id="r-pue" value={puestoId} onChange={(e) => setPuestoId(e.target.value)}>
            <option value="">Elige un puesto</option>
            {puestos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-mes">Mesa (opcional)</label>
          <input id="r-mes" type="text" autoComplete="off" value={mesa} onChange={(e) => setMesa(e.target.value)} />
        </div>
      </div>
      <label className="check">
        <input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} />
        La persona autorizó el tratamiento de sus datos personales para esta campaña.
      </label>
      <button className="btn" type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar votante"}
      </button>
    </form>
  );
}
