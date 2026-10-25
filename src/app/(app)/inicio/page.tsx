import { exigirSesionActiva } from "@/lib/sesion";
import { ETIQUETA_ROL } from "@/lib/tipos";

export default async function PaginaInicio() {
  const perfil = await exigirSesionActiva();
  return (
    <>
      <h1>Hola, {perfil.nombre_completo}</h1>
      <p>Entraste como {ETIQUETA_ROL[perfil.rol]}. Las demás pantallas se irán activando aquí.</p>
    </>
  );
}