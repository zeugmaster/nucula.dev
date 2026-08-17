# nucula.dev

Landing page for [nucula](https://github.com/zeugmaster/nucula) — a Cashu
ecash wallet for the ESP32 with NFC tap-to-pay.

Built with Next.js (App Router) and Tailwind CSS v4. Designed to be hosted on
Vercel.

## Development

```sh
npm install
npm run dev
```

## PCB graphics

The x-ray board graphics in `public/pcb/` are generated from the actual
KiCad files of the nucula board (`nucula-board.kicad_pcb`) using
`kicad-cli`, one SVG per layer:

```sh
kicad-cli pcb export svg \
  --mode-single --exclude-drawing-sheet --fit-page-to-board \
  --black-and-white --drill-shape-opt 2 \
  -l F.Cu -o fcu.svg nucula-board.kicad_pcb
```

For the copper layers, the zone fills (`filled_polygon` blocks) are stripped
from a temporary copy of the board file first, so only traces, pads and vias
remain. The exported SVGs are then tinted by replacing `#000000` with a layer
color and `#FFFFFF` (drill holes) with `#000000`, and composited in the
browser with `mix-blend-mode: screen` on a dark background.

Layer tints:

| file            | layer        | color     |
| --------------- | ------------ | --------- |
| `fcu.svg`       | F.Cu         | `#D98E4A` |
| `bcu.svg`       | B.Cu         | `#3C7A6A` |
| `fsilk.svg`     | F.Silkscreen | `#E4E0D4` |
| `ffab.svg`      | F.Fab        | `#6E7A70` |
| `edge.svg`      | Edge.Cuts    | `#9BA69C` |
| `schematic.svg` | (schematic)  | `#55605A` |

`og.png` is a 1200×630 screenshot of the hero. `render_top.png` and
`render_bottom.png` are `kicad-cli pcb render` raytraces of the board, kept
around as spare assets.
