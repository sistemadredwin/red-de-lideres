"use client";

import { useState, useTransition } from "react";
import { crearPersona, type RespuestaPersona } from "@/app/actions/personal";
import { ROL_LABEL, esLider, type Opcion, type Rol } from "@/lib/types";

const ROLES: Rol[] = ["lider_comuna", "lider_barrio", "coordinador", "logistica", "administrativo", "publicidad", "redes", "aspirante_consejo", "aspirante_edil", "admin"];
const CON_ACCESO: Rol[] = ["admin", "coordinador", "lider_comuna", "lider_barrio"];

export default function FormPersona({ comunas, lideresComuna }: { comunas: Opcion[]; lideresComuna: { id: string; nombre: string }[] }) {
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const [usuario, setUsuario] = useState("");
  const [g8, setG8] = useState(false);
  const [rol, setRol] = useState<Rol>("lider_comuna");
  const [comunaId, setComunaId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [meta, setMeta] = useState("20");
  const [error, setError] = useState("");
  const [creada, setCreada] = useState<RespuestaPersona | null>(null);
  const [copiada, setCopiada] = useState(false);
  const [pendiente, empezar] = useTransition();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreada(null);
    empezar(async () => {
      const r = await crearPersona({
        nombre,
        cedula,
        telefono,
        usuario,
        g8,
        rol,
        comunaId: comunaId ? Number(comunaId) : null,
        supervisorId: supervisorId || null,
        meta: esLider(rol) ? Number(meta) : null,
      });
      if (!r.ok) return setError(r.error ?? "No se pudo guardar.");
      setCreada(r);
      setNombre("");
      setCedula("");
      setTelefono("");
      setUsuario("");
      setG8(false);
    });
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2000);
    } catch {
      /* el usuario puede copiar a mano */
    }
  }

  return (
    <form className="card" onSubmit={guardar}>
      <h2>Agregar persona</h2>
      {creada?.ok && (
        <div className="flash ok" role="status">
          <b>{creada.nombre}</b> fue agregado.
          {creada.claveTemporal ? (
            <>
              {" "}Código de acceso <b style={{ fontFamily: "monospace", fontSize: 16 }}>{creada.usuario}</b> y contraseña temporal: <b style={{ fontFamily: "monospace", fontSize: 16 }}>{creada.claveTemporal}</b>{" "}
              <button type="button" className="btn small ghost" onClick={() => copiar(`Código de acceso: ${creada.usuario}\nContraseña temporal: ${creada.claveTemporal}`)}>
                {copiada ? "Copiado" : "Copiar"}
              </button>
              <br />
              <small>Guárdala ahora: no se vuelve a mostrar. Al entrar por primera vez el sistema le pedirá una contraseña nueva, y después le pedirá cambiarla cada 7 días.</small>
            </>
          ) : (
            <> No entra al sistema, solo queda registrada en el equipo (código interno <b>{creada.usuario}</b>).</>
          )}
        </div>
      )}
      {error && <div className="flash err" role="alert">{error}</div>}
      <div className="grid form">
        <div className="field">
          <label htmlFor="p-nom">Nombre completo</label>
          <input id="p-nom" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="p-ced">Cédula</label>
          <input id="p-ced" type="text" inputMode="numeric" maxLength={12} value={cedula} onChange={(e) => setCedula(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="p-tel">Teléfono (opcional)</label>
          <input id="p-tel" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="p-usr">Código de acceso (opcional)</label>
          <input id="p-usr" type="text" value={usuario} onChange={(e) => setUsuario(e.target.value.toUpperCase())} maxLength={20} autoComplete="off" placeholder="Se genera solo si lo dejas vacío" />
          <small>Con este código entra al sistema. No es la cédula.</small>
        </div>
        <div className="field">
          <label htmlFor="p-rol">Rol</label>
          <select id="p-rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROL_LABEL[r]}{CON_ACCESO.includes(r) ? "" : " (sin acceso)"}</option>
            ))}
          </select>
        </div>
        {(rol === "lider_comuna" || rol === "coordinador") && (
          <div className="field">
            <label htmlFor="p-com">Comuna</label>
            <select id="p-com" value={comunaId} onChange={(e) => setComunaId(e.target.value)}>
              <option value="">Elige una comuna</option>
              {comunas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}
        {rol === "lider_barrio" && (
          <div className="field">
            <label htmlFor="p-sup">Depende del líder de comuna</label>
            <select id="p-sup" value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)}>
              <option value="">Elige un líder de comuna</option>
              {lideresComuna.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
            <small>Hereda la comuna de su líder.</small>
          </div>
        )}
        <div className="field">
          <label htmlFor="p-g8">Grupo</label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 400 }}>
            <input id="p-g8" type="checkbox" checked={g8} onChange={(e) => setG8(e.target.checked)} /> Pertenece al G8
          </label>
        </div>
        {esLider(rol) && (
          <div className="field">
            <label htmlFor="p-meta">Meta de votantes</label>
            <input id="p-meta" type="number" min={1} value={meta} onChange={(e) => setMeta(e.target.value)} />
          </div>
        )}
      </div>
      <button className="btn" style={{ marginTop: 14 }} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : "Agregar persona"}
      </button>
    </form>
  );
}
