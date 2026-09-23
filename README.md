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

The x-ray board graphics in `public/pcb/` come from `nucula-v2.kicad_pcb`
in [nucula-board](https://github.com/zeugmaster/nucula-board). They show the
four-layer v2 board from the 22 September 2026 routing review.

Regenerate the assets with KiCad 10's **pcbnew-enabled Python** and `kicad-cli`:

```sh
python3 scripts/export-pcb.py ~/Developer/embedded/nucula-v2 --renders
```

On macOS, KiCad's bundled interpreter is typically at
`/Applications/KiCad/KiCad.app/Contents/Frameworks/Python.framework/Versions/Current/bin/python3`.
Set `KICAD_CLI` if the CLI is neither on `PATH` nor in the default macOS location.
Omit `--renders` to skip the spare 3D PNGs.

The script removes zone fills and hides non-reference footprint fields in an
in-memory plotting copy; the source project is never saved or changed. Seven
SVG layers share a viewBox derived from the board outline with a 2 mm margin.
The copper graphics retain traces, pads and vias. Exports are tinted and
composited with `mix-blend-mode: screen` on a dark background.

`public/pcb/source.json` records the source board's SHA-256, KiCad version and
shared aspect ratio, which `XrayBoard` uses to keep the graphics proportional.
`components/board.ts` defines the common layer order, colors and opacity for
the hero and interactive viewer. The schematic background is the v2 project's
power/ESP32-C3 sheet.

Layer tints:

| file            | layer        | color     |
| --------------- | ------------ | --------- |
| `fcu.svg`       | F.Cu         | `#D98E4A` |
| `bcu.svg`       | B.Cu         | `#3C7A6A` |
| `in1cu.svg`     | In1.Cu       | `#8D82B5` |
| `in2cu.svg`     | In2.Cu       | `#789B72` |
| `fsilk.svg`     | F.Silkscreen | `#E4E0D4` |
| `ffab.svg`      | F.Fab        | `#6E7A70` |
| `edge.svg`      | Edge.Cuts    | `#9BA69C` |
| `schematic.svg` | (schematic)  | `#55605A` |

`og.png` is a 1200×630 screenshot of the hero; refresh it after changing the
hero or PCB artwork. `render_top.png` and `render_bottom.png` are
`kicad-cli pcb render` raytraces, kept as spare assets. They depend on the
3D models available in the local KiCad installation.

The PCB artwork derives from the Nucula Board hardware project, distributed
under [CERN-OHL-S-2.0](https://github.com/zeugmaster/nucula-board/blob/main/LICENSE).
Its power design is adapted from Olimex ESP32-C3-DevKit-Lipo revision C;
see the hardware repository for source files, attribution and library licenses.
