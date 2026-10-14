import { describe, expect, mock, test } from 'claude-code/testing'
import type { RenderElement } from 'claude-code'

import { FRAMES_PER_VARIANT, SCENE_COLUMNS, SCENE_ROWS, VARIANTS, frame, paint, variantAt } from '../hooks/scene'

const SPINNER = { word: 'Baking', message: null, suffix: '…', mode: 'responding' as const }
const SPOOKY = /Haunting|Conjuring|Brewing|Summoning|Cackling|Lurking|Bewitching|Spooking|Creeping|Hexing|Possessing|Carving/

describe('scene', () => {
  test('cycles through three costumes', async () => {
    expect(VARIANTS.map(v => v.name)).toEqual(['Pumpkin Clawd', 'Ghost Clawd', 'Witch Clawd'])
    expect(variantAt(FRAMES_PER_VARIANT).name).toBe('Ghost Clawd')
    expect(variantAt(FRAMES_PER_VARIANT * 3).name).toBe('Pumpkin Clawd')
  })

  test('every frame packs width 1 block glyphs for the whole raster', async () => {
    const glyphs = new Set([...' ▘▝▀▖▌▞▛▗▚▐▜▄▙▟█'].map(ch => ch.charCodeAt(0)))
    for (let t = 0; t < FRAMES_PER_VARIANT * VARIANTS.length; t++) {
      const cells = paint(t)
      expect(cells.length).toBe(SCENE_COLUMNS * SCENE_ROWS * 3)
      for (let i = 0; i < cells.length; i += 3) {
        expect(glyphs.has(cells[i] ?? 0)).toBe(true)
      }
    }
    expect(frame(0).length).toBe(Math.ceil((SCENE_COLUMNS * SCENE_ROWS * 12) / 3) * 4)
  })
})

describe('spinner', () => {
  test('draws Clawd beside a spooky word in the terminal', async ($, on) => {
    mock.clock(on)
    const ui = await $.ui.mount({
      plugin: 'haunted-clawd',
      surface: 'terminal',
      component: 'Spinner',
      requestId: 'main',
      props: SPINNER,
    })
    expect(await ui.find({ type: 'Raster', key: 'clawd' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: SPOOKY })).toBeDefined()
  })

  test('only swaps the word where it cannot draw a raster', async ($, on) => {
    on('ui.render', (engine, e) => {
      const { Text } = engine.ui.resolve(e)
      const props = e.props as { word?: string }
      return h(Text, {}, `engine ${props.word ?? ''}`) as RenderElement
    })
    const ui = await $.ui.mount({
      plugin: 'haunted-clawd',
      surface: 'desktop',
      component: 'Spinner',
      requestId: 'main',
      props: SPINNER,
    })
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: SPOOKY })).toBeDefined()
  })
})
