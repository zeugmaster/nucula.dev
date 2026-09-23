#!/usr/bin/env python3
"""Export website artwork from nucula-v2 with KiCad's pcbnew-enabled Python."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

import pcbnew as k


ROOT = Path(__file__).resolve().parents[1]
LAYERS = [
    ("bcu", k.B_Cu, "#3C7A6A"),
    ("in2cu", k.In2_Cu, "#789B72"),
    ("in1cu", k.In1_Cu, "#8D82B5"),
    ("fcu", k.F_Cu, "#D98E4A"),
    ("ffab", k.F_Fab, "#6E7A70"),
    ("fsilk", k.F_SilkS, "#E4E0D4"),
    ("edge", k.Edge_Cuts, "#9BA69C"),
]


def tint(svg, color):
    svg = svg.replace("#000000", color).replace("#FFFFFF", "#000000")
    # Avoid timestamps making identical source exports differ.
    svg = re.sub(r"<title>.*?</title>", "<title>Nucula v2 · KiCad export</title>", svg)
    return "\n".join(line.rstrip() for line in svg.splitlines()) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, help="Directory containing nucula-v2.kicad_pcb")
    parser.add_argument("--renders", action="store_true", help="Also refresh the spare 3D PNGs")
    args = parser.parse_args()
    project = args.project.expanduser().resolve()
    source = project / "nucula-v2.kicad_pcb"
    cli = os.environ.get("KICAD_CLI") or shutil.which("kicad-cli")
    if not cli:
        mac_cli = Path("/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli")
        if mac_cli.is_file():
            cli = str(mac_cli)
    if not cli:
        parser.error("Set KICAD_CLI to the KiCad CLI executable")

    board = k.LoadBoard(str(source))
    # Modify only the in-memory plotting copy; never save to the source project.
    for zone in board.Zones():
        zone.UnFill()
    for footprint in board.GetFootprints():
        for field in footprint.GetFields():
            field.SetVisible(field.GetName() == "Reference")

    bounds = board.GetBoardEdgesBoundingBox()
    x, y, width, height = [k.ToMM(value) for value in (
        bounds.GetX(), bounds.GetY(), bounds.GetWidth(), bounds.GetHeight()
    )]
    # All layers share one coordinate system, with room for connector overhangs.
    viewbox = f"{x - 2:.4f} {y - 2:.4f} {width + 4:.4f} {height + 4:.4f}"
    output = ROOT / "public/pcb"
    output.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="nucula-web-") as tmp:
        plot = k.PLOT_CONTROLLER(board)
        options = plot.GetPlotOptions()
        options.SetOutputDirectory(tmp)
        options.SetPlotFrameRef(False)
        options.SetPlotValue(False)
        options.SetPlotReference(True)
        options.SetAutoScale(False)
        options.SetScale(1)
        options.SetUseAuxOrigin(False)
        options.SetDrillMarksType(k.DRILL_MARKS_FULL_DRILL_SHAPE)
        for name, layer, color in LAYERS:
            plot.SetLayer(layer)
            plot.OpenPlotfile(name, k.PLOT_FORMAT_SVG, "")
            plot.PlotLayer()
            plot.ClosePlot()
            svg = (Path(tmp) / f"nucula-v2-{name}.svg").read_text()
            content = svg[svg.index("<g "):svg.rindex("</svg>")]
            (output / f"{name}.svg").write_text(
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">\n'
                f'<title>Nucula v2 · {k.LayerName(layer)}</title>\n'
                + tint(content, color) + "</svg>\n"
            )

        schematic_dir = Path(tmp) / "schematic"
        subprocess.run([
            cli, "sch", "export", "svg", "--black-and-white",
            "--exclude-drawing-sheet", "--no-background-color",
            "-o", str(schematic_dir), str(project / "nucula-v2.kicad_sch"),
        ], check=True)
        schematic = schematic_dir / "nucula-v2-Power + ESP32-C3.svg"
        (output / "schematic.svg").write_text(tint(schematic.read_text(), "#55605A"))

    metadata = {
        "source": source.name,
        "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "kicadVersion": k.Version(),
        "viewBox": viewbox,
        "aspectRatio": f"{width + 4:.4f} / {height + 4:.4f}",
        "layers": [k.LayerName(layer) for _, layer, _ in LAYERS],
        "schematicSheet": "Power + ESP32-C3 (page 2)",
    }
    (output / "source.json").write_text(json.dumps(metadata, indent=2) + "\n")

    if args.renders:
        for side in ("top", "bottom"):
            subprocess.run([
                cli, "pcb", "render", "--side", side, "--width", "1000",
                "--height", "1600", "--quality", "high", "--background", "transparent",
                "-o", str(output / f"render_{side}.png"), str(source),
            ], check=True)
    print(f"Exported {len(LAYERS)} aligned PCB layers and the power schematic to {output}")


if __name__ == "__main__":
    main()
