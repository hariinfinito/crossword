# crossword

An interactive crossword puzzle for intermediate solvers — a single, self-contained HTML file with no build step or dependencies.

## Play

Open **`crossword.html`** in any modern web browser. That's it.

## Features

- **15×15 grid** with 22 fully-interlocking words and intermediate-difficulty clues
- Click a cell or clue to start; **type to fill**, arrow keys to move, click a cell twice (or press space) to toggle Across/Down
- **Tab / Enter** and the ‹ › buttons jump between clues; the active word is highlighted
- **Check** (marks correct cells green, wrong cells red), **Reveal Cell / Word / All**, and **Clear**
- Live **timer** and automatic **win detection**
- **Progress is saved to `localStorage`** — your letters, elapsed time, and solved state are restored automatically when you reopen or refresh the page

## Files

| File | Purpose |
| --- | --- |
| `crossword.html` | The complete, self-contained app (all you need to play) |
| `puzzle.json` | The verified puzzle data (grid + clues) embedded in the app |
| `generate.js` | Node script that generated and verified the interlocking grid |

## Regenerating the puzzle

The puzzle was produced and verified with the generator:

```bash
node generate.js
```

This places a curated word list onto the grid, keeping only placements where every crossing letter is consistent, and writes `puzzle.json`.
