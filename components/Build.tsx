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
            Start with the open KiCad 10 project: schematics, board layout,
            BOM and manufacturing files are all in the hardware repository.
            The v2 board is a routed prototype for manual assembly;
            hardware bring-up and firmware integration are still in progress.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              ["Design", "KiCad 10, with standard libraries and the included project-specific parts."],
              ["Fabrication", "Four layers, 1.6 mm, ENIG. Gerbers, drills and assembly drawings are included."],
              ["Assembly", "The OLED panel, external keypad and optional battery are sourced separately."],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-4 text-sm leading-relaxed">
                <span className="mono-label mt-0.5 w-24 shrink-0 text-copper/80">
                  {k}
                </span>
                <span className="text-muted">{v}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <a
              href="https://github.com/zeugmaster/nucula-board"
              target="_blank"
              rel="noreferrer"
              className="text-copper-bright underline underline-offset-4 hover:text-ink"
            >
              Board files &amp; manufacturing ↗
            </a>
            <a
              href="https://github.com/zeugmaster/nucula"
              target="_blank"
              rel="noreferrer"
              className="text-muted underline underline-offset-4 hover:text-ink"
            >
              Wallet firmware ↗
            </a>
          </div>
        </Reveal>

        <Reveal delay={130}>
          <div className="border border-line bg-panel/80">
            <div className="mono-label flex items-center justify-between border-b border-line px-5 py-3 text-muted">
              <span>open the hardware</span>
              <span className="flex gap-1.5" aria-hidden>
                <span className="h-2 w-2 rounded-full bg-line-strong" />
                <span className="h-2 w-2 rounded-full bg-line-strong" />
                <span className="h-2 w-2 rounded-full bg-copper/60" />
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7 text-silk">
              <code>
                <span className="text-muted/60">$ </span>git clone{" "}
                https://github.com/zeugmaster/nucula-board.git{"\n"}
                <span className="text-muted/60">$ </span>cd nucula-board{"\n"}
                <span className="text-muted/60">
                  # check the schematic with KiCad CLI installed{"\n"}
                </span>
                <span className="text-muted/60">$ </span>
                python3 tools/check_schematic.py{"\n"}
                <span className="text-muted/60">$ </span>
                <span className="text-copper-bright">kicad</span> nucula-v2.kicad_pro
              </code>
            </pre>
            <div className="mono-label border-t border-line px-5 py-3 text-muted/60">
              current PCB: v2 · routing review · 22 September 2026
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
