"use client";

import { useState, useTransition } from "react";
import { cambiarActivoPerfil, restablecerClave } from "@/app/actions/personal";
import { cambiarMeta } from "@/app/actions/votantes";
import { ROL_LABEL, esLider, type Rol } from "@/lib/types";

export interface PersonaFila {
  id: string;
  usuario: string;
  grupo: "G8" | null;
  clave: string;
  nombre_completo: string;
  rol: Rol;
  meta: number;
  activo: boolean;
  tieneAcceso: boolean;
  zona: string;
  supervisor: string;
  esYo: boolean;
}

export default function FilaPersona({ p }: { p: PersonaFila }) {
  const [meta, setMeta] = useState(String(p.meta));
  const [error, setError] = useState("");
  const [clave, setClave] = useState("");
  const [pendiente, empezar] = useTransition();

  function guardarMeta() {
    if (meta === String(p.meta)) return;
    setError("");
    empezar(async () => {
      const r = await cambiarMeta(p.id, Number(meta));
      if (!r.ok) {
        setError(r.error ?? "No se pudo guardar la meta.");
        setMeta(String(p.meta));
      }
    });
  }

  function nuevaClave() {
    if (!window.confirm(`¿Generar una contraseña temporal nueva para ${p.nombre_completo}? La anterior dejará de servir.`)) return;
    setError("");
    setClave("");
    empezar(async () => {
      const r = await restablecerClave(p.id);
      if (r.ok && r.claveTemporal) setClave(r.claveTemporal);
      else setError(r.error ?? "No se pudo restablecer.");
    });
  }

  function alternarActivo() {
    setError("");
    empezar(async () => {
      const r = await cambiarActivoPerfil(p.id, !p.activo);
      if (!r.ok) setError(r.error ?? "No se pudo cambiar el estado.");
    });
  }

  return (
    <tr className={p.activo ? "" : "off"}>
      <td>{p.nombre_completo}{p.grupo && <> <span className="tag">{p.grupo}</span></>}</td>
      <td style={{ fontFamily: "monospace" }}>{p.usuario}</td>
      <td>{ROL_LABEL[p.rol]}</td>
      <td>{p.zona}{p.supervisor ? ` · con ${p.supervisor}` : ""}</td>
      <td>
        {esLider(p.rol) ? (
          <input type="number" min={1} value={meta} style={{ width: 84 }} aria-label={`Meta de ${p.nombre_completo}`} onChange={(e) => setMeta(e.target.value)} onBlur={guardarMeta} disabled={pendiente} />
        ) : null}
      </td>
      <td>
        {p.activo ? <span className="tag ok">Activo</span> : <span className="tag">Inactivo</span>}
        {p.tieneAcceso && <small style={{ display: "block", whiteSpace: "normal", color: "var(--muted)" }}>{p.clave}</small>}
      </td>
      <td>
        <div className="row">
          {p.tieneAcceso && (
            <button className="btn small ghost" onClick={nuevaClave} disabled={pendiente}>Restablecer clave</button>
          )}
          {!p.esYo && (
            <button className="btn small ghost" onClick={alternarActivo} disabled={pendiente}>{p.activo ? "Desactivar" : "Activar"}</button>
          )}
        </div>
        {clave && (
          <small style={{ display: "block", whiteSpace: "normal" }}>
            Contraseña temporal: <b style={{ fontFamily: "monospace" }}>{clave}</b> (no se vuelve a mostrar)
          </small>
        )}
        {error && <small style={{ display: "block", color: "var(--alert)", whiteSpace: "normal" }}>{error}</small>}
      </td>
    </tr>
  );
}
