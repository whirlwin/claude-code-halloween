# claude-code-halloween

A Claude Code mod that haunts the spinner. While Claude works, a small
animated Clawd (the size of the welcome screen mascot, 3 rows by 12 columns)
takes the spinner's place and cycles through three Halloween costumes every
nine seconds, swapping in a puff of smoke:

| Costume | Effects |
| --- | --- |
| Pumpkin Clawd | carved face lit by a flickering candle, a stem, a flapping bat |
| Ghost Clawd | bobs up and down, wavy sheet hem, drifting fog, faint sparkles |
| Witch Clawd | pointed hat with a gold buckle, glowing green eyes that blink, moon, stars, lightning |

The word beside him turns spooky too (`Haunting…`, `Conjuring…`, `Brewing…`).
Nothing else on screen changes, and he is gone the moment the turn ends.

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

## How it works

Mods can only draw where Claude Code exposes a render site, and the welcome
screen logo is not one of them (as of Claude Code 2.1.296), so Clawd moves
into the spinner instead. He is a `Raster` of quadrant block glyphs traced
from the welcome screen, repainted with `$.ui.blit` on a 150 ms clock rather
than redrawing the whole tree.

Drawing a tree in the spinner's place drops what the engine draws after the
word (elapsed time, tokens, effort), so the mod shows its own elapsed time.
The token count is not shown. In the desktop app only the word changes.

## Develop

```
claude --plugin-dir .
claude plugin validate .
claude plugin test .
```

The plugin is named `haunted-clawd` because Claude Code reserves plugin names
starting with `claude-`.
