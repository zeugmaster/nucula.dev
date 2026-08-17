import Section from "./Section";
import Reveal from "./Reveal";

export default function Build() {
  return (
    <Section id="build" index="05" label="Build one" className="overflow-hidden">
      {/* faint schematic in the background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pcb/schematic.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-44 top-[58%] hidden h-[165%] w-auto max-w-none -translate-y-1/2 select-none opacity-[0.07] lg:block"
        style={{
          maskImage:
            "linear-gradient(to left, black 40%, transparent 95%)",
          WebkitMaskImage:
            "linear-gradient(to left, black 40%, transparent 95%)",
        }}
      />
      <div className="relative grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-10">
        <Reveal>
          <h2 className="max-w-[14ch] text-3xl font-medium leading-tight tracking-tight md:text-5xl">
            There&apos;s nothing to buy.
          </h2>
          <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-muted md:text-lg">
            Nucula isn&apos;t a product — it&apos;s a repository. With a XIAO
            ESP32-C6, the ESP-IDF toolchain and a few parts from the drawer,
            you can put a wallet together at your desk. The board files are
            plain KiCad, ready for any fab.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              ["Toolchain", "ESP-IDF v5.x — the standard Espressif SDK."],
              ["WiFi", "Credentials live in main/wifi_config.h."],
              [
                "Updates",
                "Re-flashing preserves wallet storage — your tokens survive firmware updates. Only the first flash starts fresh.",
              ],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-4 text-sm leading-relaxed">
                <span className="mono-label mt-0.5 w-24 shrink-0 text-copper/80">
                  {k}
                </span>
                <span className="text-muted">{v}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={130}>
          <div className="border border-line bg-panel/80">
            <div className="mono-label flex items-center justify-between border-b border-line px-5 py-3 text-muted">
              <span>quickstart</span>
              <span className="flex gap-1.5" aria-hidden>
                <span className="h-2 w-2 rounded-full bg-line-strong" />
                <span className="h-2 w-2 rounded-full bg-line-strong" />
                <span className="h-2 w-2 rounded-full bg-copper/60" />
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7 text-silk">
              <code>
                <span className="text-muted/60">$ </span>git clone
                https://github.com/zeugmaster/nucula.git{"\n"}
                <span className="text-muted/60">$ </span>cd nucula{"\n"}
                <span className="text-muted/60">
                  # set your WiFi credentials{"\n"}
                </span>
                <span className="text-muted/60">$ </span>
                $EDITOR main/wifi_config.h{"\n"}
                <span className="text-muted/60">$ </span>
                <span className="text-copper-bright">idf.py</span> build flash
                monitor
              </code>
            </pre>
            <div className="mono-label border-t border-line px-5 py-3 text-muted/60">
              flashing takes a minute — the wallet boots straight to its
              balance
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
