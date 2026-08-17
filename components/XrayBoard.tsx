"use client";

import { useCallback, useRef } from "react";

export type BoardLayer = {
  id: string;
  src: string;
  opacity?: number;
  /** max pointer-parallax shift in px */
  depth?: number;
  visible?: boolean;
};

type Props = {
  layers: BoardLayer[];
  parallax?: boolean;
  scan?: boolean;
  glow?: boolean;
  className?: string;
  label?: string;
};

export default function XrayBoard({
  layers,
  parallax = false,
  scan = false,
  glow = false,
  className = "",
  label = "X-ray view of the nucula circuit board",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
    },
    []
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }, []);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      onPointerMove={parallax ? onPointerMove : undefined}
      onPointerLeave={parallax ? onPointerLeave : undefined}
      className={`relative ${className}`}
      style={{ aspectRatio: "624 / 1000" }}
    >
      {glow && (
        <div
          aria-hidden
          className="absolute -inset-14 opacity-80"
          style={{
            background:
              "radial-gradient(closest-side, rgba(217,142,74,0.13), transparent 72%)",
          }}
        />
      )}
      {layers.map((l) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={l.id}
          src={l.src}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none transition-[opacity,transform] duration-300 ease-out"
          style={{
            mixBlendMode: "screen",
            opacity: l.visible === false ? 0 : (l.opacity ?? 1),
            transform: `translate3d(calc(var(--px, 0) * ${l.depth ?? 0}px), calc(var(--py, 0) * ${l.depth ?? 0}px), 0)`,
          }}
        />
      ))}
      {scan && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="scanline" />
        </div>
      )}
    </div>
  );
}
