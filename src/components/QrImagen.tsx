import qrcode from "qrcode-generator";

// Dibuja el QR como imagen vectorial (SVG). Se genera en el servidor, sin servicios externos.
export function qrPath(url: string): { path: string; lado: number } {
  const q = qrcode(0, "M");
  q.addData(url);
  q.make();
  const n = q.getModuleCount();
  const margen = 2;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (q.isDark(r, c)) d += `M${c + margen} ${r + margen}h1v1h-1z`;
    }
  }
  return { path: d, lado: n + margen * 2 };
}

export default function QrImagen({ url, perfilId }: { url: string; perfilId?: string }) {
  const { path, lado } = qrPath(url);
  return (
    <svg className="qr" data-perfil={perfilId} viewBox={`0 0 ${lado} ${lado}`} role="img" aria-label="Código QR" shapeRendering="crispEdges">
      <rect width="100%" height="100%" fill="#fff" />
      <path d={path} fill="#14211a" />
    </svg>
  );
}
