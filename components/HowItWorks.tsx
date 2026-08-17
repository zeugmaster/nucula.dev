import Section from "./Section";
import Reveal from "./Reveal";

const features = [
  {
    tag: "NFC",
    title: "Receive with a tap",
    body: "Nucula asks for a payment and emits the request over NFC — the PN7160 makes the board show up like a contactless card. The payer taps with any Cashu wallet on a phone, and the tokens land on the device.",
    art: (
      <svg viewBox="0 0 120 56" className="h-14 w-full" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="8" y="10" width="26" height="38" rx="3" />
          <rect x="86" y="10" width="26" height="38" rx="3" />
          <path d="M52 18a14 14 0 0 1 0 20" opacity="0.35" />
          <path d="M58 14a20 20 0 0 1 0 28" opacity="0.6" />
          <path d="M64 10a26 26 0 0 1 0 36" />
        </g>
      </svg>
    ),
  },
  {
    tag: "OFFLINE",
    title: "Doesn't need to be online",
    body: "Tokens received while offline are stashed on the device and redeemed automatically the next time WiFi comes back. No connection, no problem — the payment already happened.",
    art: (
      <svg viewBox="0 0 120 56" className="h-14 w-full" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M10 44h100" opacity="0.35" strokeDasharray="2 4" />
          <path d="M10 44 L44 44 L52 20 L62 44 L110 44" />
          <circle cx="52" cy="20" r="2.4" fill="currentColor" stroke="none" />
          <path d="M84 22v10M84 36v.5" strokeLinecap="round" opacity="0.6" />
        </g>
      </svg>
    ),
  },
  {
    tag: "LIGHTNING",
    title: "Lightning in and out",
    body: "Top the wallet up by paying a Lightning invoice — the mint issues fresh tokens for it. Spend back out by melting tokens to settle any invoice. Nucula speaks BOLT11 both directions.",
    art: (
      <svg viewBox="0 0 120 56" className="h-14 w-full" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M62 6 L46 30 L58 30 L50 50 L74 24 L61 24 L70 6 Z" />
          <path d="M10 28h24" opacity="0.4" strokeDasharray="3 4" />
          <path d="M86 28h24" opacity="0.4" strokeDasharray="3 4" />
        </g>
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <Section id="practice" index="02" label="In practice">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.tag} delay={i * 110}>
            <article className="group relative h-full border border-line bg-panel/60 p-7 transition-colors hover:border-line-strong">
              <div className="mono-label mb-8 flex items-center justify-between text-muted">
                <span>{f.tag}</span>
                <span className="text-copper/70">0{i + 1}</span>
              </div>
              <div className="mb-6 text-copper/80 transition-colors group-hover:text-copper-bright">
                {f.art}
              </div>
              <h3 className="text-lg font-medium">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
