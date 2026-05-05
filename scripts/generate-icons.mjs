import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const iconsDir = path.join(root, 'public', 'icons')

const sources = {
  standard: path.join(iconsDir, 'icon.svg'),
  maskable: path.join(iconsDir, 'icon-maskable.svg'),
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true })
}

async function writePng({ input, output, size }) {
  const buf = await fs.readFile(input)
  await sharp(buf, { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output)
}

async function main() {
  await ensureDir(iconsDir)

  await writePng({
    input: sources.standard,
    output: path.join(iconsDir, 'icon-192.png'),
    size: 192,
  })

  await writePng({
    input: sources.standard,
    output: path.join(iconsDir, 'icon-512.png'),
    size: 512,
  })

  await writePng({
    input: sources.maskable,
    output: path.join(iconsDir, 'icon-512-maskable.png'),
    size: 512,
  })

  // keep manifest path stable (icon-512.png is used for maskable in manifest)
  // by copying the maskable png on top if you prefer; for now we just leave both.
  console.log('Generated icons in public/icons/')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

