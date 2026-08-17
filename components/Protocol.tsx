import Section from "./Section";
import Reveal from "./Reveal";

const nuts = [
  { n: "00", name: "Notation & blind signatures" },
  { n: "02", name: "Keysets & fees" },
  { n: "03", name: "Swapping tokens" },
  { n: "04", name: "Minting" },
  { n: "05", name: "Melting" },
  { n: "10", name: "Spending conditions" },
  { n: "11", name: "Pay-to-pubkey" },
  { n: "12", name: "DLEQ proofs" },
  { n: "13", name: "Deterministic secrets" },
  { n: "18", name: "Payment requests" },
  { n: "23", name: "BOLT11 payments" },
];

export default function Protocol() {
  return (
    <Section id="protocol" index="04" label="Protocol">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-10">
        <Reveal>
          <h2 className="max-w-[14ch] text-3xl font-medium leading-tight tracking-tight md:text-5xl">
            Speaks standard Cashu.
          </h2>
          <p className="mt-6 max-w-[44ch] text-base leading-relaxed text-muted md:text-lg">
            Under the hood, Nucula implements the Cashu{" "}
            <a
              href="https://github.com/cashubtc/nuts"
              target="_blank"
              rel="noreferrer"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-copper"
            >
              NUTs
            </a>{" "}
            — the shared specifications that keep mints and wallets
            compatible. Any wallet that talks Cashu can pay a Nucula, and a
            Nucula can pay it right back.
          </p>
          <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-muted md:text-lg">
            Wallet secrets are derived from a BIP-39 seed, so the ecash is
            recoverable from a plain twelve-word backup.
          </p>
        </Reveal>
        <Reveal delay={130}>
          <ul className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3">
            {nuts.map((nut) => (
              <li
                key={nut.n}
                className="group bg-bg p-4 transition-colors hover:bg-panel"
              >
                <div className="mono-label text-copper/80 transition-colors group-hover:text-copper-bright">
                  NUT-{nut.n}
                </div>
                <div className="mt-1.5 text-sm text-muted transition-colors group-hover:text-ink">
                  {nut.name}
                </div>
              </li>
            ))}
            <li className="bg-bg p-4">
              <div className="mono-label text-muted/40">···</div>
              <div className="mt-1.5 text-sm text-muted/40">more to come</div>
            </li>
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
