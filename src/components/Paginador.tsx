import Link from "next/link";

// Paginación por enlaces: conserva los filtros que ya estén en la dirección.
export default function Paginador({
  ruta,
  pagina,
  total,
  porPagina,
  filtros,
}: {
  ruta: string;
  pagina: number;
  total: number;
  porPagina: number;
  filtros: Record<string, string>;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) if (v) q.set(k, v);
    if (p > 1) q.set("pagina", String(p));
    const s = q.toString();
    return s ? `${ruta}?${s}` : ruta;
  };
  return (
    <div className="pager">
      <span>
        Página {pagina} de {paginas} ({total} en total)
      </span>
      {pagina > 1 ? (
        <Link className="btn small ghost" href={href(pagina - 1)}>
          Anterior
        </Link>
      ) : (
        <span className="btn small ghost" aria-disabled="true" style={{ opacity: 0.5 }}>
          Anterior
        </span>
      )}
      {pagina < paginas ? (
        <Link className="btn small ghost" href={href(pagina + 1)}>
          Siguiente
        </Link>
      ) : (
        <span className="btn small ghost" aria-disabled="true" style={{ opacity: 0.5 }}>
          Siguiente
        </span>
      )}
    </div>
  );
}
