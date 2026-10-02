type SceneProps = {
  id?: string;
  board?: string;
  theme?: "light" | "dark";
  section?: string;
  /** board preset on phones; most scenes hide the board there so it never sits behind text */
  compact?: string;
  className?: string;
  children: React.ReactNode;
};

/** One "slide" of the page. Stage picks up the data attributes while it's on screen. */
export function Scene({ id, board = "hidden", theme = "light", section = "", compact, className = "", children }: SceneProps) {
  return (
    <section
      id={id}
      data-scene
      data-board={board}
      data-board-compact={compact}
      data-theme={theme}
      data-section={section}
      className={`scene ${className}`}
    >
      <div className="wrap w-full">{children}</div>
    </section>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="kicker" data-a="fade">
      <span className="rule" data-a="grow" />
      {children}
    </p>
  );
}

export function Chapter({ num, title, lead }: { num: string; title: string; lead: string }) {
  return (
    <div className="chapter">
      <p className="num" data-a="scramble">
        {num}
      </p>
      <div className="gap-s" />
      <h2 className="h1" data-a="rise">
        {title}
      </h2>
      <div className="gap" />
      <p className="lead" data-a="rise">
        {lead}
      </p>
    </div>
  );
}

export function Spec({ rows, className = "" }: { rows: [string, React.ReactNode][]; className?: string }) {
  return (
    <dl className={`spec ${className}`}>
      {rows.map(([k, v]) => (
        <div key={k} data-a="rise">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Card({
  caps,
  title,
  children,
  hl = false,
}: {
  caps: string;
  title?: string;
  children: React.ReactNode;
  hl?: boolean;
}) {
  return (
    <div className={`card ${hl ? "hl" : ""}`} data-a="rise">
      <span className="caps">{caps}</span>
      {title && <h3 className="h3">{title}</h3>}
      <p>{children}</p>
    </div>
  );
}

type Bar = { name: string; before?: number; after: number; value: React.ReactNode };

export function Bars({ rows }: { rows: Bar[] }) {
  return (
    <div className="bars">
      {rows.map((r) => (
        <div key={r.name} className="bar-row" data-a="rise">
          <span>{r.name}</span>
          <span className="track">
            {r.before != null && <span className="b before" data-a="grow" style={{ width: `${r.before}%` }} />}
            <span
              className="b after"
              data-a="grow"
              data-delay={r.before != null ? 300 : undefined}
              style={{ width: `${r.after}%` }}
            />
          </span>
          <span className="v">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Text column that leaves the right side of the viewport to the 3D board (full width on phones). */
export function Beside({ w = 760, vw = 46, children }: { w?: number; vw?: number; children: React.ReactNode }) {
  return (
    <div className="beside" style={{ "--w": `${w}px`, "--vw": `${vw}vw` } as React.CSSProperties}>
      {children}
    </div>
  );
}
