# nucula.dev

Landing page for [nucula](https://github.com/zeugmaster/nucula) — a Cashu
ecash wallet for the ESP32 with NFC tap-to-pay.

Built with Next.js (App Router) and Tailwind CSS v4. Designed to be hosted on
Vercel.

## Development

```sh
npm install
npm run dev
```

## USB setup

`/setup` is the primary setup path for nucula v2 / Rev-A. In desktop Chrome or
Edge, connect a USB-C data cable, select the Espressif USB JTAG/serial port, and
install firmware or configure the firmware already on the board. Deployment
requires HTTPS; localhost also works. Safari and Firefox receive browser guidance.

The page separates **Connect to nucula** (firmware already installed; Wi-Fi and
console access) from **Initial firmware install / update** (including blank boards).
Flashing selects the USB port directly and does not require a console connection.

The client uses the pinned `esptool-js` package for ROM flashing and Web Serial
for the existing console. No backend handles credentials or console output.
The flasher is loaded only when an installation is requested.

- A protocol handshake gates Wi-Fi configuration. Old firmware still has console
  access and can be updated; a timeout does not imply an empty device.
- First installation can open the ROM downloader directly, without a working
  firmware console. If a blank board repeatedly disconnects, hold BOOT, tap RESET,
  release BOOT, then use **Review installation → Install firmware** and select its
  USB port. The page identifies invalid-image and download-mode boot messages and
  recovers replaceable serial read streams instead of treating every read error
  as a physical disconnect.
- Wi-Fi settings support 2.4 GHz personal/open networks, are stored on the board,
  and require a restart. **Restart board** reconnects to the same authorized USB
  port automatically and checks the applied settings, without another port picker.
  It tolerates a temporary USB disappearance for up to 25 seconds, and distinguishes
  USB reconnection from joining Wi-Fi. Failed reconnection offers manual recovery;
  settings and restart commands are never retried automatically. Existing Wi-Fi
  driver settings migrate on first boot.
- The bundled `usb-setup-1` release is a **preview**, built with ESP-IDF 5.5.1.
  It retains Rev-A's disabled OLED. It has passed build and simulated tests;
  physical flashing, reboot, Wi-Fi persistence and wallet preservation still need
  a hardware acceptance run before calling it a production release.
- The console exposes the firmware's real commands, including wallet commands.
  It is intentionally under advanced controls and holds only a bounded transcript
  in memory. Do not share transcripts containing tokens or seed words.

### Flash and storage guarantees

The installer requires an ESP32-C3 with 4 MB flash and refuses boards provisioned
with secure boot, encryption counters or secure download mode. Every downloaded
image is checked against its SHA-256, and written bytes are verified using the
device's MD5 command. These checks detect corruption; release authenticity relies
on the fixed GitHub firmware repository, HTTPS, and the website deployment.

An existing partition table must match the release exactly. Updates write only
the application at `0x30000`. A blank table also requires blank NVS before a first
installation writes the bootloader at `0x0`, table at `0x8000` and application at
`0x30000` as separate images. No merged image, NVS payload or erase-all operation
is accepted. NVS (`0x9000–0x2efff`) and PHY storage are never written by the flasher.
The accompanying firmware no longer automatically erases NVS on init failure.
Move funds off the board before testing firmware updates.

Storage checks use the board's MD5 command over the full partition-table sector
(including its erased tail) and, for a blank table, the full NVS region. Only
checksums travel over USB; wallet contents are not downloaded. This avoids the
streaming `readFlash` path in esptool-js 0.7.0, which leaves the final read digest
unconsumed and can stall. A failed or timed-out storage check stops before any
write and gives instructions to re-enter download mode.

After verification, the installer explicitly pulses RTS with DTR inactive to
start the application (esptool-js 0.7.0's `HardReset` only releases RTS). It then
reopens the selected port and retries read-only setup requests for up to 20 seconds
while the console starts. Wi-Fi becomes available only after a valid reply.
Opening the console releases both modem signals without pulsing reset. A
connected board that does not answer also offers **Start installed firmware**;
this restarts it without reflashing or changing credentials.

### Automated firmware releases

The setup page reads published releases from **zeugmaster/nucula** through
`GET /api/firmware/releases`. The newest compatible stable version is selected;
prereleases and the bundled `usb-setup-1` preview are opt-in. Drafts, incomplete
releases, mismatched tags, and unknown compatibility formats are excluded.
Release selection and installation consent are locked while an operation runs.
If GitHub is unavailable, USB configuration still works and the bundled preview
remains explicitly available. No preview is silently selected as stable.

In the firmware repository, `.github/workflows/firmware.yml` builds and tests on
pull requests and main pushes. Pushing `vX.Y.Z` or `vX.Y.Z-rc.N` (also alpha/beta)
produces a complete **draft GitHub Release**. Test its assets on hardware, review
the release notes, then publish the draft. See the firmware repository's
[release guide](https://github.com/zeugmaster/nucula/blob/main/docs/releases.md).
Firmware versions and website versions are independent.

Published releases appear without redeploying this website, normally within ten
minutes (upstream metadata and the response cache each refresh every five
minutes). Reload the page to refresh an already open selector. The catalog checks
up to 300 recent GitHub releases and offers up to 20 stable and 10 prerelease
candidates, ordered by semantic version rather than publication date.

This requires a Next.js **server deployment**, not a static export. Public GitHub
access works without credentials. For production, set a server-only
`FIRMWARE_GITHUB_TOKEN` with read-only Contents access to `zeugmaster/nucula` to
avoid GitHub's shared unauthenticated rate limit. Never use a `NEXT_PUBLIC_`
variable for it. The browser only calls this website; credentials never reach it.

Manifest schema 2 specifies Rev-A, ESP32-C3, 4 MiB flash, USB setup protocol 1,
`nucula-nvs-v1` storage, asset names, lengths, hashes, toolchain and source commit.
The server resolves names against that release's actual asset IDs. Downloads use
`/api/firmware/assets/<release-id>/<sha256>/<filename>` and are checked again on
the server and in the browser. The endpoint cannot proxy arbitrary URLs or private
repository files. Source archives are also verified. Firmware images are still
checked against the real board's chip, security settings and storage layout.

All firmware using a storage identifier must preserve and read data written by
all other releases using that identifier, including newer versions. Incompatible
changes need a new identifier and changed partition-table bytes so older
installers also refuse them in ROM mode. There is no automatic wallet migration
or full-flash erase in this installer.

`scripts/package-firmware.py` remains a local-only packager for the legacy bundled
preview format. New releases use the firmware-owned `scripts/package-release.py`;
do not update the website's bundled manifest for each new GitHub release.

The USB protocol is a single console command:
`web {"id":"request-id","op":"info"}`. Responses are newline-delimited JSON
prefixed with `@NUCULA `. Protocol 1 supports `info`, `wifi.set` (UTF-8 bytes encoded
as lowercase `ssid_hex` / `password_hex`) and `reboot`. The device does not echo
the JSON request. Responses correlate by `id`; only an acknowledged request is
shown as saved. `info` never returns a password. The source archive bundled with
each release contains the exact protocol implementation.

### Validation

```sh
npm run lint
npx tsc --noEmit
npm test
npm run build
# Optional host test of the real firmware console (requires a C/C++ compiler):
python3 scripts/test-firmware-console.py /path/to/nucula /path/to/esp-idf
```

`npm test` uses Playwright and Chromium (`npx playwright install chromium` if
needed), reusing a local dev server on port 3000. It checks the setup UI with a
simulated Web Serial device, fragmented replies, disconnects, old firmware,
credential validation, download corruption, and the flasher's write boundaries.
It never opens a real USB port. Hardware acceptance should cover a blank board,
an existing board with expendable wallet data, interrupted flashing and recovery,
wrong Wi-Fi credentials, saved settings after power loss, and Rev-A USB reset.

## Design and 3D board

The page uses the visual language of the btc++ talk deck (`btcpp-talk-nucula`):
monochrome, Inter Tight + JetBrains Mono, and a live three.js model of the
board behind the content.

Each `<Scene>` (`components/ui.tsx`) is one "slide". Its `board` prop names a
camera/render preset from `lib/board/states.js`, `theme` switches the whole
page between light and dark, and `section` feeds the header label. The scene
under the middle of the viewport wins (`components/Stage.tsx`). On phones the
board only appears where a scene sets `compact`, so it never sits behind text.

Elements with `data-a="rise | fade | scramble | count | draw | grow"` animate
in as they scroll into view (`lib/motion.ts`).

`lib/board/board.js` and `states.js` are ports of the deck's `src/board.js`
and `src/states.js`. The models in `public/models/` are copied from the deck's
`assets/models/`. Regenerate them there after a PCB change
(`npm run build:model`, which needs KiCad's `kicad-cli`) and copy them over.
The PN7160 has no redistributable 3D model, so it renders as a plain block.

`og.png` is a 1200×630 screenshot of the hero; refresh it after changing the
hero.

The board model derives from the Nucula Board hardware project, distributed
under [CERN-OHL-S-2.0](https://github.com/zeugmaster/nucula-board/blob/main/LICENSE).
Its power design is adapted from Olimex ESP32-C3-DevKit-Lipo revision C;
see the hardware repository for source files, attribution and library licenses.
