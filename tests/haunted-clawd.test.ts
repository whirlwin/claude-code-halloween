import { describe, expect, test } from 'claude-code/testing'
import type { RenderElement } from 'claude-code'

import { FRAMES_PER_VARIANT, SCENE_ROWS, VARIANTS, frame, paint, variantAt } from '../hooks/scene'

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 20,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 19 },
  view: {},
}

describe('scene', () => {
  test('cycles through three variants', async () => {
    expect(VARIANTS.map(v => v.name)).toEqual(['Pumpkin Clawd', 'Ghost Clawd', 'Witch Clawd'])
    expect(variantAt(0).name).toBe('Pumpkin Clawd')
    expect(variantAt(FRAMES_PER_VARIANT).name).toBe('Ghost Clawd')
    expect(variantAt(FRAMES_PER_VARIANT * 2).name).toBe('Witch Clawd')
    expect(variantAt(FRAMES_PER_VARIANT * 3).name).toBe('Pumpkin Clawd')
  })

  test('every frame packs width 1 block glyphs for the whole raster', async () => {
    const glyphs = new Set([0x20, 0x2580, 0x2584, 0x2588])
    for (let t = 0; t < FRAMES_PER_VARIANT * VARIANTS.length; t++) {
      const cells = paint(t, 40)
      expect(cells.length).toBe(40 * SCENE_ROWS * 3)
      for (let i = 0; i < cells.length; i += 3) {
        expect(glyphs.has(cells[i] ?? 0)).toBe(true)
      }
    }
    expect(frame(0, 40).length).toBe(Math.ceil((40 * SCENE_ROWS * 12) / 3) * 4)
  })
})

describe('band', () => {
  test('draws the haunted Clawd above the prompt', async $ => {
    const ui = await $.ui.mount({
      plugin: 'haunted-clawd',
      surface: 'terminal',
      component: 'AbovePrompt',
      requestId: 'band',
      props: BAND,
    })
    expect(await ui.find({ type: 'Raster', key: 'clawd' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Pumpkin Clawd' })).toBeDefined()
  })

  test('steps aside when the terminal is too narrow', async ($, on) => {
    on('ui.render', (engine, e) => {
      const { Text } = engine.ui.resolve(e)
      return h(Text, {}, 'engine band') as RenderElement
    })
    const ui = await $.ui.mount({
      plugin: 'haunted-clawd',
      surface: 'terminal',
      component: 'AbovePrompt',
      requestId: 'band',
      props: { ...BAND, bodyColumns: 12 },
    })
    expect(await ui.find({ type: 'Raster' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()
  })
})
