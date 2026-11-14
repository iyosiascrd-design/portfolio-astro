// npm i -D sharp   then:  node optimize-images.mjs   (run from the project root)
// Reads originals from /public, writes resized WebP next to them (spaces -> hyphens).
import sharp from "sharp"

const DEFAULT_QUALITY = 80

const jobs = {
  // detailed images that stayed heavy at q80 -> compress harder
  "brand-identity.jpeg": { width: 900, quality: 50 },
  "origen home.jpeg": { width: 800, quality: 56 },

  "digital-design.jpeg": { width: 900 },
  "communication.jpeg": { width: 900 },
  "3d-visuals.jpg": { width: 900 },
  "weyra home.jpeg": { width: 800 },
  "yimaj home.jpeg": { width: 800 },
  "zhongshan home.jpeg": { width: 800 },
  "portrait.jpeg": { width: 400 },
  "expertise-brand.png": { width: 600 },
  "expertise-web.png": { width: 600 },
  "expertise-pitch.png": { width: 600 },
  "expertise-3d.png": { width: 600 },
}

for (const [file, { width, quality = DEFAULT_QUALITY }] of Object.entries(jobs)) {
  const out = file.replace(/\.(jpe?g|png)$/i, "").replace(/ /g, "-") + ".webp"
  await sharp(`public/${file}`)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 90, effort: 6 })
    .toFile(`public/${out}`)
  console.log(`${file} -> ${out} (q${quality})`)
}
