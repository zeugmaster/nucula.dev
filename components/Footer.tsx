export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line">
      <div className="mx-auto max-w-[1120px] px-6 pb-10 pt-16">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-sm text-ink">
              nucula<span className="text-copper">_</span>
            </p>
            <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-muted">
              An open ecash wallet — firmware, board and this page. The back of
              the circuit board reads{" "}
              <span className="text-ink">&ldquo;Freedom to transact.&rdquo;</span>{" "}
              That&apos;s the whole idea.
            </p>
          </div>
          <nav className="mono-label flex flex-wrap gap-x-8 gap-y-3 text-muted">
            <a
              href="https://github.com/zeugmaster/nucula"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              GitHub ↗
            </a>
            <a
              href="https://cashu.space"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              Cashu ↗
            </a>
            <a
              href="https://github.com/cashubtc/nuts"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              NUT specs ↗
            </a>
          </nav>
        </div>
      </div>
      <div
        aria-hidden
        className="watermark select-none whitespace-nowrap text-center font-medium leading-[0.78] tracking-tight"
        style={{ fontSize: "clamp(120px, 19vw, 300px)" }}
      >
        nucula
      </div>
    </footer>
  );
}
