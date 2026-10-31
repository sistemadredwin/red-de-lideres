"use client";

import { useState, useTransition } from "react";
import { crearBarrios, crearComuna, crearPuestos, type RespuestaCatalogo } from "@/app/actions/catalogos";
import type { Opcion } from "@/lib/types";

function Aviso({ r }: { r: RespuestaCatalogo | null }) {
  if (!r) return null;
  return <div className={`flash ${r.ok ? "ok" : "err"}`} role="status">{r.ok ? "Guardado." : r.error}</div>;
}

export default function FormCatalogos({ comunas }: { comunas: Opcion[] }) {
  const [nuevaComuna, setNuevaComuna] = useState("");
  const [comunaId, setComunaId] = useState(comunas[0] ? String(comunas[0].id) : "");
  const [barrios, setBarrios] = useState("");
  const [puestos, setPuestos] = useState("");
  const [rc, setRc] = useState<RespuestaCatalogo | null>(null);
  const [rb, setRb] = useState<RespuestaCatalogo | null>(null);
  const [rp, setRp] = useState<RespuestaCatalogo | null>(null);
  const [pendiente, empezar] = useTransition();

  return (
    <div className="two">
      <div className="card">
        <h2>Agregar comuna</h2>
        <Aviso r={rc} />
        <div className="field">
          <label htmlFor="c-nom">Nombre</label>
          <input id="c-nom" type="text" value={nuevaComuna} onChange={(e) => setNuevaComuna(e.target.value)} placeholder="Comuna 4" />
        </div>
        <button className="btn" style={{ marginTop: 12 }} disabled={pendiente} onClick={() => empezar(async () => { const r = await crearComuna(nuevaComuna); setRc(r); if (r.ok) setNuevaComuna(""); })}>
          Agregar comuna
        </button>
      </div>

      <div className="card">
        <h2>Agregar barrios</h2>
        <Aviso r={rb} />
        <div className="field">
          <label htmlFor="b-com">Comuna</label>
          <select id="b-com" value={comunaId} onChange={(e) => setComunaId(e.target.value)}>
            {comunas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label htmlFor="b-lista">Barrios (uno por línea)</label>
          <textarea id="b-lista" rows={5} value={barrios} onChange={(e) => setBarrios(e.target.value)} />
          <small>Puedes pegar la lista completa desde Excel. Los que ya existen se omiten.</small>
        </div>
        <button className="btn" style={{ marginTop: 12 }} disabled={pendiente || !comunaId} onClick={() => empezar(async () => { const r = await crearBarrios(Number(comunaId), barrios); setRb(r); if (r.ok) setBarrios(""); })}>
          Agregar barrios
        </button>
      </div>

      <div className="card">
        <h2>Agregar puestos de votación</h2>
        <Aviso r={rp} />
        <div className="field">
          <label htmlFor="p-lista">Puestos (uno por línea)</label>
          <textarea id="p-lista" rows={5} value={puestos} onChange={(e) => setPuestos(e.target.value)} />
          <small>Los que ya existen se omiten.</small>
        </div>
        <button className="btn" style={{ marginTop: 12 }} disabled={pendiente} onClick={() => empezar(async () => { const r = await crearPuestos(puestos); setRp(r); if (r.ok) setPuestos(""); })}>
          Agregar puestos
        </button>
      </div>
    </div>
  );
}
