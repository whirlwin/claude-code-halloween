// The band's picture: a canvas of square pixels, two to a terminal cell
// (upper and lower half blocks), packed into Raster cells.

export const DEFAULT = 0x01000000
export const SCENE_ROWS = 8
export const MIN_COLUMNS = 24
export const MAX_COLUMNS = 56
export const TICK_MS = 150
export const FRAMES_PER_VARIANT = 60

const HEIGHT = SCENE_ROWS * 2
const POOF_FRAMES = 4

// Clawd as the welcome screen draws him, one quadrant glyph pixel per column
// and doubled in height, so a half block pixel keeps his proportions.
const CLAWD = [
  '...############...',
  '...##.######.##...',
  '.################.',
  '...############...',
  '....#.#....#.#....',
]
const CLAWD_WIDTH = 18
const EYES = [5, 12]
const LEFT = 2
const TOP = 6

type Canvas = { width: number; px: Uint32Array }

export type Variant = {
  name: string
  tagline: string
  color: string
  draw: (c: Canvas, t: number) => void
}

function rnd(a: number, b: number, c = 0): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function set(c: Canvas, x: number, y: number, color: number): void {
  if (x >= 0 && x < c.width && y >= 0 && y < HEIGHT) {
    c.px[y * c.width + x] = color
  }
}

function body(c: Canvas, oy: number, color: (x: number, y: number) => number, rows = CLAWD.length): void {
  for (let q = 0; q < rows; q++) {
    const line = CLAWD[q] ?? ''
    for (let x = 0; x < CLAWD_WIDTH; x++) {
      if (line[x] === '#') {
        set(c, LEFT + x, oy + q * 2, color(x, q * 2))
        set(c, LEFT + x, oy + q * 2 + 1, color(x, q * 2 + 1))
      }
    }
  }
}

function sprite(c: Canvas, x0: number, y0: number, rows: string[], color: number): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') set(c, x0 + x, y0 + y, color)
    }
  })
}

const BAT_UP = ['#...#', '.###.']
const BAT_DOWN = ['.###.', '#...#']

function bats(c: Canvas, t: number): void {
  const lane = c.width + 10
  for (const [speed, offset, height, color] of [
    [1, 0, 2, 0x9b6bd6],
    [2, 17, 7, 0x7a4fb5],
    [1, 31, 11, 0xb38be6],
  ] as const) {
    const x = c.width - ((t * speed + offset) % lane)
    const y = height + Math.round(Math.sin((t + offset) / 3) * 1.5)
    sprite(c, x, y, (t + offset) % 4 < 2 ? BAT_UP : BAT_DOWN, color)
  }
}

const FLAME = [0xffd23f, 0xffb000, 0xfff1a8, 0xffc83d]

const pumpkin: Variant = {
  name: 'Pumpkin Clawd',
  tagline: 'carved, lit, slightly singed',
  color: '#FF7518',
  draw(c, t) {
    bats(c, t)
    body(c, TOP, x => (x === 6 || x === 11 ? 0xd9590f : 0xff7518))
    const glow = FLAME[Math.floor(rnd(t, 7) * FLAME.length)] ?? 0xffd23f
    for (const eye of EYES) {
      for (const [dx, dy] of [[0, 2], [0, 3], [-1, 3], [1, 3]] as const) {
        set(c, LEFT + eye + dx, TOP + dy, glow)
      }
    }
    for (const x of [5, 7, 9, 11, 13]) set(c, LEFT + x, TOP + 5, glow)
    for (const x of [6, 8, 10, 12]) set(c, LEFT + x, TOP + 6, glow)
    sprite(c, LEFT + 8, TOP - 3, ['...#', '.#.#', '##..'], 0x4e8a2e)
  },
}

const ghost: Variant = {
  name: 'Ghost Clawd',
  tagline: 'boo. also, your tests pass',
  color: '#E8ECF4',
  draw(c, t) {
    const oy = TOP - 1 + Math.round(Math.sin(t * 0.4))
    body(c, oy, (_, y) => (y >= 6 ? 0xc9d3e3 : 0xe8ecf4), 4)
    const hem = Math.floor(t / 2) % 3
    for (let x = 3; x <= 14; x++) {
      set(c, LEFT + x, oy + 8, 0xc9d3e3)
      if ((x + hem) % 3 !== 0) set(c, LEFT + x, oy + 9, 0xb8c4d6)
    }
    for (const eye of EYES) {
      set(c, LEFT + eye, oy + 2, 0x2e3440)
      set(c, LEFT + eye, oy + 3, 0x2e3440)
    }
    for (const [x, y] of [[8, 5], [9, 5], [8, 6], [9, 6]] as const) {
      set(c, LEFT + x, oy + y, 0x2e3440)
    }
    for (let x = 22; x < c.width; x++) {
      for (let y = 0; y < HEIGHT - 4; y++) {
        const r = rnd(x, y, Math.floor(t / 3))
        if (r < 0.006) set(c, x, y, 0x88c0d0)
      }
    }
    for (let x = 0; x < c.width; x++) {
      for (const y of [HEIGHT - 2, HEIGHT - 1]) {
        if (rnd(Math.floor((x + t) / 2), y) < (y === HEIGHT - 1 ? 0.7 : 0.35)) {
          set(c, x, y, y === HEIGHT - 1 ? 0x5e6b7d : 0x7a8799)
        }
      }
    }
  },
}

