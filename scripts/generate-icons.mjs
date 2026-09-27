// Genera los iconos PNG de la app a partir de un dibujo SVG.
// Uso (solo si cambias el diseño del icono):  node scripts/generate-icons.mjs
// Usa "sharp", que ya viene instalado como parte de Next.js (no es una dependencia nueva).
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const GREEN = "#3f7d4e";
const CREAM = "#f7f6f2";

// Dibujo del icono: un cuenco con vapor sobre fondo verde. Lienzo de 512×512.
// "scale" encoge el dibujo hacia el centro (los iconos "maskable" necesitan margen extra
// porque Android los recorta en círculo).
function iconSvg(scale = 1) {
  const t = `translate(256 256) scale(${scale}) translate(-256 -256)`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${GREEN}"/>
  <g transform="${t}" fill="none" stroke="${CREAM}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
    <!-- vapor -->
    <path d="M200 110c-18 24 18 40 0 64"/>
    <path d="M256 96c-18 24 18 40 0 64"/>
    <path d="M312 110c-18 24 18 40 0 64"/>
    <!-- borde del cuenco -->
    <path d="M108 236h296"/>
    <!-- cuenco -->
    <path d="M122 236c0 84 60 142 134 142s134-58 134-142" fill="${CREAM}" fill-opacity="0.18"/>
    <!-- base -->
    <path d="M206 410h100"/>
  </g>
</svg>`;
}

// Qué archivos se generan, dónde y a qué tamaño.
const outputs = [
  { file: "public/icons/icon-192.png", size: 192, scale: 1 },
  { file: "public/icons/icon-512.png", size: 512, scale: 1 },
  { file: "public/icons/icon-maskable-512.png", size: 512, scale: 0.78 },
  { file: "app/apple-icon.png", size: 180, scale: 1 }, // icono de iOS (Next lo enlaza solo)
  { file: "app/icon.png", size: 64, scale: 1 }, // favicon de la pestaña
];

await mkdir("public/icons", { recursive: true });
for (const { file, size, scale } of outputs) {
  await sharp(Buffer.from(iconSvg(scale))).resize(size, size).png().toFile(file);
  console.log("✓", file);
}
