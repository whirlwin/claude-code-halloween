import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { FRAMES_PER_VARIANT, SCENE_COLUMNS, SCENE_ROWS, TICK_MS, frame, variantAt, wordAt } from './scene'

const isHidden = atom({ plugin: 'halloween', key: 'isHidden' } as const, false)

const RASTER = 'clawd'
const TICKS_PER_SECOND = Math.round(1000 / TICK_MS)

function elapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export const register: Register = on => {
  let tick = 0
  // The spinner as last drawn, which the timer repaints between draws.
  let spinner: string | null = null
  // When each spinner first drew: drawing a tree replaces the engine's own
  // elapsed time, so the mod keeps its own.
  const startedAt = new Map<string, number>()

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'halloween',
      description: 'Show or hide the haunted Clawd in the spinner; "next" summons the next one',
      argumentHint: '[next]',
    })

    $.clock.every(TICK_MS, () => {
      tick += 1
      if (spinner === null) return
      // The name and timer are text, so a new costume or second is a redraw.
      if (tick % FRAMES_PER_VARIANT === 0 || tick % TICKS_PER_SECOND === 0) {
        $.ui.invalidate('ui.render')
        return
      }
      const requestId = spinner
      void $.ui.blit({ requestId, key: RASTER, cells: frame(tick) }).then(result => {
        if (result.deny !== undefined && spinner === requestId) {
          spinner = null
          startedAt.delete(requestId)
        }
      })
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

  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (await read($, isHidden)) {
      spinner = null
      return next(e)
    }
    // The costume's own word, not one derived from the engine's: that word
    // can stay the same turn after turn, which pinned the spinner to one.
    const word = wordAt(tick)
    if (e.surface !== 'terminal') {
      return next({ ...e, props: { ...e.props, word } })
    }

    const now = await $.clock.now()
    const start = startedAt.get(e.requestId) ?? now
    startedAt.set(e.requestId, start)
    spinner = e.requestId
    const variant = variantAt(tick)
    const { Box, Raster, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row">
        <Raster key={RASTER} columns={SCENE_COLUMNS} rows={SCENE_ROWS} cells={frame(tick)} />
        <Box flexDirection="column" justifyContent="center" marginLeft={1}>
          <Text>
            <Text color={variant.color}>{e.props.message ?? word}{e.props.suffix}</Text>
            <Text dimColor> ({elapsed(now - start)})</Text>
          </Text>
        </Box>
      </Box>
    )
  })
}
