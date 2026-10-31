import { porcentaje } from "@/lib/util";

export default function Barra({ etiqueta, valor, total, texto }: { etiqueta?: string; valor: number; total: number; texto?: string }) {
  const pct = porcentaje(valor, total);
  return (
    <div className="bar" style={etiqueta ? undefined : { gridTemplateColumns: "1fr 60px" }}>
      {etiqueta && <span>{etiqueta}</span>}
      <span className="tr">
        <i style={{ width: `${pct}%` }} />
      </span>
      <b>{texto ?? `${valor}`}</b>
    </div>
  );
}
