import { Bars, Beside, Chapter, Kicker, Scene, Spec } from "./ui";

const S = "02 · Hardware";

export default function Hardware() {
  return (
    <>
      <Scene id="hardware" board="xray" compact="xray" theme="dark" section={S}>
        <Chapter num="02 / 03" title="Hardware" lead="Four layers, 128 parts, one I²C bus." />
      </Scene>

      <Scene board="top" section={S}>
        <Beside w={640}>
          <Kicker>nucula-board · rev 2</Kicker>
          <h2 className="h2" data-a="rise">
            One board.
          </h2>
          <div className="gap" />
          <p className="lead" data-a="rise">
            Everything on the top side. The keypad section snaps off.
          </p>
          <div className="gap-l" />
          <Spec
            rows={[
              ["Outline", "60 × 110 mm"],
              ["Keypad section", "60 × 35 mm · breakaway"],
              ["Layers", "4 · FR-4 · 1.6 mm · ENIG"],
              ["Parts", "128 · 55 unique · top side only"],
              ["License", "CERN-OHL-S-2.0"],
            ]}
          />
        </Beside>
      </Scene>

      <Scene board="esp" section={S}>
        <Beside w={700}>
          <Kicker>At the heart</Kicker>
          <h2 className="h2" data-a="rise">
            ESP32-C3
          </h2>
          <div className="gap" />
          <p className="lead" data-a="rise">
            A modern RISC-V microcontroller with Wi-Fi and Bluetooth LE on the die. Lean, and cheap.
          </p>
          <div className="gap-l" />
          <Spec
            rows={[
              ["Core", "RV32IMC · single core · 160 MHz"],
              ["Memory", "400 KB SRAM · 4 MB flash"],
              ["Radio", "Wi-Fi 4 · Bluetooth 5 LE"],
              ["Accelerators", "SHA · AES · RSA / MPI"],
              ["Module", "WROOM-02-N4 · $3.32"],
            ]}
          />
        </Beside>
      </Scene>

      <Scene board="nfc" section={S}>
        <Beside w={700}>
          <Kicker>NFC</Kicker>
          <h2 className="h2" data-a="rise">
            NXP PN7160
          </h2>
          <div className="gap" />
          <p className="lead" data-a="rise">
            NFC controller with an integrated RF front end. It speaks <b>NCI 2.0</b> over I²C and emulates a card.
          </p>
          <div className="gap-l" />
          <Spec
            rows={[
              ["Interface", "I²C 0x28 · IRQ · VEN"],
              ["Mode", "Card emulation · ISO-DEP"],
              ["Antenna", "PCB coil · 40 × 40 mm · 4 turns"],
              ["Inductance", "≈ 1.56 µH"],
              ["Matching", "→ 20 Ω @ 13.56 MHz"],
            ]}
          />
        </Beside>
      </Scene>

      <Scene board="power" section={S}>
        <Beside w={760}>
          <Kicker>Charging &amp; power</Kicker>
          <h2 className="h2" data-a="rise">
            Power path.
          </h2>
          <div className="gap-l" />
          <svg className="dia hidden md:block" viewBox="0 0 900 400" role="img" aria-label="USB-C and Li-ion battery feed a power selector, then an SY8089 buck converter to 3.3 V; a TP4054 charges the battery from USB">
            <g data-a="draw">
              <rect className="fill" x="0" y="0" width="210" height="80" />
              <rect className="fill" x="0" y="160" width="210" height="80" />
              <rect className="fill" x="0" y="320" width="210" height="80" />
              <rect className="fill" x="300" y="160" width="210" height="80" />
              <rect className="fill" x="600" y="160" width="210" height="80" />
              <path className="stroke" d="M105 80 V160 M105 240 V320" />
              <path className="stroke" d="M210 40 H405 V160" />
              <path className="stroke" d="M210 360 H405 V240" />
              <path className="stroke" d="M510 200 H600" />
              <path className="stroke" d="M810 200 H900" />
            </g>
            <g data-a="fade">
              <text x="20" y="32" className="m">USB-C</text>
              <text x="20" y="60">5 V in</text>
              <text x="20" y="192" className="m">TP4054</text>
              <text x="20" y="220">charge 100 mA</text>
              <text x="20" y="352" className="m">LI-ION</text>
              <text x="20" y="380">~400 mAh</text>
              <text x="320" y="192" className="m">SELECT</text>
              <text x="320" y="220">USB › battery</text>
              <text x="620" y="192" className="m">SY8089</text>
              <text x="620" y="220">buck 3.31 V</text>
              <text x="830" y="188">3V3</text>
              <text x="620" y="276" className="m">+ TLV803 supervisor</text>
            </g>
          </svg>
          <Spec
            className="md:hidden"
            rows={[
              ["Input", "USB-C · 5 V"],
              ["Charger", "TP4054 · 100 mA"],
              ["Battery", "Li-ion · ~400 mAh"],
              ["Select", "USB › battery"],
              ["Regulator", "SY8089 buck · 3.31 V"],
              ["Supervisor", "TLV803"],
            ]}
          />
          <div className="gap" />
          <p className="caps" data-a="fade">
            Power stage adapted from Olimex ESP32-C3-DevKit-Lipo rev C · CERN-OHL-S
          </p>
        </Beside>
      </Scene>

      <Scene board="kbd" section={S}>
        <Beside w={700}>
          <Kicker>Input</Kicker>
          <h2 className="h2" data-a="rise">
            Keypad,
            <br />
            <span className="dim">detachable.</span>
          </h2>
          <div className="gap" />
          <p className="lead" data-a="rise">
            A <b>PCF8574T</b> 8-bit I/O expander scans a 3 × 4 matrix, so the keypad costs <b>two pins</b> on the
            MCU.
          </p>
          <div className="gap-l" />
          <Spec
            rows={[
              ["Expander", "PCF8574T · I²C 0x20"],
              ["Breakaway", "2 mouse-bite tabs · 28 × ⌀0.6 mm"],
              ["Bridge", "3V3 · GND · SDA · SCL · INT"],
              ["Silkscreen", "“1 CUT BRIDGE / 2 SNAP”"],
            ]}
          />
        </Beside>
      </Scene>

      <Scene board="bus" section={S}>
        <Beside w={820} vw={44}>
          <Kicker>Everything on one bus</Kicker>
          <h2 className="h2" data-a="rise">
            Two wires.
            <br />
            <span className="dim">Three chips.</span>
          </h2>
          <div className="gap-l" />
          <svg className="dia hidden md:block" viewBox="0 0 900 420" role="img" aria-label="The ESP32-C3 shares one I²C bus with the PN7160 at 0x28, the SSD1309 OLED at 0x3C and the PCF8574T keypad expander at 0x20">
            <g data-a="draw">
              <rect className="fill" x="0" y="40" width="220" height="120" />
              <path className="stroke" d="M220 80 H880" />
              <path className="stroke" d="M220 120 H880" />
              <path className="stroke" d="M330 80 V260 M360 120 V260" />
              <path className="stroke" d="M570 80 V260 M600 120 V260" />
              <path className="stroke" d="M810 80 V260 M840 120 V260" />
              <rect className="fill" x="270" y="260" width="160" height="110" />
              <rect className="fill" x="510" y="260" width="160" height="110" />
              <rect className="fill" x="750" y="260" width="150" height="110" />
            </g>
            <g data-a="fade">
              <text x="20" y="80" className="m">MCU</text>
              <text x="20" y="112">ESP32-C3</text>
              <text x="20" y="142" className="m">GPIO6/7</text>
              <text x="236" y="70" className="m">SDA</text>
              <text x="236" y="146" className="m">SCL</text>
              <text x="288" y="298">PN7160</text>
              <text x="288" y="328" className="m">NFC</text>
              <text x="288" y="356" style={{ fontWeight: 700 }}>0x28</text>
              <text x="528" y="298">SSD1309</text>
              <text x="528" y="328" className="m">OLED</text>
              <text x="528" y="356" style={{ fontWeight: 700 }}>0x3C</text>
              <text x="768" y="298">PCF8574T</text>
              <text x="768" y="328" className="m">KEYPAD</text>
              <text x="768" y="356" style={{ fontWeight: 700 }}>0x20</text>
            </g>
          </svg>
          <Spec
            className="md:hidden"
            rows={[
              ["MCU", "ESP32-C3 · GPIO6/7"],
              ["NFC", "PN7160 · 0x28"],
              ["OLED", "SSD1309 · 0x3C"],
              ["Keypad", "PCF8574T · 0x20"],
            ]}
          />
          <div className="gap" />
          <p className="caps" data-a="fade">
            100 kHz · each device probed at boot · all optional
          </p>
        </Beside>
      </Scene>

      <Scene board="explode" section={S}>
        <Beside w={600} vw={34}>
          <Kicker>Stackup</Kicker>
          <h2 className="h2" data-a="rise">
            Four layers.
          </h2>
          <div className="gap" />
          <p className="lead" data-a="rise">
            The NFC coil and signals are on top. The inner layers are ground. There is no copper under the coil.
          </p>
          <div className="gap-l" />
          <div className="stats">
            <Stat to={1021} label="trace segments" />
            <Stat to={312} label="vias" />
            <Stat to={91} label="nets" />
          </div>
        </Beside>
      </Scene>

      <Scene section={S}>
        <Kicker>Manufacturing cost</Kicker>
        <div className="grid gap-16 lg:grid-cols-[minmax(0,640px)_1fr] lg:gap-24">
          <div>
            <h2 className="h2" data-a="rise">
              Keep it
              <br />
              <span className="dim">standard.</span>
            </h2>
            <div className="gap" />
            <ol className="list">
              <li data-a="rise">
                Standard 4-layer stackup<small>No impedance control ordered.</small>
              </li>
              <li data-a="rise">
                Open 0.30 mm vias<small>Instead of filled and capped vias. No via-in-pad.</small>
              </li>
              <li data-a="rise">
                Single-sided assembly<small>All parts on top: one stencil, one reflow.</small>
              </li>
              <li data-a="rise">
                Basic parts where possible<small>“Extended” library parts add setup fees.</small>
              </li>
            </ol>
          </div>
          <div className="flex flex-col justify-end">
            <div className="stat" data-a="rise">
              <span className="l">Parts per board · prototype qty</span>
              <span className="n">
                ≈ $
                <span data-a="count" data-to="23">
                  23
                </span>
              </span>
            </div>
            <div className="gap" />
            <Bars
              rows={[
                { name: "PN7160", after: 100, value: <b>$4.05</b> },
                { name: "ESP32-C3 module", after: 82, value: <b>$3.32</b> },
                { name: "PCF8574T", after: 53, value: <b>$2.14</b> },
                { name: "Inductors 150 nH ×2", after: 41, value: <b>$1.67</b> },
                { name: "OLED socket", after: 38, value: <b>$1.53</b> },
                { name: "USB-C", after: 23, value: <b>$0.92</b> },
              ]}
            />
            <div className="gap-s" />
            <p className="caps" data-a="fade">
              Components only · excludes PCB, assembly, display, battery
            </p>
          </div>
        </div>
      </Scene>
    </>
  );
}

export function Stat({
  to,
  decimals,
  label,
  pre,
  unit,
}: {
  to: number;
  decimals?: number;
  label: string;
  pre?: string;
  unit?: string;
}) {
  const shown = to.toLocaleString("en-US", { minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 0 });
  return (
    <div className="stat" data-a="rise">
      <span className="n">
        {pre}
        <span data-a="count" data-to={to} data-decimals={decimals}>
          {shown}
        </span>
        {unit && <small>{unit}</small>}
      </span>
      <span className="l">{label}</span>
    </div>
  );
}
