"use client";

import { useState } from "react";
import Section from "./Section";
import Reveal from "./Reveal";
import XrayBoard from "./XrayBoard";

const layerDefs = [
  { id: "fcu", src: "/pcb/fcu.svg", name: "F.Cu", desc: "front copper", color: "#d98e4a", opacity: 1 },
  { id: "bcu", src: "/pcb/bcu.svg", name: "B.Cu", desc: "back copper", color: "#3c7a6a", opacity: 0.65 },
  { id: "fsilk", src: "/pcb/fsilk.svg", name: "F.Silkscreen", desc: "labels", color: "#e4e0d4", opacity: 0.9 },
  { id: "ffab", src: "/pcb/ffab.svg", name: "F.Fab", desc: "assembly drawing", color: "#6e7a70", opacity: 0.45 },
  { id: "edge", src: "/pcb/edge.svg", name: "Edge.Cuts", desc: "board outline", color: "#9ba69c", opacity: 0.85 },
];

const specs = [
  { key: "MCU", value: "Seeed XIAO ESP32-C6", note: "WiFi + BLE, RISC-V" },
  { key: "NFC", value: "NXP PN7160", note: "card emulation · i2c 0x28" },
  { key: "DISPLAY", value: "SSD1309 OLED", note: "128 × 64 px · i2c 0x3c" },
  { key: "INPUT", value: "3×4 keypad", note: "via PCF8574 · i2c 0x20" },
  { key: "BUS", value: "One shared I²C bus", note: "four wires, that's it" },
];

export default function Hardware() {
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(layerDefs.map((l) => [l.id, l.id !== "ffab"]))
  );

  return (
    <Section id="hardware" index="03" label="Hardware">
      <div className="grid grid-cols-1 gap-14 md:grid-cols-2 md:gap-10">
        <div>
          <Reveal>
            <h2 className="max-w-[16ch] text-3xl font-medium leading-tight tracking-tight md:text-5xl">
              Four chips and a bus.
            </h2>
            <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-muted md:text-lg">
              The reference board is a carrier for parts you can actually buy:
              a Seeed XIAO module, an NFC controller, a small OLED and a
              keypad. Everything hangs off a single I²C bus — and every
              peripheral is optional. The firmware probes the bus and runs
              with whatever it finds.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <dl className="mt-12 border-t border-line">
              {specs.map((s) => (
                <div
                  key={s.key}
                  className="grid grid-cols-[92px_1fr] items-baseline gap-4 border-b border-line py-4 sm:grid-cols-[110px_1fr_auto]"
                >
                  <dt className="mono-label text-muted">{s.key}</dt>
                  <dd className="text-sm text-ink md:text-base">{s.value}</dd>
                  <dd className="mono-label col-start-2 text-muted/70 sm:col-start-3 sm:text-right">
                    {s.note}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={100} className="relative">
          <div className="border border-line bg-panel/60 p-6 md:p-8">
            <div className="mono-label mb-5 flex items-center justify-between text-muted">
              <span>nucula board v0.1 · rev 01</span>
              <span className="text-copper/70">layers</span>
            </div>
            <div className="mx-auto max-w-[300px]">
              <XrayBoard
                layers={layerDefs.map((l) => ({
                  id: l.id,
                  src: l.src,
                  opacity: l.opacity,
                  visible: visible[l.id],
                }))}
                label="Interactive layer view of the nucula circuit board"
              />
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {layerDefs.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() =>
                      setVisible((v) => ({ ...v, [l.id]: !v[l.id] }))
                    }
                    aria-pressed={visible[l.id]}
                    className={`mono-label flex items-center gap-2 transition-opacity ${visible[l.id] ? "text-ink" : "text-muted/50 opacity-60"}`}
                  >
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 border border-line-strong"
                      style={{
                        background: visible[l.id] ? l.color : "transparent",
                      }}
                    />
                    {l.name}
                  </button>
                ))}
              </div>
              <p className="mono-label mt-4 text-muted/60">
                Rendered from the project&apos;s actual KiCad files — toggle the
                layers.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
