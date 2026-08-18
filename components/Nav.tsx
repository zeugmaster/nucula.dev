const links = [
  { href: "#idea", label: "Idea" },
  { href: "#practice", label: "In practice" },
  { href: "#hardware", label: "Hardware" },
  { href: "#protocol", label: "Protocol" },
  { href: "#build", label: "Build one" },
];

export default function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-[rgba(10,11,9,0.75)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] backdrop-blur-md">
      {/* bleeds the header backdrop into the status-bar area on browsers
          that keep the layout viewport below it (iOS 26 with expanded UI) */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-full h-28 bg-[rgba(10,11,9,0.75)] backdrop-blur-md"
      />
      <nav className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-6">
        <a href="#top" className="font-mono text-sm tracking-wider text-ink">
          nucula<span className="cursor-blink text-copper">_</span>
        </a>
        <div className="flex items-center gap-7">
          <div className="mono-label hidden items-center gap-7 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-muted transition-colors hover:text-ink"
              >
                {l.label}
              </a>
            ))}
          </div>
          <a
            href="https://github.com/zeugmaster/nucula"
            target="_blank"
            rel="noreferrer"
            className="mono-label border border-line-strong px-3 py-1.5 text-ink transition-colors hover:border-copper hover:text-copper"
          >
            GitHub ↗
          </a>
        </div>
      </nav>
    </header>
  );
}
