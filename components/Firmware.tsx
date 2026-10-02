import { Stat } from "./Hardware";
import { Bars, Card, Chapter, Kicker, Scene } from "./ui";

const S = "03 · Firmware";

const layers: [string, string[]][] = [
  ["App", ["console", "UI · display · keypad", "NFC payment task", "offline drain"]],
  ["Cashu", ["wallet · mint / melt / swap", "keysets · NUT-02", "tokens · JSON · CBOR V4", "NUT-10 / P2PK"]],
  ["Crypto", ["secp256k1 · BDHKE · DLEQ", "blst · BLS12-381", "BIP-39 · NUT-13", "HW SHA · RSA / MPI"]],
  ["Drivers", ["PN7160 · NCI", "SSD1309 · PCF8574", "Wi-Fi · HTTPS keep-alive", "NVS wallet store"]],
];

const flow = [
  ["nucula", "Build a NUT-18 request (P2PK-locked if offline) and pre-warm TLS to the mint."],
  ["READ BINARY", "The phone reads creqA… from nucula."],
  ["UPDATE BINARY", "The phone writes cashuB… back."],
  ["POST /v1/swap", "nucula swaps the proofs and verifies the mint's DLEQ."],
  ["Received ✓", "The display confirms the payment."],
];

export default function Firmware() {
  return (
    <>
      <Scene id="firmware" board="farX" compact="farX" theme="dark" section={S}>
        <Chapter num="03 / 03" title="Firmware" lead="400 KB of RAM, one core and a lot of elliptic curves." />
      </Scene>

      <Scene section={S}>
        <Kicker>Build environment</Kicker>
        <h2 className="h2" data-a="rise">
          C, C++ <span className="dim">&amp; ESP-IDF.</span>
        </h2>
        <div className="gap" />
        <div className="tags" data-a="fade">
          <span className="tag solid">ESP-IDF 5.5.1</span>
          <span className="tag">FreeRTOS</span>
          <span className="tag">GCC 14.2</span>
          <span className="tag">CMake</span>
          <span className="tag">secp256k1</span>
          <span className="tag">blst</span>
          <span className="tag">cJSON · CBOR</span>
        </div>
        <div className="gap-l" />
        <div className="stats">
          <Stat to={19862} label="lines in main/" />
          <Stat to={1.52} decimals={2} unit="MB" label="firmware image · 80% of app partition" />
          <Stat to={11} label="Cashu NUTs" />
        </div>
        <div className="gap" />
        <div data-a="rise">
          <div className="flex h-3.5 gap-0.5">
            <i style={{ flex: 7399, background: "var(--ink)" }} />
            <i style={{ flex: 7550, background: "var(--mute)" }} />
            <i style={{ flex: 4913, background: "var(--faint)" }} />
          </div>
          <div className="legend mt-3.5">
            <span><i style={{ background: "var(--ink)" }} />C · crypto, drivers</span>
            <span><i style={{ background: "var(--mute)" }} />C++ · wallet, protocol, UI</span>
            <span><i style={{ background: "var(--faint)" }} />headers</span>
          </div>
        </div>
      </Scene>

      <Scene section={S}>
        <Kicker>Component map</Kicker>
        <h2 className="h2" data-a="rise">
          What runs <span className="dim">where.</span>
        </h2>
        <div className="gap-l" />
        <div className="grid gap-x-7 gap-y-3.5 font-mono md:grid-cols-[minmax(120px,240px)_1fr]">
          {layers.map(([name, cells]) => (
            <Layer key={name} name={name}>
              <div className="grid-h grid grid-cols-2 lg:grid-cols-4" data-a="rise">
                {cells.map((c) => (
                  <div key={c}>{c}</div>
                ))}
              </div>
            </Layer>
          ))}
          <Layer name="Platform">
            <div className="grid-h grid" data-a="rise">
              <div className="bg-ink text-bg">ESP-IDF · FreeRTOS · ESP32-C3</div>
            </div>
          </Layer>
        </div>
      </Scene>

      <Scene section={S}>
        <Kicker>Features</Kicker>
        <h2 className="h2" data-a="rise">
          What can it do?
        </h2>
        <div className="gap-l" />
        <div className="grid-h grid sm:grid-cols-2 lg:grid-cols-4">
          <Card caps="NUT-18" title="Tap to receive">A payment request over NFC. The phone writes the token back.</Card>
          <Card caps="NUT-04 · 23" title="Mint">Fund the wallet with a Lightning invoice.</Card>
          <Card caps="NUT-05" title="Melt">Pay Lightning invoices from ecash.</Card>
          <Card caps="Multi-mint" title="3 mints">Up to 10 cached keysets each.</Card>
          <Card caps="NUT-10 / 11" title="Offline receive" hl>
            P2PK-locked, verified at tap time, stashed and redeemed when Wi-Fi returns.
          </Card>
          <Card caps="NUT-12" title="DLEQ">Proofs are verified, not trusted.</Card>
          <Card caps="NUT-13" title="Seed backup">BIP-39 from hardware entropy. Recover from twelve words.</Card>
          <Card caps="stickup" title="Drain all">Every balance out as V4 tokens.</Card>
        </div>
        <div className="gap" />
        <p className="caps" data-a="fade">
          Speaks standard Cashu: any wallet that follows the{" "}
          <a href="https://github.com/cashubtc/nuts" target="_blank" rel="noreferrer" className="text-ink underline underline-offset-4">
            NUTs
          </a>{" "}
          can pay a nucula
        </p>
      </Scene>

      <Scene section={S}>
        <Kicker>One tap, step by step</Kicker>
        <h2 className="h2" data-a="rise">
          Tap-to-pay <span className="dim">flow.</span>
        </h2>
        <div className="gap-l" />
        <svg className="dia hidden md:block" viewBox="0 0 1680 560" role="img" aria-label="Sequence: nucula builds a request and pre-warms TLS, the phone reads the request and writes a token, nucula swaps it at the mint and shows received">
          <defs>
            <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
              <path d="M0 1 L9 5 L0 9z" fill="currentColor" />
            </marker>
          </defs>
          <g data-a="fade">
            <text x="0" y="24" className="m">PHONE</text>
            <text x="740" y="24" className="m">NUCULA</text>
            <text x="1480" y="24" className="m">MINT</text>
          </g>
          <g data-a="draw">
            <path className="hair" d="M40 44 V540 M780 44 V540 M1520 44 V540" />
          </g>
          <g>
            <rect className="solid" x="772" y="70" width="16" height="16" data-a="pop" data-delay="300" />
            <text x="810" y="84" data-a="fade" data-delay="300">build NUT-18 request · P2PK lock if offline</text>
            <path className="stroke dash" d="M780 130 H1510" data-a="draw" data-delay="500" />
            <text x="810" y="120" className="m" data-a="fade" data-delay="500">prewarm TLS</text>
          </g>
          <g>
            <path className="stroke" d="M780 200 H50" markerEnd="url(#ah)" data-a="draw" data-delay="900" />
            <text x="100" y="190" data-a="fade" data-delay="900">READ BINARY → creqA…</text>
          </g>
          <g>
            <path className="stroke" d="M40 280 H770" markerEnd="url(#ah)" data-a="draw" data-delay="1300" />
            <text x="100" y="270" data-a="fade" data-delay="1300">UPDATE BINARY ← cashuB…</text>
          </g>
          <g>
            <path className="stroke" d="M780 360 H1510" markerEnd="url(#ah)" data-a="draw" data-delay="1700" />
            <text x="810" y="350" data-a="fade" data-delay="1700">POST /v1/swap</text>
            <path className="stroke" d="M1520 430 H790" markerEnd="url(#ah)" data-a="draw" data-delay="2000" />
            <text x="810" y="420" data-a="fade" data-delay="2000">signatures ✓ DLEQ</text>
          </g>
          <g>
            <rect className="solid" x="772" y="490" width="16" height="16" data-a="pop" data-delay="2400" />
            <text x="810" y="504" data-a="fade" data-delay="2400">display: received ✓</text>
          </g>
        </svg>
        <ol className="list md:hidden">
          {flow.map(([t, b]) => (
            <li key={t} data-a="rise">
              <span className="mono">{t}</span>
              <small>{b}</small>
            </li>
          ))}
        </ol>
      </Scene>

      <Scene section={S}>
        <Kicker>Working around the hardware</Kicker>
        <h2 className="h2" data-a="rise">
          Small, slow, <span className="dim">and full.</span>
        </h2>
        <div className="gap-l" />
        <div className="grid-h grid lg:grid-cols-3">
          <Limit caps="RAM" to={61} unit="KB" label="free heap · largest block 26 KB">
            mbedTLS dynamic buffers. One <span className="mono">/v1/keys</span> request instead of N. Bounded crypto
            scratch: a 10 KB stack frame became 3 KB.
          </Limit>
          <Limit caps="CPU" pre="~" to={500} unit="×" label="slower than a laptop (M2 Max)">
            One core at 160 MHz. The accelerators (SHA, RSA/MPI) are the only parallelism, so we use them.
          </Limit>
          <Limit caps="Storage" to={152} unit="KB" label="NVS for proofs, keysets, seed">
            The 4 MB flash holds a 1.52 MB image in a 1.81 MB slot. SoftAP and IPv6 were cut to save about 50 KB.
          </Limit>
        </div>
      </Scene>

      <Scene section={S}>
        <Kicker>Crypto · secp256k1</Kicker>
        <h2 className="h2" data-a="rise">
          Every µs <span className="dim">counts.</span>
        </h2>
        <div className="gap" />
        <div className="legend" data-a="fade">
          <span><i style={{ background: "var(--faint)" }} />original</span>
          <span><i style={{ background: "var(--ink)" }} />optimised</span>
        </div>
        <div className="gap-s" />
        <Bars
          rows={[
            { name: "hash_to_curve", before: 6.07, after: 2.35, value: <>3.46 → <b>1.34 ms</b></> },
            { name: "blind_message", before: 35.5, after: 18.4, value: <>20.2 → <b>10.5 ms</b></> },
            { name: "verify_dleq", before: 100, after: 37.4, value: <>56.9 → <b>21.3 ms</b></> },
          ]}
        />
        <div className="gap-l" />
        <div className="grid-h grid sm:grid-cols-2 lg:grid-cols-4">
          <Card caps="SHA-256">Hardware compression hooked into libsecp256k1.</Card>
          <Card caps="Tables">A 2 KB signing comb beat the 22 KB and 86 KB tables.</Card>
          <Card caps="DLEQ">Joint scalar multiplication.</Card>
          <Card caps="Compiler">
            <span className="mono">-Os</span> beats <span className="mono">-O3</span> because of icache.
          </Card>
        </div>
      </Scene>

      <Scene theme="dark" section={S}>
        <Kicker>Crypto · BLS12-381</Kicker>
        <h2 className="h2" data-a="rise">
          BLS <span className="dim">on a $3 chip.</span>
        </h2>
        <div className="gap" />
        <div className="grid gap-12 lg:grid-cols-[minmax(0,700px)_1fr] lg:gap-24">
          <div>
            <p className="lead" data-a="rise">
              Cashu v3 keysets use BLS signatures. A token checks out with one pairing:
            </p>
            <div className="gap-s" />
            <p className="mono text-[clamp(24px,2.1vw,40px)]" data-a="scramble">
              e(C, G₂) = e(Y, K)
            </p>
            <div className="gap-s" />
            <p className="lead" data-a="rise">
              <b>Fully offline. No DLEQ needed.</b>
            </p>
            <div className="gap" />
            <p className="body" data-a="rise">
              The trick: 384-bit Montgomery multiplication runs on the <b>RSA accelerator</b>. The CPU does Fp2
              additions <b>while</b> the engine multiplies.
            </p>
          </div>
          <div>
            <div className="legend" data-a="fade">
              <span><i style={{ background: "var(--faint)" }} />portable C</span>
              <span><i style={{ background: "var(--ink)" }} />RSA / MPI peripheral</span>
            </div>
            <div className="gap-s" />
            <Bars
              rows={[
                { name: "hash_to_G1", before: 5.6, after: 1.2, value: <b>4.6×</b> },
                { name: "G1 scalar mul", before: 7, after: 1.7, value: <b>4.1×</b> },
                { name: "unblind", before: 12.4, after: 3, value: <b>4.1×</b> },
                { name: "pairing verify", before: 29.4, after: 8.4, value: <>1286 → <b>368 ms</b></> },
                { name: "batch · 10", before: 100, after: 25.4, value: <>4.37 → <b>1.11 s</b></> },
              ]}
            />
          </div>
        </div>
        <div className="gap-l" />
        <div className="stats">
          <Stat pre="~" to={1.08} decimals={2} unit="s" label="10 new proofs, known mint" />
          <Stat to={1.97} decimals={2} unit="×" label="BLS verify · warm caches" />
          <Stat to={4410} label="differential test cases vs host" />
        </div>
      </Scene>

      <Scene theme="dark" section={S}>
        <Kicker>52 builds later</Kicker>
        <h2 className="h2" data-a="rise">
          End to end.
        </h2>
        <div className="gap-l" />
        <div>
          <table className="tbl !text-[clamp(13px,1.35vw,26px)]">
            <tbody>
              <tr data-a="rise">
                <th>Operation</th>
                <th className="max-sm:hidden">before</th>
                <th>after</th>
                <th>speed-up</th>
              </tr>
              {[
                ["10-proof swap · crypto", "4,578 ms", "2,520 ms", "1.82×"],
                ["BLS verify · 10 proofs / 10 keys", "1,886 ms", "960 ms", "1.97×"],
                ["secp DLEQ verify · NUT-12", "56.95 ms", "21.30 ms", "2.67×"],
                ["Nutroot 8-of-15 threshold", "1,734 ms", "138 ms", "12.56×"],
              ].map(([op, a, b, x]) => (
                <tr key={op} data-a="rise">
                  <td>{op}</td>
                  <td className="was max-sm:hidden">{a}</td>
                  <td>{b}</td>
                  <td className="x">{x}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="gap-s" />
        <p className="caps" data-a="fade">
          On-device, 160 MHz, crypto only. Rejected: whole-program LTO (2× slower), hardware inversion, hand-written
          asm.
        </p>
      </Scene>
    </>
  );
}

function Layer({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <>
      <span className="caps self-center pt-3 md:pt-0" data-a="fade">
        {name}
      </span>
      <div className="[&_.grid-h>div]:text-[clamp(13px,1.1vw,21px)]">{children}</div>
    </>
  );
}

function Limit({
  caps,
  pre,
  to,
  unit,
  label,
  children,
}: {
  caps: string;
  pre?: string;
  to: number;
  unit: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card" data-a="rise">
      <span className="caps">{caps}</span>
      <Stat pre={pre} to={to} unit={unit} label={label} />
      <div className="gap-s" />
      <p>{children}</p>
    </div>
  );
}
