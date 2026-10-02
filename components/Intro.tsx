import { Beside, Kicker, Scene, Spec } from "./ui";

const steps = [
  ["a", "Pay a Lightning invoice", "Any Lightning wallet can top up a nucula. The mint takes the payment…"],
  ["b", "The mint issues tokens", "…and hands back blind-signed ecash. The mint can't tell who ends up holding it."],
  ["c", "Tokens live on the device", "Not in an account, not on a server. Whoever holds the device holds the money."],
  ["d", "Tap to pass them on", "Spending means handing tokens to someone else, over NFC or back out through Lightning."],
];

const tapSteps = [
  ["READ", "creqA…", "The phone reads a NUT-18 payment request from nucula."],
  ["WRITE", "cashuB…", "The phone writes the token back to nucula."],
  ["SWAP", "/v1/swap", "nucula swaps it at the mint, or verifies it offline and stashes it."],
];

export default function Intro() {
  return (
    <>
      <Scene id="top" board="hero" compact="hero" className="max-[899px]:justify-start">
        <Kicker>Embedded Cashu wallet</Kicker>
        <h1 className="h1 hero" data-a="rise">
          nucula
        </h1>
        <div className="gap" />
        <p className="lead max-w-[720px] min-[900px]:max-w-[min(720px,46vw)]" data-a="rise">
          Tap-to-pay ecash on a <b>$23</b> board.
          <br />
          ESP32-C3 · PN7160 NFC · open hardware.
        </p>
        <div className="gap" />
        <div className="flex flex-wrap gap-3" data-a="rise">
          <a className="btn solid" href="/setup">
            Set up your board →
          </a>
          <a className="btn" href="https://github.com/zeugmaster/nucula" target="_blank" rel="noreferrer">
            Firmware ↗
          </a>
          <a className="btn" href="https://github.com/zeugmaster/nucula-board" target="_blank" rel="noreferrer">
            Board files ↗
          </a>
        </div>
        <div className="gap-l" />
        <p className="caps" data-a="scramble">
          Open source · CERN-OHL-S-2.0 hardware
        </p>
      </Scene>

      <Scene id="nucula" board="heroSolid" section="01 · nucula">
        <Beside>
          <Kicker>What is it</Kicker>
          <h2 className="h2" data-a="rise">
            A Cashu wallet
            <br />
            <span className="dim">on a microcontroller.</span>
          </h2>
          <div className="gap" />
          <p className="lead" data-a="rise">
            Holds ecash from several mints. <b>Receives over NFC.</b> Mints and melts over Lightning. Keeps working
            offline and redeems later.
          </p>
          <div className="gap-l" />
          <Spec
            rows={[
              ["MCU", "ESP32-C3 · RISC-V"],
              ["Radio", "NXP PN7160 NFC · Wi-Fi"],
              ["Display", "2.4″ OLED · 128 × 64"],
              ["Input", "3 × 4 keypad (detachable)"],
              ["Power", "USB-C · single-cell Li-ion"],
            ]}
          />
        </Beside>
      </Scene>

      <Scene section="01 · nucula">
        <Kicker>The idea</Kicker>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <h2 className="h2" data-a="rise">
            Digital cash <span className="dim">that behaves like cash.</span>
          </h2>
          <div className="body flex flex-col gap-5" data-a="rise">
            <p>
              <b>Cashu</b> is an ecash protocol built on Bitcoin&apos;s Lightning Network. A mint issues tokens against
              Lightning payments using blind signatures, so it signs tokens it never sees. Whoever holds the tokens
              can spend them. There&apos;s no account and no balance on a server: the tokens are the money.
            </p>
            <p>
              nucula keeps those tokens on a small circuit board. Paying someone works like handing over coins. The
              tokens move from one device to the other, and that is the whole transaction.
            </p>
          </div>
        </div>
        <div className="gap-l" />
        <div className="grid-h grid sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([n, title, body], i) => (
            <div key={n} className="card" data-a="rise">
              <span className="caps flex justify-between">
                <span>{n}</span>
                <span aria-hidden>{i < steps.length - 1 ? "→" : "∎"}</span>
              </span>
              <h3 className="h3">{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </Scene>

      <Scene section="01 · nucula">
        <Kicker>Cashu over NFC</Kicker>
        <h2 className="h2" data-a="rise">
          Tap, and the token <span className="dim">moves.</span>
        </h2>
        <div className="gap-l" />
        <svg className="dia hidden md:block" viewBox="0 0 1680 420" role="img" aria-label="Phone reads a payment request from nucula, writes a token back, and nucula swaps it at the mint">
          <g data-a="draw">
            <rect className="fill" x="0" y="120" width="300" height="190" />
            <rect className="fill" x="690" y="120" width="300" height="190" />
            <rect className="fill" x="1380" y="120" width="300" height="190" />
          </g>
          <g data-a="fade">
            <text x="30" y="165" className="m">PHONE</text>
            <text x="30" y="215" style={{ fontSize: 30, fontFamily: "var(--font-sans)" }}>Cashu wallet</text>
            <text x="30" y="285" className="m">any NFC wallet</text>
            <text x="720" y="165" className="m">TERMINAL</text>
            <text x="720" y="215" style={{ fontSize: 30, fontFamily: "var(--font-sans)" }}>nucula</text>
            <text x="720" y="285" className="m">type-4 tag emulation</text>
            <text x="1410" y="165" className="m">MINT</text>
            <text x="1410" y="215" style={{ fontSize: 30, fontFamily: "var(--font-sans)" }}>Cashu mint</text>
            <text x="1410" y="285" className="m">HTTPS</text>
          </g>
          <g>
            <path className="stroke" d="M690 170 H310" data-a="draw" data-delay="400" />
            <path className="solid" d="M310 170 l14 -7 v14z" data-a="fade" data-delay="400" />
            <text x="340" y="150" data-a="fade" data-delay="400">① READ  creqA…  NUT-18</text>
          </g>
          <g>
            <path className="stroke" d="M300 260 H680" data-a="draw" data-delay="900" />
            <path className="solid" d="M680 260 l-14 -7 v14z" data-a="fade" data-delay="900" />
            <text x="340" y="290" data-a="fade" data-delay="900">② WRITE  cashuB…  token</text>
          </g>
          <g>
            <path className="stroke" d="M990 215 H1370" data-a="draw" data-delay="1400" />
            <path className="solid" d="M1370 215 l-14 -7 v14z" data-a="fade" data-delay="1400" />
            <text x="1020" y="195" data-a="fade" data-delay="1400">③ SWAP  /v1/swap</text>
            <text x="1020" y="250" className="m" data-a="fade" data-delay="1400">or verify offline + stash</text>
          </g>
        </svg>
        <ol className="list md:hidden">
          {tapSteps.map(([verb, data, body]) => (
            <li key={verb} data-a="rise">
              {verb} <span className="mono dim">{data}</span>
              <small>{body}</small>
            </li>
          ))}
        </ol>
        <div className="gap-l" />
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <p className="body max-w-[720px]" data-a="rise">
            <b>Numo</b> made Cashu tap-to-pay real on Android point-of-sale devices. nucula speaks{" "}
            <b>the same NDEF handshake</b>, so a wallet that can pay Numo can pay nucula.
          </p>
          <div className="tags lg:justify-end" data-a="fade">
            <span className="tag">NUT-18 payment request</span>
            <span className="tag">NDEF text record</span>
            <span className="tag">ISO-DEP · Type 4 Tag</span>
          </div>
        </div>
      </Scene>

      <Scene section="01 · nucula">
        <Kicker>Why dedicated hardware</Kicker>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-24">
          <h2 className="h2" data-a="rise">
            Why
            <br />
            <span className="dim">nucula?</span>
          </h2>
          <ol className="list big">
            <li data-a="rise">
              Cost<small>About $23 in parts per board, at prototype quantities.</small>
            </li>
            <li data-a="rise">
              Flexibility<small>Open hardware, open firmware: change anything.</small>
            </li>
            <li data-a="rise">
              Integration<small>Goes inside machines that already exist.</small>
            </li>
            <li data-a="rise">
              Extension<small>Adds tap-to-pay to a point of sale that has no NFC.</small>
            </li>
            <li data-a="rise">
              Robustness<small>A single-purpose device with no OS updates and no app store. It still receives offline.</small>
            </li>
          </ol>
        </div>
        <div className="gap-l" />
        <div className="gap-l" />
        <h3 className="h3" data-a="rise">
          Anything that takes <span className="dim">(or used to take)</span> coins.
        </h3>
        <div className="gap" />
        <div className="grid-h grid grid-cols-2 lg:grid-cols-4">
          <Machine title="Vending" body="Snacks, drinks, parts.">
            <rect className="stroke" x="18" y="6" width="84" height="108" />
            <rect className="stroke" x="28" y="16" width="44" height="60" />
            <path className="stroke" d="M28 36h44M28 56h44M50 16v60" />
            <rect className="stroke" x="80" y="20" width="14" height="22" />
            <path className="stroke" d="M84 50h6M84 58h6" />
            <rect className="stroke" x="28" y="88" width="64" height="14" />
          </Machine>
          <Machine title="Ticketing" body="Transit, events, parking.">
            <path className="stroke" d="M10 34h100v16a10 10 0 0 0 0 20v16H10V70a10 10 0 0 0 0-20z" />
            <path className="stroke dash" d="M80 36v48" />
            <path className="stroke" d="M24 52h40M24 62h28" />
          </Machine>
          <Machine title="Laundromat" body="Washers, dryers.">
            <rect className="stroke" x="16" y="6" width="88" height="108" />
            <path className="stroke" d="M16 28h88" />
            <circle className="stroke" cx="60" cy="70" r="28" />
            <circle className="stroke" cx="60" cy="70" r="18" />
            <circle className="stroke" cx="30" cy="17" r="4" />
            <path className="stroke" d="M76 17h18" />
          </Machine>
          <Machine title="Coin slots" body="Arcades, lockers, meters.">
            <rect className="stroke" x="22" y="6" width="76" height="108" />
            <rect className="stroke" x="52" y="24" width="16" height="36" />
            <path className="stroke" d="M60 30v24" />
            <circle className="stroke" cx="60" cy="86" r="12" />
            <path className="stroke" d="M56 86h8" />
          </Machine>
        </div>
      </Scene>
    </>
  );
}

function Machine({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col justify-between gap-8" data-a="rise">
      <svg className="dia !w-16 md:!w-24" viewBox="0 0 120 120" data-a="draw" aria-hidden>
        {children}
      </svg>
      <div>
        <h3 className="h3">{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}
