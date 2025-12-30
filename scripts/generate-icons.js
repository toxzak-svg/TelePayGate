#!/usr/bin/env node
// Generate PNG icons from SVG placeholders using sharp
// Usage: node scripts/generate-icons.js

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SRC = path.resolve('packages/dashboard/public/app-icon-512.svg');
const OUT_DIR = path.resolve('packages/dashboard/public/assets');

async function ensureDir(dir) {
  try {
    await fs.promises.access(dir);
  } catch (e) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

async function generate() {
  await ensureDir(OUT_DIR);

  const svg = await fs.promises.readFile(SRC);

  const outputs = [
    { name: 'app-icon-512.png', size: 512 },
    { name: 'app-icon-192.png', size: 192 }
  ];

  for (const out of outputs) {
    const outPath = path.join(OUT_DIR, out.name);
    await sharp(svg)
      .resize(out.size, out.size, { fit: 'cover' })
      .png({ quality: 90 })
      .toFile(outPath);
    console.log('Wrote', outPath);
  }
}

generate().catch((err) => {
  console.error('Icon generation failed:', err.message || err);
  process.exit(1);
});
