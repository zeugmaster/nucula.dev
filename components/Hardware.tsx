"use client";

import { useState } from "react";
import Section from "./Section";
import Reveal from "./Reveal";
import XrayBoard from "./XrayBoard";
import { boardLayers } from "./board";

const specs = [
  { key: "MCU", value: "ESP32-C3-WROOM-02", note: "4 MB flash · WiFi + BLE · RISC-V" },
  { key: "NFC", value: "NXP PN7160", note: "40 mm PCB antenna · I²C 0x28" },
  { key: "DISPLAY", value: "2.4-inch SSD1309 OLED", note: "128 × 64 px · 24-contact ribbon · I²C 0x3C" },
  { key: "INPUT", value: "Detachable keypad section", note: "PCF8574T · I²C 0x20" },
  { key: "POWER", value: "USB-C + optional Li-ion", note: "Native USB data · 100 mA battery charging" },
  { key: "PCB", value: "60 × 110 mm · four layers", note: "35 mm breakaway keyboard section" },
];

export default function Hardware() {
  const [visible, setVisible] = useState<Record<string, boolean>>(
    Object.fromEntries(boardLayers.map((l) => [l.id, l.id !== "ffab"]))
  );

  return (
    <Section id="hardware" index="03" label="Hardware">
      <div className="grid grid-cols-1 gap-14 md:grid-cols-2 md:gap-10">
        <div>
          <Reveal>
            <h2 className="max-w-[16ch] text-3xl font-medium leading-tight tracking-tight md:text-5xl">
              One board. Four layers.
            </h2>
            <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-muted md:text-lg">
              The v2 board brings the ESP32-C3, NFC controller and antenna,
              display interface and battery charger onto one PCB. The OLED,
              NFC and detachable keyboard share a 100 kHz I²C bus.
            </p>
            <p className="mt-4 max-w-[48ch] text-sm leading-relaxed text-muted">
              Routed prototype, awaiting physical bring-up. RF tuning,
              power measurements and display fit checks are still ahead.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <dl className="mt-12 border-t border-line">
              {specs.map((s) => (
                <div
                  key={s.key}
                  className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 border-b border-line py-4 sm:grid-cols-[92px_minmax(0,1fr)]"
                >
                  <dt className="mono-label text-muted">{s.key}</dt>
                  <dd className="text-sm text-ink md:text-base">{s.value}</dd>
                  <dd className="col-start-2 text-xs leading-relaxed text-muted">
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
              <span>nucula v2 · four layers</span>
              <span className="text-copper/70">layers</span>
            </div>
            <div className="mx-auto max-w-[300px]">
              <XrayBoard
                layers={boardLayers.map((l) => ({
                  id: l.id,
                  src: l.src,
                  opacity: l.opacity,
                  visible: visible[l.id],
                }))}
                label="Interactive layer view of the four-layer Nucula v2 circuit board"
              />
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {boardLayers.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() =>
                      setVisible((v) => ({ ...v, [l.id]: !v[l.id] }))
                    }
                    aria-pressed={visible[l.id]}
                    title={l.desc}
                    className={`mono-label flex min-h-8 items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-copper ${visible[l.id] ? "text-ink" : "text-muted"}`}
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
              <p className="mono-label mt-4 text-muted">
                Toggle the KiCad layers. Copper fills are hidden to show the
                routing.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
