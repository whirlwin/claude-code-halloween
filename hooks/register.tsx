import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { MAX_COLUMNS, MIN_COLUMNS, SCENE_ROWS, TICK_MS, FRAMES_PER_VARIANT, frame, variantAt } from './scene'

const isHidden = atom({ plugin: 'haunted-clawd', key: 'isHidden' } as const, false)

const RASTER = 'clawd'
const CAPTION_COLUMNS = 32

const SPOOKY = ['Haunting', 'Conjuring', 'Brewing', 'Summoning', 'Cackling', 'Lurking', 'Bewitching', 'Spooking', 'Creeping', 'Hexing', 'Possessing', 'Carving']
const SPOOKED = ['Haunted', 'Conjured', 'Brewed', 'Summoned', 'Cackled', 'Lurked', 'Bewitched', 'Spooked', 'Crept', 'Hexed', 'Possessed', 'Carved']

// Keyed on the engine's own sampled word, so a line keeps its word across redraws.
function pick(words: string[], seed: string): string {
  let h = 0
  for (const ch of seed) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0
  return words[Math.abs(h) % words.length] ?? words[0] ?? seed
}

export const register: Register = on => {
  let tick = 0
  let isOff = false
  // The band as last drawn, which the timer repaints between draws.
  let site: { requestId: string; columns: number } | null = null

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'halloween',
      description: 'Show or hide the haunted Clawd; "next" summons the next one',
      argumentHint: '[next]',
    })

    $.clock.every(TICK_MS, () => {
      tick += 1
      if (tick % FRAMES_PER_VARIANT === 0) {
        // The caption names the variant, so a new one is a redraw, not a blit.
        $.ui.invalidate('ui.render')
      } else if (site !== null && !isOff) {
        void $.ui.blit({ requestId: site.requestId, key: RASTER, cells: frame(tick, site.columns) })
      }
    })

    return next(e)
  })

  on('command.run', { command: 'halloween' }, async ($, e) => {
    if (e.args.trim() === 'next') {
      tick = (Math.floor(tick / FRAMES_PER_VARIANT) + 1) * FRAMES_PER_VARIANT
      await update($, isHidden, () => false)
      $.ui.invalidate('ui.render')
      return { text: `${variantAt(tick).name} rises.` }
    }
    const hidden = await update($, isHidden, was => !was)
    return { text: hidden ? 'Clawd returns to the crypt.' : 'Clawd rises again.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)
    isOff = await read($, isHidden)
    const { bodyColumns, hasSurvey, maxRows } = e.props
    if (isOff || hasSurvey || maxRows < SCENE_ROWS || bodyColumns < MIN_COLUMNS) {
      site = null
      return next(e)
    }

    const hasCaption = bodyColumns - MIN_COLUMNS >= CAPTION_COLUMNS
    const columns = Math.min(MAX_COLUMNS, hasCaption ? bodyColumns - CAPTION_COLUMNS : bodyColumns)
    site = { requestId: e.requestId, columns }
    const variant = variantAt(tick)
    const { Box, Raster, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row">
        <Raster key={RASTER} columns={columns} rows={SCENE_ROWS} cells={frame(tick, columns)} />
        {hasCaption && (
          <Box flexDirection="column" justifyContent="center" marginLeft={2}>
            <Text bold color={variant.color}>{variant.name}</Text>
            <Text dimColor>{variant.tagline}</Text>
            <Text dimColor>/halloween next, or /halloween to hide</Text>
          </Box>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Spinner' }, ($, e, next) =>
    next({ ...e, props: { ...e.props, word: pick(SPOOKY, e.props.word) } }),
  )

  on('ui.render', { component: 'TurnDuration' }, ($, e, next) =>
    next({ ...e, props: { ...e.props, word: pick(SPOOKED, e.props.word) } }),
  )
}
