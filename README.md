# claude-code-halloween

A Claude Code mod that haunts the terminal UI. An animated Clawd sits in the
band above the prompt and cycles through three Halloween costumes every nine
seconds, swapping in a puff of smoke:

| Costume | Effects |
| --- | --- |
| Pumpkin Clawd | carved face lit by a flickering candle, a stem, bats flapping across the band |
| Ghost Clawd | bobs up and down, wavy sheet hem, drifting fog, faint sparkles |
| Witch Clawd | pointed hat with a gold buckle, glowing green eyes that blink, full moon, twinkling stars, lightning |

The spinner joins in too (`Haunting...`, `Conjuring...`, `Brewing...`), and the
line that closes a turn says `Spooked for 12s` instead of `Baked for 12s`.

![Frames of the three costumes](docs/preview.png)

## Install

```
/plugin install haunted-clawd --marketplace whirlwin/claude-code-halloween
```

Answer `y` to add the marketplace, then pick a scope.

## Use

| Command | What it does |
| --- | --- |
| `/halloween` | hide Clawd, or bring him back |
| `/halloween next` | skip straight to the next costume |

## Why above the prompt and not the welcome logo

Mods can only draw where Claude Code exposes a render site, and the welcome
screen logo is not one of them (as of Claude Code 2.1.296). So the mod draws
its own Clawd in the band above the prompt, as a `Raster` of half block
pixels traced from the welcome screen glyphs, and repaints it with
`$.ui.blit` on a 150 ms clock instead of redrawing the whole tree.

The band steps aside (and Claude Code draws its own) when a survey holds it,
when the terminal is narrower than 24 columns, or when fewer than 8 rows are
free above the prompt. It only draws in the terminal; the desktop app keeps
its own band.

## Develop

```
claude --plugin-dir .
claude plugin validate .
claude plugin test .
```

The plugin is named `haunted-clawd` because Claude Code reserves plugin names
starting with `claude-`.
