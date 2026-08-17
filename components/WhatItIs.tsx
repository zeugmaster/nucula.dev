import Section from "./Section";
import Reveal from "./Reveal";

const steps = [
  {
    n: "a",
    title: "Pay a Lightning invoice",
    body: "Any Lightning wallet can top up a Nucula. The mint takes the payment…",
  },
  {
    n: "b",
    title: "The mint issues tokens",
    body: "…and hands back blind-signed ecash tokens. The mint can't tell who ends up holding them.",
  },
  {
    n: "c",
    title: "Tokens live on the device",
    body: "Not in an account, not on a server. If you hold the device, you hold the money.",
  },
  {
    n: "d",
    title: "Tap to pass them on",
    body: "Spending is handing tokens to someone else — over NFC, or back out through Lightning.",
  },
];

export default function WhatItIs() {
  return (
    <Section id="idea" index="01" label="The idea">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-8">
        <Reveal>
          <h2 className="max-w-[16ch] text-3xl font-medium leading-tight tracking-tight md:text-5xl">
            Digital cash that behaves like cash.
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <div className="space-y-5 text-base leading-relaxed text-muted md:text-lg">
            <p>
              <span className="text-ink">Cashu</span> is an ecash protocol
              built on top of Bitcoin&apos;s Lightning Network. A mint issues
              tokens against Lightning payments, using blind signatures — so it
              signs them without ever seeing them. Whoever holds the tokens can
              spend them. There is no account and no balance sitting on a
              server; the tokens themselves are the money.
            </p>
            <p>
              Nucula keeps those tokens on a small circuit board you can carry
              around. Paying someone works like handing over coins: the tokens
              move from one device to the other, and that&apos;s the whole
              transaction.
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={150} className="mt-20">
        <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.n} className="relative bg-bg p-6">
              <div className="mono-label mb-4 flex items-center justify-between text-muted">
                <span className="text-copper">{s.n}</span>
                <span aria-hidden className="text-line-strong">
                  {i < steps.length - 1 ? "→" : "∎"}
                </span>
              </div>
              <h3 className="text-base font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
