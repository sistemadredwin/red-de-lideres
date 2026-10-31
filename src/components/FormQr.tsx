"use client";

import { useState, useTransition } from "react";
import { registrarPorQr } from "@/app/actions/publico";
import type { Opcion } from "@/lib/types";

export default function FormQr({ token, lider, comuna, barrios, puestos }: { token: string; lider: string; comuna: string; barrios: Opcion[]; puestos: Opcion[] }) {
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [barrioId, setBarrioId] = useState("");
  const [puestoId, setPuestoId] = useState("");
  const [mesa, setMesa] = useState("");
  const [autorizo, setAutorizo] = useState(false);
  const [error, setError] = useState("");
  const [fin, setFin] = useState<boolean>(false);
  const [pendiente, empezar] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    empezar(async () => {
      const r = await registrarPorQr({
        token,
        cedula,
        nombre,
        telefono,
        barrioId: barrioId ? Number(barrioId) : null,
        puestoId: puestoId ? Number(puestoId) : null,
        mesa,
        autorizo,
      });
      if (r.resultado === "recibido" || r.resultado === "ok" || r.resultado === "duplicado") return setFin(true);
      if (r.resultado === "demasiados_intentos") return setError("Hay muchos registros en este momento. Espera un minuto e intenta de nuevo.");
      if (r.resultado === "codigo_invalido") return setError("Este código ya no está activo. Pide ayuda a tu líder.");
      setError(r.motivo ?? "No se pudo completar el registro.");
    });
  }

  if (fin) {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <h2>¡Listo, recibimos tus datos!</h2>
        <p style={{ color: "var(--muted)" }}>Gracias por tu apoyo.</p>
      </div>
    );
  }

  return (
    <>
      <h1 style={{ marginTop: 6 }}>Regístrate</h1>
      <p className="sub">Te invita {lider}, {comuna}.</p>
      <form className="card" onSubmit={enviar}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="q-ced">Cédula</label>
          <input id="q-ced" type="text" inputMode="numeric" maxLength={12} autoComplete="off" value={cedula} onChange={(e) => setCedula(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="q-nom">Nombre completo</label>
          <input id="q-nom" type="text" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="q-tel">Teléfono</label>
          <input id="q-tel" type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="q-bar">Barrio</label>
          <select id="q-bar" value={barrioId} onChange={(e) => setBarrioId(e.target.value)}>
            <option value="">Elige tu barrio</option>
            {barrios.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="q-pue">Puesto de votación</label>
          <select id="q-pue" value={puestoId} onChange={(e) => setPuestoId(e.target.value)}>
            <option value="">Elige tu puesto</option>
            {puestos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 4 }}>
          <label htmlFor="q-mes">Mesa (opcional)</label>
          <input id="q-mes" type="text" autoComplete="off" value={mesa} onChange={(e) => setMesa(e.target.value)} />
        </div>
        <label className="check">
          <input type="checkbox" checked={autorizo} onChange={(e) => setAutorizo(e.target.checked)} />
          Autorizo el tratamiento de mis datos personales para los fines de esta campaña.
        </label>
        {error && <div className="flash err" role="alert">{error}</div>}
        <button className="btn" style={{ width: "100%" }} type="submit" disabled={pendiente}>
          {pendiente ? "Registrando…" : "Registrarme"}
        </button>
      </form>
    </>
  );
}
