// The spinner's picture: a canvas of quadrant pixels, four to a terminal cell
// (the glyphs the welcome screen draws Clawd with), packed into Raster cells.

export const DEFAULT = 0x01000000
export const SCENE_COLUMNS = 12
export const SCENE_ROWS = 3
export const TICK_MS = 150
export const FRAMES_PER_VARIANT = 60

const WIDTH = SCENE_COLUMNS * 2
const HEIGHT = SCENE_ROWS * 2
const POOF_FRAMES = 3

// Clawd as the welcome screen draws him, one character per quadrant pixel.
const CLAWD = [
  '...############...',
  '...##.######.##...',
  '.################.',
  '...############...',
  '....#.#....#.#....',
]
const CLAWD_WIDTH = 18
const EYES = [5, 12]
const TOP = 1
// The columns right of Clawd where each costume's effect plays.
const ZONE = CLAWD_WIDTH

type Canvas = Uint32Array

export type Variant = {
  name: string
  color: string
  draw: (c: Canvas, t: number) => void
}

function rnd(a: number, b: number, c = 0): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function set(c: Canvas, x: number, y: number, color: number): void {
  if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) c[y * WIDTH + x] = color
}

function get(c: Canvas, x: number, y: number): number {
  return c[y * WIDTH + x] ?? DEFAULT
}

function body(c: Canvas, top: number, color: (x: number, y: number) => number, rows = CLAWD.length): void {
  for (let y = 0; y < rows; y++) {
    const line = CLAWD[y] ?? ''
    for (let x = 0; x < CLAWD_WIDTH; x++) {
      if (line[x] === '#') set(c, x, top + y, color(x, y))
    }
  }
}

const FLAME = [0xffd23f, 0xffb000, 0xfff1a8, 0xffc83d]

const pumpkin: Variant = {
  name: 'Pumpkin Clawd',
  color: '#FF7518',
  draw(c, t) {
    body(c, TOP, x => (x === 6 || x === 11 ? 0xd9590f : 0xff7518))
    const glow = FLAME[Math.floor(rnd(t, 7) * FLAME.length)] ?? 0xffd23f
    for (const eye of EYES) set(c, eye, TOP + 1, glow)
    for (const x of [6, 8, 10, 12]) set(c, x, TOP + 3, glow)
    set(c, 8, 0, 0x4e8a2e)
    set(c, 9, 0, 0x4e8a2e)
    set(c, 10, 0, 0x6fbf3a)
    const bx = ZONE + 1 + (Math.floor(t / 3) % 3)
    const by = Math.floor(t / 2) % 4 < 2 ? 1 : 2
    const isUp = t % 4 < 2
    set(c, bx, by + (isUp ? 0 : 1), 0x9b6bd6)
    set(c, bx + 2, by + (isUp ? 0 : 1), 0x9b6bd6)
    set(c, bx + 1, by + (isUp ? 1 : 0), 0x9b6bd6)
  },
}

const ghost: Variant = {
  name: 'Ghost Clawd',
  color: '#E8ECF4',
  draw(c, t) {
    const top = Math.floor(t / 4) % 2
    body(c, top, () => 0xe8ecf4, 4)
    const hem = Math.floor(t / 2) % 3
    for (let x = 3; x <= 14; x++) {
      if ((x + hem) % 3 !== 0) set(c, x, top + 4, 0xb8c4d6)
    }
    for (const eye of EYES) set(c, eye, top + 1, 0x2e3440)
    set(c, 8, top + 2, 0x2e3440)
    set(c, 9, top + 2, 0x2e3440)
    for (let x = ZONE; x < WIDTH; x++) {
      for (let y = 0; y < HEIGHT - 1; y++) {
        if (rnd(x, y, Math.floor(t / 3)) < 0.06) set(c, x, y, 0x88c0d0)
      }
    }
    for (let x = 0; x < WIDTH; x++) {
      if (get(c, x, HEIGHT - 1) === DEFAULT && rnd(Math.floor((x + t) / 2), 9) < 0.5) {
        set(c, x, HEIGHT - 1, 0x6c7a89)
      }
    }
  },
}