const HAT = [
  '.........##.......',
  '.......####.......',
  '......######......',
  '.....########.....',
  '....##########....',
  '##################',
]

const witch: Variant = {
  name: 'Witch Clawd',
  tagline: 'brewing something compiled',
  color: '#B38BE6',
  draw(c, t) {
    const moon = c.width - 8
    for (let y = 0; y < 9; y++) {
      for (let x = moon - 4; x <= moon + 4; x++) {
        if ((x - moon) ** 2 + (y - 4) ** 2 <= 13) {
          set(c, x, y, (x === moon + 1 && y === 3) || (x === moon - 2 && y === 5) ? 0xd9c98a : 0xf5e6a8)
        }
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = 22 + Math.floor(rnd(i, 1) * Math.max(1, c.width - 32))
      const y = Math.floor(rnd(i, 2) * (HEIGHT - 3))
      const twinkle = rnd(i, Math.floor(t / 2))
      if (twinkle > 0.3) set(c, x, y, twinkle > 0.75 ? 0xffffff : 0x8888aa)
    }
    if (t % 37 < 2) {
      let x = 24 + Math.floor(rnd(Math.floor(t / 37), 3) * Math.max(1, c.width - 36))
      for (let y = 0; y < HEIGHT; y++) {
        set(c, x, y, 0xfff7ae)
        x += y % 3 === 2 ? -1 : 1
      }
    }
    body(c, TOP, () => 0xd77757)
    const isBlinking = t % 25 === 0
    for (const eye of EYES) {
      const color = isBlinking ? 0xd77757 : 0x7cfc00
      set(c, LEFT + eye, TOP + 2, color)
      set(c, LEFT + eye, TOP + 3, color)
    }
    HAT.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') set(c, LEFT + x, y, y === HAT.length - 1 ? 0x3d1a5b : 0x6a2c9e)
      }
    })
    set(c, LEFT + 8, 4, 0xffd700)
    set(c, LEFT + 9, 4, 0xffd700)
  },
}

export const VARIANTS: readonly Variant[] = [pumpkin, ghost, witch]

export function variantAt(t: number): Variant {
  return VARIANTS[Math.floor(t / FRAMES_PER_VARIANT) % VARIANTS.length] ?? pumpkin
}

const SMOKE = [0x8b5fbf, 0x6fbf3a, 0xb0b0b0]

// A puff of smoke over the first frames of each variant hides the swap.
function poof(c: Canvas, t: number): void {
  const f = t % FRAMES_PER_VARIANT
  if (f >= POOF_FRAMES) return
  const density = (POOF_FRAMES - f) / (POOF_FRAMES + 1)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < LEFT + CLAWD_WIDTH + 2; x++) {
      if (rnd(x, y, t) < density) {
        set(c, x, y, SMOKE[Math.floor(rnd(y, x, t) * SMOKE.length)] ?? 0xb0b0b0)
      }
    }
  }
}

export function paint(t: number, columns: number): Uint32Array {
  const c: Canvas = { width: columns, px: new Uint32Array(columns * HEIGHT).fill(DEFAULT) }
  variantAt(t).draw(c, t)
  poof(c, t)

  const cells = new Uint32Array(columns * SCENE_ROWS * 3)
  for (let row = 0; row < SCENE_ROWS; row++) {
    for (let x = 0; x < columns; x++) {
      const top = c.px[row * 2 * columns + x] ?? DEFAULT
      const bottom = c.px[(row * 2 + 1) * columns + x] ?? DEFAULT
      const at = (row * columns + x) * 3
      if (top === DEFAULT && bottom === DEFAULT) {
        cells.set([0x20, DEFAULT, DEFAULT], at)
      } else if (top === bottom) {
        cells.set([0x2588, top, DEFAULT], at)
      } else if (top === DEFAULT) {
        cells.set([0x2584, bottom, DEFAULT], at)
      } else {
        cells.set([0x2580, top, bottom], at)
      }
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

export function frame(t: number, columns: number): string {
  return encode(paint(t, columns))
}
