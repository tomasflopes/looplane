import fs from "node:fs";
import sharp from "sharp";

const OUT = "/private/var/folders/fd/f1cyjdds191_z4x31tbrjz640000gn/T/opencode";
const S = 32;

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

function svg({ radius = 7.5, stroke = 3.8, bg = "#0f172a", fg = "#ffffff", x0 = 5.2, x1 = 26.8, cy = 16, amp = 4.6, cycles = 1, phase = 0 }) {
  const d = wavePath({ x0, x1, cy, amp, cycles, phase });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <rect width="${S}" height="${S}" rx="${radius}" fill="${bg}"/>
  <path d="${d}" fill="none" stroke="${fg}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const variants = {
  "A base": svg({}),
  "B tighter": svg({ radius: 7, stroke: 3.9, x0: 6.2, x1: 25.8, amp: 4.2 }),
  "C heavy": svg({ radius: 7, stroke: 4.4, x0: 6.2, x1: 25.8, amp: 4.2 }),
  "D steep": svg({ radius: 7, stroke: 4, x0: 5.8, x1: 26.2, amp: 5.2 }),
  "E two-hump": svg({ radius: 7, stroke: 3.6, x0: 5.8, x1: 26.2, amp: 4.2, cycles: 1.5, phase: 0.12 }),
  "F blue": svg({ radius: 7, stroke: 4, x0: 6.2, x1: 25.8, amp: 4.2, bg: "#111a2e" }),
};

const cols = [];
for (const [name, s] of Object.entries(variants)) {
  const at = async (size) => sharp(Buffer.from(s)).resize(size, size).png().toBuffer();
  const t32 = await at(32);
  const t16 = await at(16);
  cols.push({
    name,
    a: await sharp(t32).resize(32 * 4, 32 * 4, { kernel: "nearest" }).png().toBuffer(),
    b: await sharp(t16).resize(16 * 8, 16 * 8, { kernel: "nearest" }).png().toBuffer(),
  });
}

const W = 32 * 4 + 16 * 8 + 120;
const H = cols.length * (32 * 4 + 16);
const composites = [];
let y = 12;
for (const c of cols) {
  composites.push({ input: c.a, left: 12, top: y });
  composites.push({ input: c.b, left: 12 + 32 * 4 + 20, top: y + (32 * 4 - 16 * 8) / 2 });
  y += 32 * 4 + 16;
}
await sharp({ create: { width: W, height: H, channels: 4, background: "#f5f5f4" } })
  .composite(composites)
  .png()
  .toFile(`${OUT}/variants.png`);
console.log("ok", Object.keys(variants).join(" | "));
