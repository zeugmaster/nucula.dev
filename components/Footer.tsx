import { Kicker } from "./ui";

const links = [
  ["Firmware", "github.com/zeugmaster/nucula", "https://github.com/zeugmaster/nucula"],
  ["Hardware", "github.com/zeugmaster/nucula-board", "https://github.com/zeugmaster/nucula-board"],
  ["Cashu", "cashu.space", "https://cashu.space"],
  ["Specs", "github.com/cashubtc/nuts", "https://github.com/cashubtc/nuts"],
];

export default function Footer() {
  return (
    <footer data-scene data-board="hero" data-theme="dark" data-section="nucula" className="scene">
      <div className="wrap w-full">
        <Kicker>On the back of the board</Kicker>
        <p className="h2 xl max-w-[12ch]" data-a="rise">
          Freedom <span className="dim">to transact.</span>
        </p>
        <div className="gap-l" />
        <dl className="spec max-w-[760px]">
          {links.map(([k, label, href]) => (
            <div key={k} data-a="rise">
              <dt>{k}</dt>
              <dd>
                <a href={href} target="_blank" rel="noreferrer">
                  {label} ↗
                </a>
              </dd>
            </div>
          ))}
        </dl>
        <div className="gap-l" />
        <p className="caps" data-a="fade">
          nucula · open firmware, open hardware, open page
        </p>
      </div>
    </footer>
  );
}
