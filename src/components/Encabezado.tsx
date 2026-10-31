export default function Encabezado({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <>
      <h1>{titulo}</h1>
      <p className="sub">{detalle ?? ""}</p>
    </>
  );
}
