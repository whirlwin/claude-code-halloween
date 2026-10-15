// Bakes one full costume cycle from the mod's own scene into scene.json, so
// the screensaver plays the same pixels the spinner draws.
import { writeFileSync } from 'node:fs'

import { DEFAULT, FRAMES_PER_VARIANT, SCENE_COLUMNS, SCENE_ROWS, TICK_MS, VARIANTS, pixels } from '../hooks/scene.ts'

const [out = 'scene.json'] = process.argv.slice(2)
const width = SCENE_COLUMNS * 2
const height = SCENE_ROWS * 2
const count = FRAMES_PER_VARIANT * VARIANTS.length

const frames = new Uint32Array(count * width * height)
for (let t = 0; t < count; t++) frames.set(pixels(t), t * width * height)

writeFileSync(
  out,
  JSON.stringify({
    width,
    height,
    tickMs: TICK_MS,
    framesPerVariant: FRAMES_PER_VARIANT,
    background: DEFAULT,
    variants: VARIANTS.map(({ name, color, words }) => ({ name, color, words })),
    // Little-endian 0xRRGGBB words, frame after frame, row after row.
    frames: Buffer.from(frames.buffer).toString('base64'),
  }),
)