const witch: Variant = {
  name: 'Witch Clawd',
  color: '#B38BE6',
  draw(c, t) {
    body(c, TOP, () => 0xd77757)
    for (let x = 6; x <= 11; x++) set(c, x, 0, 0x6a2c9e)
    for (let x = 1; x <= 16; x++) set(c, x, TOP, 0x3d1a5b)
    set(c, 8, TOP, 0xffd700)
    set(c, 9, TOP, 0xffd700)
    const eyes = t % 25 === 0 ? 0xd77757 : 0x7cfc00
    for (const eye of EYES) set(c, eye, TOP + 1, eyes)
    for (const [x, y] of [[21, 0], [22, 0], [20, 1], [21, 1], [22, 1], [23, 1], [21, 2], [22, 2]] as const) {
      set(c, x, y, 0xf5e6a8)
    }
    for (let i = 0; i < 4; i++) {
      const x = ZONE + Math.floor(rnd(i, 1) * 3)
      const y = Math.floor(rnd(i, 2) * HEIGHT)
      if (rnd(i, Math.floor(t / 2)) > 0.4) set(c, x, y, 0xffffff)
    }
    if (t % 37 < 2) {
      for (const [x, y] of [[20, 1], [19, 2], [20, 3], [21, 3], [20, 4], [19, 5]] as const) {
        set(c, x, y, 0xfff7ae)
      }
    }
  },
}

export const VARIANTS: readonly Variant[] = [pumpkin, ghost, witch]

export function variantAt(t: number): Variant {
  return VARIANTS[Math.floor(t / FRAMES_PER_VARIANT) % VARIANTS.length] ?? pumpkin
}

const SMOKE = [0x8b5fbf, 0x6fbf3a, 0xb0b0b0]

// A puff of smoke over the first frames of each costume hides the swap.
function poof(c: Canvas, t: number): void {
  const f = t % FRAMES_PER_VARIANT
  if (f >= POOF_FRAMES) return
  const density = (POOF_FRAMES - f) / (POOF_FRAMES + 1)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < CLAWD_WIDTH; x++) {
      if (rnd(x, y, t) < density) set(c, x, y, SMOKE[Math.floor(rnd(y, x, t) * SMOKE.length)] ?? 0xb0b0b0)
    }
  }
}

// Indexed by which quadrants hold the foreground: 1 upper left, 2 upper
// right, 4 lower left, 8 lower right.
const QUADRANTS = ' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'

// A cell holds two colors, so a busier block keeps its two commonest and
// paints the rest in the second.
function cell(pixels: number[]): [number, number, number] {
  const counts = new Map<number, number>()
  for (const p of pixels) counts.set(p, (counts.get(p) ?? 0) + 1)
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] === DEFAULT ? 1 : -1))
  const fg = ranked.find(([color]) => color !== DEFAULT)?.[0]
  if (fg === undefined) return [0x20, DEFAULT, DEFAULT]
  const bg = counts.has(DEFAULT) ? DEFAULT : (ranked.find(([color]) => color !== fg)?.[0] ?? DEFAULT)
  const mask = pixels.reduce((m, p, i) => (p === fg ? m | (1 << i) : m), 0)
  return [QUADRANTS.charCodeAt(mask), fg, bg]
}

export function paint(t: number): Uint32Array {
  const c: Canvas = new Uint32Array(WIDTH * HEIGHT).fill(DEFAULT)
  variantAt(t).draw(c, t)
  poof(c, t)

  const cells = new Uint32Array(SCENE_COLUMNS * SCENE_ROWS * 3)
  for (let row = 0; row < SCENE_ROWS; row++) {
    for (let col = 0; col < SCENE_COLUMNS; col++) {
      const x = col * 2
      const y = row * 2
      cells.set(cell([get(c, x, y), get(c, x + 1, y), get(c, x, y + 1), get(c, x + 1, y + 1)]), (row * SCENE_COLUMNS + col) * 3)
    }
  }
  return cells
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

// Raster cells are little-endian u32s; typed arrays use the host's order,
// which is little-endian on every platform Claude Code ships for.
export function encode(words: Uint32Array): string {
  const bytes = new Uint8Array(words.buffer, words.byteOffset, words.byteLength)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const d = bytes[i + 2] ?? 0
    const n = (a << 16) | (b << 8) | d
    out += ALPHABET[(n >> 18) & 63]
    out += ALPHABET[(n >> 12) & 63]
    out += i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : '='
    out += i + 2 < bytes.length ? ALPHABET[n & 63] : '='
  }
  return out
}

export function frame(t: number): string {
  return encode(paint(t))
}
