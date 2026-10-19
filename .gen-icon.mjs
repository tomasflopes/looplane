import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = process.argv[2];
const APP = path.join(OUT, "app");
fs.mkdirSync(APP, { recursive: true });

const S = 32; // design grid

// Catmull-Rom -> cubic bezier for a smooth sine wave
function wavePath({ x0, x1, cy, amp, cycles, phase }) {
  const n = 24;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = x0 + (x1 - x0) * u;
    const y = cy - amp * Math.sin(2 * Math.PI * (u * cycles + phase));
    pts.push([x, y]);
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

function svg({ radius = 7.5, stroke = 3.8, bg = "#0f172a", fg = "#ffffff" } = {}) {
  const d = wavePath({ x0: 5.2, x1: 26.8, cy: 16, amp: 4.6, cycles: 1, phase: 0 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" role="img" aria-label="Looplane">
  <rect width="${S}" height="${S}" rx="${radius}" fill="${bg}"/>
  <path d="${d}" fill="none" stroke="${fg}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}

const main = svg();
fs.writeFileSync(path.join(APP, "icon.svg"), main);

// PNG sizes
const sizes = [16, 32, 48, 64, 128, 180, 256, 512];
const pngs = {};
for (const s of sizes) {
  pngs[s] = await sharp(Buffer.from(main)).resize(s, s).png({ compressionLevel: 9 }).toBuffer();
}

// ICO container with embedded PNGs (16/32/48)
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = [];
  for (const { size, data } of entries) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    dir.push(e);
  }
  return Buffer.concat([header, ...dir, ...entries.map((e) => e.data)]);
}

const ico = buildIco(
  [16, 32, 48].map((size) => ({ size, data: pngs[size] }))
);
fs.writeFileSync(path.join(APP, "favicon.ico"), ico);

fs.writeFileSync(path.join(APP, "apple-icon.png"), pngs[180]);
fs.writeFileSync(path.join(APP, "icon.png"), pngs[512]);

console.log("written:", fs.readdirSync(APP).join(", "));
