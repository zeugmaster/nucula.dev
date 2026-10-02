import { Beside, Kicker, Scene, Spec } from "./ui";

export default function Build() {
  return (
    <>
      <Scene id="build" board="outro" section="Build one">
        <Beside w={720}>
          <Kicker>Open hardware</Kicker>
          <h2 className="h2 xl" data-a="rise">
            Nothing
            <br />
            <span className="dim">to buy.</span>
          </h2>
          <div className="gap" />
          <p className="lead" data-a="rise">
            Schematics, board layout, BOM and manufacturing files are all in the KiCad 10 project. The v2 board is a
            routed prototype for manual assembly; bring-up is still ahead.
          </p>
          <div className="gap-l" />
          <Spec
            rows={[
              ["Design", "KiCad 10 · project-specific parts included"],
              ["Fabrication", "4 layers · 1.6 mm · ENIG · Gerbers + drills"],
              ["Sourced separately", "OLED · keypad · battery"],
            ]}
          />
          <div className="gap" />
          <div className="term" data-a="rise">
            <div className="head caps">
              <span>open the hardware</span>
              <span>zsh</span>
            </div>
            <pre>
              <code>
                <span className="text-mute">$ </span>git clone https://github.com/zeugmaster/nucula-board.git{"\n"}
                <span className="text-mute">$ </span>cd nucula-board{"\n"}
                <span className="text-mute"># check the schematic (needs kicad-cli){"\n"}$ </span>python3 tools/check_schematic.py{"\n"}
                <span className="text-mute">$ </span>kicad nucula-v2.kicad_pro
              </code>
            </pre>
            <div className="foot caps">current PCB: v2 · routing review · 22 September 2026</div>
          </div>
        </Beside>
      </Scene>

      <Scene board="remaining" section="Build one">
        <Beside w={720}>
          <Kicker>Remaining work</Kicker>
          <h2 className="h2" data-a="rise">
            Not done <span className="dim">yet.</span>
          </h2>
          <div className="gap-l" />
          <ol className="list">
            <li data-a="rise">
              NFC tuning<small>Tune with a VNA toward 20 + j0 Ω, using the trim pads and removable TX links.</small>
            </li>
            <li data-a="rise">
              Component size
              <small>RF parts are 0805 / 1206 so they can be hand-tuned. Shrink them once the values are known.</small>
            </li>
            <li data-a="rise">
              Bring-up &amp; power<small>Inrush current, charger heat, and battery runtime.</small>
            </li>
            <li data-a="rise">
              Enclosure<small>Display fit and ribbon routing.</small>
            </li>
          </ol>
        </Beside>
      </Scene>
    </>
  );
}
