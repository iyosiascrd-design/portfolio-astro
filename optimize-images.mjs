// npm i -D sharp   then:  node optimize-images.mjs
// Reads originals from /public, writes resized WebP next to them (spaces -> hyphens).
import sharp from "sharp"

const jobs = {
  "brand-identity.jpeg": 900,
  "digital-design.jpeg": 900,
  "communication.jpeg": 900,
  "3d-visuals.jpg": 900,
  "weyra home.jpeg": 800,
  "origen home.jpeg": 800,
  "yimaj home.jpeg": 800,
  "zhongshan home.jpeg": 800,
  "portrait.jpeg": 400,
  "expertise-brand.png": 600,
  "expertise-web.png": 600,
  "expertise-pitch.png": 600,
  "expertise-3d.png": 600,
}

for (const [file, width] of Object.entries(jobs)) {
  const out = file.replace(/\.(jpe?g|png)$/i, "").replace(/ /g, "-") + ".webp"
  const img = sharp(`public/${file}`).resize({ width, withoutEnlargement: true })
  // keep transparency for the expertise PNGs
  await img.webp({ quality: 80, alphaQuality: 90 }).toFile(`public/${out}`)
  console.log(file, "->", out)
}
