"use client";

import { useActionState } from "react";
import { crearPersona, type EstadoPersonal } from "./acciones";
import { ETIQUETA_ROL, type Rol } from "@/lib/tipos";

type Comuna = { id: number; nombre: string };
type Supervisor = { id: string; nombre_completo: string; comuna_id: number | null };
const inicial: EstadoPersonal = {};
const roles: Rol[] = ["coordinador", "lider_comuna", "lider_barrio", "logistica", "administrativo", "publicidad", "redes", "aspirante_consejo", "aspirante_edil"];
const rolesConAcceso: Rol[] = ["coordinador", "lider_comuna", "lider_barrio"];

export default function FormularioPersona({
  comunas,
  supervisores,
}: {
  comunas: Comuna[];
  supervisores: Supervisor[];
}) {
  const [estado, accion, pendiente] = useActionState(crearPersona, inicial);

  return (
    <section className="panel">
      <h2>Agregar persona</h2>
      <p className="nota">Solo coordinadores y líderes reciben acceso de inicio de sesión.</p>
      {estado.error ? <div className="error" role="alert">{estado.error}</div> : null}
      {estado.aviso ? <div className="aviso" role="alert">{estado.aviso}</div> : null}
      {estado.credenciales ? (
        <div className="aviso credenciales" role="status">
          <strong>Guarda y entrega estas credenciales por un canal seguro:</strong>
          <span>Código de acceso: <code>{estado.credenciales.usuario}</code></span>
          <span>Clave temporal: <code>{estado.credenciales.clave}</code></span>
          <span>La persona deberá cambiar la clave al ingresar. Esta clave no se volverá a mostrar.</span>
        </div>
      ) : null}
      <form action={accion} className="formulario">
        <label>Nombre completo<input name="nombre" required minLength={2} maxLength={200} /></label>
        <label>Código de acceso<input name="usuario" required minLength={4} maxLength={20} autoCapitalize="characters" /></label>
        <label>Cédula<input name="cedula" required inputMode="numeric" minLength={6} maxLength={10} /></label>
        <label>Zona o área (opcional)<input name="area" maxLength={120} placeholder="Ej.: Eventos, Contenido" /></label>
        <label>Rol<select name="rol" required defaultValue="lider_comuna">{roles.map((rol) => <option key={rol} value={rol}>{ETIQUETA_ROL[rol]}{rolesConAcceso.includes(rol) ? "" : " (sin acceso)"}</option>)}</select></label>
        <label>Comuna (si aplica)<select name="comuna_id" defaultValue=""><option value="">Sin comuna</option>{comunas.map((comuna) => <option key={comuna.id} value={comuna.id}>{comuna.nombre}</option>)}</select></label>
        <label>Supervisor (líder de comuna, para líder de barrio)<select name="supervisor_id" defaultValue=""><option value="">Sin supervisor</option>{supervisores.map((persona) => <option key={persona.id} value={persona.id}>{persona.nombre_completo}</option>)}</select></label>
        <label>Grupo<select name="grupo" defaultValue=""><option value="">Sin grupo</option><option value="G8">G8</option></select></label>
        <label>Meta de votantes (solo líderes)<input name="meta" type="number" min={1} max={100000} defaultValue={20} /></label>
        <button className="boton" type="submit" disabled={pendiente}>{pendiente ? "Creando…" : "Agregar persona"}</button>
      </form>
    </section>
  );
}
