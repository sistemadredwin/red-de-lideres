import Encabezado from "@/components/Encabezado";
import ListaVotantes from "@/components/ListaVotantes";
import { requirePerfil } from "@/lib/session";

export const metadata = { title: "Votantes · Red de Líderes" };

export default async function Votantes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const perfil = await requirePerfil(["admin", "coordinador"]);
  const params = await searchParams;
  const esAdmin = perfil.rol === "admin";
  return (
    <>
      <Encabezado titulo={esAdmin ? "Votantes" : "Votantes de tu comuna"} detalle="Busca, filtra y revisa el estado de cada persona." />
      <ListaVotantes ruta="/votantes" perfil={perfil} params={params} mostrarComuna={esAdmin} mostrarLider />
    </>
  );
}
