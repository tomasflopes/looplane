import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const src = process.argv[2];
const out = process.argv[3];
const svg = fs.readFileSync(src);

const sizes = [512, 128, 64, 48, 32, 16];
const tiles = [];
for (const s of sizes) {
  const buf = await sharp(svg).resize(s, s).png().toBuffer();
  const up = s <= 32 ? s * 6 : s;
  tiles.push({
    input: await sharp(buf).resize(up, up, { kernel: s <= 32 ? "nearest" : "lanczos3" }).png().toBuffer(),
    left: 0,
    top: 0,
  });
}

const widths = tiles.map((t) => sharp(t.input).metadata().then((m) => m.width));
const ws = await Promise.all(widths);
const gap = 24;
const total = ws.reduce((a, b) => a + b + gap, gap);
const maxH = Math.max(...(await Promise.all(tiles.map((t) => sharp(t.input).metadata().then((m) => m.height)))));

await sharp({
  create: { width: total, height: maxH + gap * 2, channels: 4, background: "#f5f5f4" },
})
  .composite(
    tiles.map((t, i) => ({
      input: t.input,
      left: gap + ws.slice(0, i).reduce((a, b) => a + b + gap, 0),
      top: gap,
    }))
  )
  .png()
  .toFile(out);

console.log("preview:", out, sizes.join(","));
