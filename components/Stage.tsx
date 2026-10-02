"use client";

import { useEffect, useRef } from "react";
import { observeEntrances, scramble } from "@/lib/motion";

const links = [
  { href: "#nucula", label: "nucula" },
  { href: "#hardware", label: "Hardware" },
  { href: "#firmware", label: "Firmware" },
  { href: "#build", label: "Build" },
];

/**
 * The page's "deck" layer: a fixed 3D board behind the content, the header chrome,
 * and the scroll logic. Every <section data-scene> may set data-board (a preset from
 * lib/board/states.js), data-theme and data-section; the scene under the middle of
 * the viewport drives all three, like the current slide in the talk.
 */
export default function Stage() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const ticks = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const scenes = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
    const root = document.documentElement;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = matchMedia("(max-width: 899px)");
    const stopEntrances = still.matches ? () => {} : observeEntrances(document);

    if (ticks.current) ticks.current.innerHTML = scenes.map(() => "<i></i>").join("");

    let board: import("@/lib/board/board.js").Board | null = null;
    let raf = 0;
    let active = -1;
    let alive = true;

    const boardFor = (i: number) =>
      (narrow.matches ? scenes[i]?.dataset.boardCompact : scenes[i]?.dataset.board) ?? "hidden";

    const activate = (i: number, instant = false) => {
      if (i === active) return;
      active = i;
      const scene = scenes[i];
      const theme = scene.dataset.theme ?? "light";
      root.dataset.theme = theme;
      board?.setTheme(theme, instant);
      board?.set(boardFor(i), { instant });

      const name = scene.dataset.section ?? "";
      const label = section.current;
      if (label && label.dataset.text !== name) {
        label.dataset.text = name;
        label.textContent = name;
        if (!still.matches) scramble(label, 500);
      }
      if (count.current) {
        count.current.textContent = `${String(i + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}`;
      }
      ticks.current?.querySelectorAll("i").forEach((t, k) => t.classList.toggle("on", k <= i));
    };

    const pick = () => {
      const mid = innerHeight * 0.55;
      let i = 0;
      scenes.forEach((s, k) => {
        if (s.getBoundingClientRect().top <= mid) i = k;
      });
      return i;
    };

    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        activate(pick());
      });
    };
    activate(pick(), true);
    addEventListener("scroll", onScroll, { passive: true });

    // three.js and the models are heavy; load them after first paint.
    import("@/lib/board/board.js").then(({ Board }) => {
      if (!alive || !canvas.current || !labels.current) return;
      board = new Board(canvas.current, labels.current, { compact: narrow.matches, still: still.matches });
      board.setTheme(root.dataset.theme ?? "light", true);
      const loop = (now: number) => {
        board?.tick(now);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      board.ready.then(() => {
        if (!alive || !board) return;
        board.resize();
        board.set(boardFor(active), { duration: 2200 });
      });
    });

    const onResize = () => {
      board?.resize();
      if (board && board.compact !== narrow.matches) {
        board.setCompact(narrow.matches);
        board.set(boardFor(active));
      }
    };
    addEventListener("resize", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onResize);
      stopEntrances();
      board?.dispose();
    };
  }, []);

  return (
    <>
      <canvas id="board" ref={canvas} aria-hidden />
      <div className="labels" ref={labels} aria-hidden />
      <span aria-hidden className="crop tl hidden md:block" />
      <span aria-hidden className="crop tr hidden md:block" />
      <span aria-hidden className="crop bl hidden md:block" />
      <span aria-hidden className="crop br hidden md:block" />

      {/* Safari 26 tints the status-bar strip by sampling this element's
          background-color and backdrop-filter, so both stay on the header itself. */}
      <header className="topbar fixed inset-x-0 top-0 z-50 border-b border-hair pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]">
        <nav className="wrap flex h-14 items-center justify-between gap-6">
          <a href="#top" className="chrome-label flex items-center gap-3 font-medium !text-ink">
            <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <rect x="1" y="1" width="16" height="16" />
              <rect x="5" y="5" width="8" height="8" />
              <path d="M9 1v4M9 13v4M1 9h4M13 9h4" />
            </svg>
            nucula
            <span
              ref={section}
              className="hidden font-normal text-mute empty:!hidden before:mr-3 before:text-faint before:content-['/'] md:inline"
            />
          </a>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-6 xl:flex">
              {links.map((l) => (
                <a key={l.href} href={l.href} className="chrome-label transition-colors hover:!text-ink">
                  {l.label}
                </a>
              ))}
            </div>
            <span ref={ticks} className="ticks hidden lg:flex" aria-hidden />
            <span ref={count} className="chrome-label hidden tabular-nums sm:block" aria-hidden />
            <a
              href="/setup"
              className="chrome-label whitespace-nowrap border border-hair px-3 py-1.5 !text-ink transition-colors hover:border-ink"
            >
              Set up →
            </a>
          </div>
        </nav>
      </header>
    </>
  );
}
