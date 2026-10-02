// Entrance animations from the talk deck, triggered by scrolling instead of slide changes.
// Markup: data-a="rise | fade | scramble | count | draw | grow | pop", optional data-delay (ms),
// data-to + data-decimals for count.

const EASE_OUT = "cubic-bezier(.16,1,.3,1)";
const EASE_IN_OUT = "cubic-bezier(.7,0,.2,1)";
const GLYPHS = "▯▮░▒▓/\\|-_=+<>01";

export function scramble(el: HTMLElement, duration = 700) {
  const target = el.dataset.text ?? (el.dataset.text = el.textContent ?? "");
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const n = Math.floor(target.length * t);
    let out = target.slice(0, n);
    for (let i = n; i < target.length; i++) {
      out += target[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (t < 1 && el.isConnected && el.dataset.text === target) requestAnimationFrame(frame);
    else if (el.dataset.text === target) el.textContent = target;
  };
  requestAnimationFrame(frame);
}

function countUp(el: HTMLElement, duration = 1400) {
  const to = parseFloat(el.dataset.to ?? (el.textContent ?? "").replace(/[^\d.]/g, ""));
  const dec = +(el.dataset.decimals ?? 0);
  const fmt = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = fmt(to * (1 - Math.pow(1 - t, 4)));
    if (t < 1) requestAnimationFrame(frame);
  };
  el.textContent = fmt(0);
  requestAnimationFrame(frame);
}

export function animateIn(el: HTMLElement, delay: number) {
  const kind = el.dataset.a ?? "rise";
  delay += +(el.dataset.delay ?? 0);
  el.classList.add("shown");
  const opts: KeyframeAnimationOptions = { delay, fill: "both", easing: EASE_OUT };
  switch (kind) {
    case "fade":
      el.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 900 });
      return;
    case "pop":
      el.animate([{ opacity: 0, transform: "scale(.94)" }, { opacity: 1, transform: "none" }], { ...opts, duration: 900 });
      return;
    case "grow":
      el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { ...opts, duration: 1200 });
      return;
    case "scramble":
      el.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 200 });
      setTimeout(() => scramble(el), delay);
      return;
    case "count":
      el.animate([{ opacity: 0 }, { opacity: 1 }], { ...opts, duration: 300 });
      setTimeout(() => countUp(el), delay);
      return;
    case "draw": {
      const sel = "path,line,polyline,polygon,rect,circle,ellipse";
      const shapes = el.matches(sel) ? [el] : [...el.querySelectorAll<SVGElement>(sel)];
      shapes.forEach((s, i) => {
        s.setAttribute("pathLength", "1");
        s.style.strokeDasharray = "1";
        s.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          delay: delay + i * 40,
          duration: 1400,
          easing: EASE_IN_OUT,
          fill: "both",
        });
      });
      return;
    }
    default: // rise
      el.animate(
        [
          { opacity: 0, transform: "translateY(0.5em)" },
          { opacity: 1, transform: "none" },
        ],
        { ...opts, duration: 1000 },
      );
  }
}

/** Reveal [data-a] elements as they scroll into view, staggered in DOM order per batch. */
export function observeEntrances(root: ParentNode) {
  const io = new IntersectionObserver(
    (entries) => {
      const hits = entries
        .filter((e) => e.isIntersecting)
        .map((e) => e.target as HTMLElement)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      hits.forEach((el, i) => {
        io.unobserve(el);
        animateIn(el, 120 + i * 70);
      });
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  root.querySelectorAll<HTMLElement>("[data-a]").forEach((el) => io.observe(el));
  return () => io.disconnect();
}
