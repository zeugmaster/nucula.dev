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
on the HTTPS origin and its deployment process, not a separate signing key.

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

### Preparing another firmware release

The companion firmware changes live in `../embedded/nucula`: `main/web_setup.cpp`,
`wifi.c`, `console.cpp`, and startup registration. Public builds no longer include
`main/wifi_config.h`. Build from those sources with the ESP-IDF environment active:

```sh
idf.py -DPROJECT_VER=usb-setup-2 build
# From this website repository:
npm run firmware:package -- /path/to/nucula/build
```

The packager validates the target, offsets, executable headers, app version and
partition layout; emits separate images plus SHA-256/MD5 hashes; and includes a
source archive with personal credential headers excluded. Version directories are
immutable: choose a new version when rebuilding. `public/firmware/manifest.json`
selects the offered release. Deploy the manifest and its version directory together.
Do not copy older locally built binaries: they may contain Wi-Fi credentials.
The firmware package is served from the same origin as the page.

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
