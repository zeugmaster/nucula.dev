import XrayBoard from "./XrayBoard";

const heroLayers = [
  { id: "bcu", src: "/pcb/bcu.svg", opacity: 0.6, depth: 5 },
  { id: "fcu", src: "/pcb/fcu.svg", opacity: 1, depth: 10 },
  { id: "ffab", src: "/pcb/ffab.svg", opacity: 0.24, depth: 15 },
  { id: "fsilk", src: "/pcb/fsilk.svg", opacity: 0.9, depth: 19 },
  { id: "edge", src: "/pcb/edge.svg", opacity: 0.85, depth: 23 },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden">
      <div aria-hidden className="blueprint-grid absolute inset-0" />
      <div className="relative mx-auto grid max-w-[1120px] grid-cols-1 gap-16 px-6 pb-20 pt-36 md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:pb-28 md:pt-44">
        <div className="flex flex-col justify-center">
          <p className="mono-label mb-6 flex flex-wrap gap-x-3 gap-y-1 text-muted">
            <span>Open hardware</span>
            <span className="hidden text-copper sm:inline">·</span>
            <span>Cashu ecash</span>
            <span className="hidden text-copper sm:inline">·</span>
            <span>Lightning</span>
          </p>
          <h1 className="max-w-[13ch] text-5xl font-medium leading-[1.04] tracking-tight md:text-7xl">
            Freedom to transact<span className="text-copper">.</span>
          </h1>
          <p className="mt-8 max-w-[46ch] text-lg leading-relaxed text-muted">
            Nucula is a small, open-source hardware wallet for Cashu ecash. It
            runs on an ESP32, receives payments with an NFC tap, and doesn&apos;t
            mind being offline.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <a
              href="https://github.com/zeugmaster/nucula"
              target="_blank"
              rel="noreferrer"
              className="mono-label border border-copper bg-copper/10 px-5 py-3 text-copper-bright transition-colors hover:bg-copper hover:text-bg"
            >
              Source on GitHub ↗
            </a>
            <a
              href="#idea"
              className="mono-label border border-line-strong px-5 py-3 text-muted transition-colors hover:border-ink hover:text-ink"
            >
              How it works ↓
            </a>
          </div>
          <div className="mono-label mt-16 flex flex-wrap gap-x-6 gap-y-2 text-muted/80">
            <span>XIAO ESP32-C6</span>
            <span className="text-line-strong">/</span>
            <span>PN7160 NFC</span>
            <span className="text-line-strong">/</span>
            <span>128×64 OLED</span>
            <span className="text-line-strong">/</span>
            <span>3×4 keypad</span>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="board-float w-full max-w-[340px] rotate-[3deg] md:max-w-[380px]">
            <XrayBoard layers={heroLayers} parallax scan glow />
          </div>
          <p className="mono-label absolute -bottom-6 right-0 hidden text-muted/60 md:block">
            nucula board v0.1 · rev 01 · x-ray composite
          </p>
        </div>
      </div>
    </section>
  );
}
