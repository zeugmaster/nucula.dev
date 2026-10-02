"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { BoardConnection, bootGuidance, startFirmware } from "@/lib/setup/serial";
import { reconnectAfterRestart } from "@/lib/setup/reconnect";
import { readableError, wifiFields, type DeviceInfo } from "@/lib/setup/protocol";
import { downloadImages, loadCatalog, type FirmwareCatalog } from "@/lib/setup/release";
import type { FlashProgress } from "@/lib/setup/flash";

const subscribe = () => () => {};
const browserSupport = () => !window.isSecureContext ? "insecure" : typeof navigator.serial?.requestPort === "function" ? "supported" : "unsupported";

export default function SetupTool() {
  const support = useSyncExternalStore(subscribe, browserSupport, () => "checking");
  const [catalog, setCatalog] = useState<FirmwareCatalog | null>(null);
  const [selectedRelease, setSelectedRelease] = useState("");
  const [includePreviews, setIncludePreviews] = useState(false);
  const candidates = catalog?.candidates.filter((candidate) => includePreviews || !candidate.prerelease) ?? [];
  const candidate = candidates.find((entry) => entry.id === selectedRelease) ?? candidates[0];
  const release = candidate?.release;
  const [releaseError, setReleaseError] = useState("");
  const [connected, setConnected] = useState(false);
  const [info, setInfo] = useState<DeviceInfo | null>(null);
  const [detection, setDetection] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [review, setReview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [openNetwork, setOpenNetwork] = useState(false);
  const [saved, setSaved] = useState(false);
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
  const [follow, setFollow] = useState(true);
  const connection = useRef<BoardConnection | null>(null);
  const port = useRef<SerialPort | null>(null);
  const operation = useRef(false);
  const reconnection = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const log = useRef<HTMLPreElement>(null);

  const append = useCallback((text: string) => {
    // Render text, never terminal HTML. Keep a bounded in-memory transcript.
    const clean = text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\r/g, "");
    if (mounted.current) setOutput((previous) => (previous + clean).slice(-48000));
  }, [setOutput]);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void loadCatalog(controller.signal).then(setCatalog).catch((err) => {
      if (!controller.signal.aborted) setReleaseError(readableError(err));
    });
    return () => {
      mounted.current = false;
      controller.abort();
      reconnection.current?.abort();
      void connection.current?.close().catch(() => {});
      connection.current = null;
    };
  }, []);

  useEffect(() => {
    if (follow && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [output, follow]);

  useEffect(() => {
    if (busy !== "install") return;
    const preventExit = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", preventExit);
    return () => window.removeEventListener("beforeunload", preventExit);
  }, [busy]);

  function begin(name: string) {
    if (operation.current) return false;
    operation.current = true;
    setBusy(name); setError(""); setNotice("");
    return true;
  }
  function finish() { operation.current = false; if (mounted.current) setBusy(null); }

  function connectionLost(device: BoardConnection, reason: Error) {
    if (connection.current !== device) return;
    connection.current = null; port.current = null;
    setConnected(false); setInfo(null); setPassword("");
    setDetection(""); setNotice(reason.message);
  }

  function showInfo(data: DeviceInfo) {
    setInfo(data); setSsid(data.ssid); setSaved(data.restart_required); setDetection("");
  }

  async function inspect(device: BoardConnection, waitForStartup = false) {
    try {
      const data = await (waitForStartup ? device.waitForFirmware() : device.info());
      if (connection.current !== device) return false;
      showInfo(data);
      return true;
    } catch (err) {
      if (connection.current !== device) return;
      setInfo(null);
      setDetection(device.bootState ? bootGuidance(device.bootState) : device.sawConsole
        ? "The nucula console is responding, but browser configuration is not available yet. Use Initial firmware install / update below, or use the serial console."
        : readableError(err));
      return false;
    }
  }

  async function openConnection(selected: SerialPort, waitForStartup = false) {
    port.current = selected;
    const device = new BoardConnection(selected, append, (reason) => connectionLost(device, reason));
    connection.current = device;
    try {
      await device.open();
      if (connection.current !== device) return false;
      setConnected(true);
      return await inspect(device, waitForStartup);
    } catch (error) {
      await device.close().catch(() => {});
      if (connection.current === device) { connection.current = null; port.current = null; }
      setConnected(false);
      throw error;
    }
  }

  async function connect() {
    if (!begin("connect")) return;
    try {
      // Keep the picker directly in the click gesture; loading code first loses
      // transient user activation in browsers.
      const selected = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x303a, usbProductId: 0x1001 }] });
      setOutput(""); setProgress(null); setDetection(""); setInfo(null); setSaved(false); setPassword("");
      await openConnection(selected);
    } catch (err) {
      connection.current = null; port.current = null;
      setConnected(false); setError(readableError(err));
    } finally { finish(); }
  }

  async function disconnect() {
    if (!begin("disconnect")) return;
    try { await connection.current?.close(); }
    catch (err) { setError(readableError(err)); }
    finally {
      connection.current = null; port.current = null;
      setConnected(false); setInfo(null); setSaved(false); setPassword(""); setReview(false); setConfirmed(false);
      finish();
    }
  }

  async function check() {
    if (!connection.current || !begin("check")) return;
    try { await inspect(connection.current); } finally { finish(); }
  }

  async function restartFirmware() {
    const device = connection.current;
    if (!device || !begin("restart")) return;
    try {
      setInfo(null); setDetection(""); setPassword("");
      await startFirmware(device.port);
      // Re-open to discard any bootloader bytes still in the old reader.
      await device.close();
      connection.current = null;
      setConnected(false);
      if (await openConnection(device.port, true)) setNotice("Board ready. Configure Wi-Fi below.");
    } catch (error) { setError(readableError(error)); }
    finally { finish(); }
  }

  async function install() {
    if (!release || !confirmed) return;
    if (info?.storage_schema && info.storage_schema !== "nucula-nvs-v1") {
      setError("This board uses a different wallet storage format. This release cannot be installed safely."); return;
    }
    if (!begin("install")) return;
    let handedOver = false;
    let installed = false;
    try {
      // Blank/rebooting boards cannot sustain a console connection. Enter ROM
      // flashing directly, with the picker still inside this button gesture.
      const selected = port.current ?? await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x303a, usbProductId: 0x1001 }] });
      setProgress({ percent: 0, message: "Downloading and checking firmware…" });
      const [images, { flashBoard }] = await Promise.all([downloadImages(release), import("@/lib/setup/flash")]);
      handedOver = true;
      setConnected(false); setInfo(null); setPassword("");
      await connection.current?.close();
      connection.current = null; port.current = null;
      await flashBoard(selected, images, setProgress, append);
      installed = true;
      setReview(false); setConfirmed(false);
      setBusy("restart");
      setNotice("Firmware installed and verified. Waiting for the board to start…");
      if (await openConnection(selected, true)) {
        setNotice("Firmware installed and board ready. Configure Wi-Fi below.");
      } else {
        setNotice(connection.current
          ? "Firmware installed and verified. Press RESET, then Check board to finish connecting."
          : "Firmware installed and verified. Press RESET, then Reconnect board to configure Wi-Fi.");
      }
    } catch (err) {
      if (installed) setNotice("Firmware installed and verified. Press RESET, then Reconnect board to configure Wi-Fi.");
      else { setError(readableError(err)); setProgress(null); }
    } finally {
      if (handedOver && !installed) { port.current = null; connection.current = null; }
      finish();
    }
  }

  async function saveWifi(event: FormEvent) {
    event.preventDefault();
    if (!connection.current || !info?.storage_ready || !begin("wifi")) return;
    try {
      if (!openNetwork && !password) throw new Error("Enter the network password, or select “This is an open network”.");
      const fields = wifiFields(ssid, openNetwork ? "" : password);
      await connection.current.request("wifi.set", fields);
      setPassword(""); setSaved(true);
      setNotice("Wi-Fi settings saved on your board. Restart to apply them; this page will reconnect automatically.");
    } catch (err) { setError(readableError(err)); }
    finally { finish(); }
  }

  async function reboot() {
    if (!connection.current || !begin("reboot")) return;
    const device = connection.current;
    const controller = new AbortController();
    reconnection.current = controller;
    let restarting = false;
    try {
      await device.request("reboot");
      restarting = true;
      connection.current = null; port.current = null;
      setConnected(false); setInfo(null); setSaved(false); setPassword(""); setDetection("");
      setNotice("Restarting the board and reconnecting automatically…");
      // A USB reset can remove the old port before close() finishes.
      await device.close().catch(() => {});
      const result = await reconnectAfterRestart(device.port, append, connectionLost, controller.signal);
      if (controller.signal.aborted || !mounted.current) { await result.device.close(); return; }
      connection.current = result.device; port.current = result.device.port;
      setConnected(true); showInfo(result.info);
      setNotice(result.info.connected
        ? `Board reconnected. Wi-Fi is connected to ${result.info.ssid}.`
        : result.info.configured
          ? `Board reconnected. Wi-Fi has not joined ${result.info.ssid} yet. Check the network or update its credentials, then use Check board to refresh the status.`
          : "Board reconnected. Wi-Fi is not configured yet.");
    } catch (err) {
      if (!controller.signal.aborted && mounted.current) {
        setNotice("");
        setError(restarting ? readableError(err) : `Could not restart the board. Your Wi-Fi settings are saved. ${readableError(err)}`);
      }
    }
    finally {
      if (reconnection.current === controller) reconnection.current = null;
      finish();
    }
  }

  async function send(event?: FormEvent, shortcut?: string) {
    event?.preventDefault();
    const text = shortcut ?? command;
    if (!connection.current || !text.trim() || !begin("command")) return;
    try {
      await connection.current.command(text);
      setCommand("");
    } catch (err) { setError(readableError(err)); }
    finally { finish(); }
  }

  const ready = connected && Boolean(info);
  const disabled = Boolean(busy);

  return (
    <div className="setup-page">
      {/* Full navigations release USB ownership and invoke the installation
          beforeunload guard; client routing would bypass that guard. */}
      <header className="setup-header">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="setup-wordmark" aria-label="nucula home">nucula<span aria-hidden> / </span><span>setup</span></a>
        <a href="https://github.com/zeugmaster/nucula" target="_blank" rel="noreferrer">Firmware source ↗</a>
      </header>
      <main className="setup-main">
        <div className="setup-intro">
          <div>
            <h1>Your board. Ready to go.</h1>
            <p>Install firmware on a new board, or connect to an existing nucula to configure Wi-Fi and use its console.</p>
          </div>
          <span className="setup-board-label">nucula v2 · USB-C</span>
        </div>

        <nav className="setup-paths" aria-label="Setup options">
          <a href="#connection-title"><strong>Connect to nucula <span aria-hidden>↘</span></strong><span>Firmware already installed? Configure Wi-Fi and use the serial console.</span></a>
          <a href="#firmware-title"><strong>Initial firmware install / update <span aria-hidden>↘</span></strong><span>Start here for a new board, missing firmware or a firmware update.</span></a>
        </nav>

        {support !== "supported" && support !== "checking" && (
          <div className="setup-message" role="status">
            <strong>{support === "insecure" ? "Open this page over HTTPS" : "Use Chrome or Edge on a computer"}</strong>
            <p>{support === "insecure" ? "Your browser only allows USB access on a secure page or localhost." : "This setup tool needs Web Serial. Open this page in desktop Chrome or Edge on Windows, macOS or Linux. Safari, Firefox and iPhone browsers cannot connect here."}</p>
          </div>
        )}
        {error && <div className="setup-message setup-error" role="alert"><strong>Couldn’t complete that step</strong><p>{error}</p></div>}
        {notice && <div className="setup-message" role="status"><p>{notice}</p></div>}

        <div className="setup-workspace">
          <div className="setup-primary">
            <section className="setup-section" aria-labelledby="connection-title">
              <div className="setup-section-heading"><h2 id="connection-title">Connect to nucula</h2><span className="setup-status"><i data-connected={connected} />{connected ? "USB connected" : busy === "reboot" ? "Reconnecting" : busy === "install" ? "Installing" : "Disconnected"}</span></div>
              <p><strong>Requires nucula firmware already installed on the board.</strong> Connect over USB to configure Wi-Fi or use the serial console. For a new or unflashed board, use <a href="#firmware-title">Initial firmware install / update</a>.</p>
              <p className="setup-note">Use a USB-C data cable and select <strong>USB JTAG/serial debug unit</strong> or the Espressif port when prompted.</p>
              <div className="setup-actions">
                {!connected ? <button className="setup-button primary" disabled={disabled || support !== "supported"} onClick={connect}>{busy === "reboot" ? "Reconnecting…" : busy === "connect" ? "Connecting…" : progress?.percent === 100 ? "Reconnect board" : "Connect board"}<span aria-hidden>↗</span></button>
                  : <><button className="setup-button" disabled={disabled} onClick={check}>{busy === "check" ? "Checking…" : "Check board"}</button>{!info && <button className="setup-button" disabled={disabled} onClick={restartFirmware}>Start installed firmware</button>}<button className="setup-text-button" disabled={disabled} onClick={disconnect}>Disconnect</button></>}
              </div>
              {busy === "connect" && connected && <p role="status" className="setup-note">Checking the installed firmware…</p>}
              {busy === "restart" && <p role="status" className="setup-note">Waiting for the firmware to start…</p>}
              {connected && detection && <p className="setup-note" role="status">{detection}</p>}
              {info && <dl className="setup-device-info"><div><dt>Firmware</dt><dd>{info.version}</dd></div><div><dt>Wi-Fi</dt><dd>{info.connected ? `Connected to ${info.ssid}` : info.configured ? `Waiting for ${info.ssid}` : "Not configured"}</dd></div>{info.ip && <div><dt>IP address</dt><dd>{info.ip}</dd></div>}</dl>}
            </section>

            <section className="setup-section" aria-labelledby="firmware-title">
              <div className="setup-section-heading"><h2 id="firmware-title">Initial firmware install / update</h2>{info && release?.version === info.version && <span className="setup-status">Up to date</span>}</div>
              <p>Flash nucula onto a new board or update an existing installation. This works even when no firmware is installed. Plug in the USB cable and start here; the installer will ask you to select the board.</p>
              {catalog && <div className="setup-release-picker">
                <label htmlFor="firmware-version">Firmware version</label>
                <select id="firmware-version" value={candidate?.id ?? ""} disabled={disabled || !candidates.length} onChange={(event) => { setSelectedRelease(event.target.value); setReview(false); setConfirmed(false); setProgress(null); }}>
                  {!candidates.length && <option value="">No stable release available yet</option>}
                  {candidates.map((entry, index) => <option key={entry.id} value={entry.id}>{entry.release.version}{entry.id === "bundled-preview" ? " · Bundled preview" : entry.prerelease ? " · Prerelease" : index === 0 ? " · Latest stable" : ""}</option>)}
                </select>
                <label className="setup-checkbox"><input type="checkbox" checked={includePreviews} disabled={disabled} onChange={(event) => { setIncludePreviews(event.target.checked); setSelectedRelease(""); setReview(false); setConfirmed(false); setProgress(null); }} />Include prereleases and the bundled preview</label>
              </div>}
              {catalog?.warning && <p className="setup-note" role="status">{catalog.warning}</p>}
              {release ? <>
                <p><strong>{release.version}</strong>{candidate?.publishedAt && <> · {new Date(candidate.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</>}{candidate?.prerelease && <span className="setup-release-kind">Preview</span>}</p>
                {candidate?.prerelease && <p className="setup-note">Preview firmware may be unfinished. Choose a stable release for everyday use when one is available.</p>}
                {release.notes && <p className="setup-release-notes">{release.notes}</p>}
                <p className="setup-note"><a href={candidate?.url} target="_blank" rel="noreferrer">Release notes ↗</a> · <a href={release.source} download>Download this build’s source</a></p>
                <p className="setup-note">Updates write only the application and preserve wallet storage. Move funds off the board before updating, and keep the cable connected until verification finishes.</p>
              </> : <p role="status">{releaseError || (catalog ? "No compatible stable firmware is available yet. Enable previews to see test builds. Board configuration is still available above." : "Loading the available firmware…")}</p>}
              {!review && <button className="setup-button" disabled={support !== "supported" || !release || disabled} onClick={() => { setReview(true); setConfirmed(false); }}>{info ? "Review update" : "Review installation"}</button>}
              {!connected && !progress && <p className="setup-note">If the USB port won’t stay available, hold BOOT, tap RESET, then release BOOT before starting the installation.</p>}
              {review && <div className="setup-install-review">
                <h3>Install {release?.version}</h3>
                <p>The board will restart. A first installation also writes the bootloader and partition table. If the existing storage layout is incompatible, installation stops.</p>
                <label className="setup-checkbox"><input type="checkbox" checked={confirmed} disabled={disabled} onChange={(event) => setConfirmed(event.target.checked)} />This is a nucula v2 board.</label>
                <div className="setup-actions"><button className="setup-button primary" disabled={support !== "supported" || !confirmed || !release || disabled} onClick={install}>{busy === "install" ? "Installing…" : "Install firmware"}</button><button className="setup-text-button" disabled={disabled} onClick={() => setReview(false)}>Cancel</button></div>
              </div>}
              {progress && <div className="setup-progress" role="status"><div><span>{progress.message}</span><span>{progress.percent}%</span></div><progress aria-label="Firmware installation" value={progress.percent} max={100} /></div>}
            </section>

            <section className="setup-section" aria-labelledby="wifi-title">
              <div className="setup-section-heading"><h2 id="wifi-title">Connect to Wi-Fi</h2>{info?.connected && <span className="setup-status">Online</span>}</div>
              <p>Choose a 2.4 GHz network. Your credentials go directly to the board over USB and are saved there for the next startup.</p>
              {!ready && <p className="setup-note">{busy === "restart" || busy === "reboot" ? "Wi-Fi settings will become available when the board replies." : connected ? "Waiting for a setup reply. If you just installed firmware, choose Start installed firmware or press RESET, then Check board." : "Requires installed nucula firmware. Connect to nucula above to configure Wi-Fi."}</p>}
              {info && !info.storage_ready && <p className="setup-error-text" role="alert">The board’s storage is unavailable. Wallet operation and configuration are stopped to preserve its data. Check the serial console.</p>}
              <form onSubmit={saveWifi}>
                <fieldset disabled={!ready || !info?.storage_ready || disabled}>
                  <label htmlFor="wifi-ssid">Network name <span>(SSID)</span></label>
                  <input id="wifi-ssid" name="ssid" autoComplete="off" autoCapitalize="none" spellCheck={false} required value={ssid} onChange={(event) => { setSsid(event.target.value); setSaved(false); }} placeholder="Your 2.4 GHz network" />
                  <div className="setup-label-row"><label htmlFor="wifi-password">Password</label><button type="button" className="setup-text-button" aria-controls="wifi-password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} disabled={openNetwork}>{showPassword ? "Hide" : "Show"}</button></div>
                  <input id="wifi-password" name="wifi-password" type={showPassword ? "text" : "password"} autoComplete="new-password" disabled={openNetwork} required={!openNetwork} value={password} onChange={(event) => { setPassword(event.target.value); setSaved(false); }} placeholder={openNetwork ? "No password needed" : "Network password"} />
                  <label className="setup-checkbox"><input type="checkbox" checked={openNetwork} onChange={(event) => { setOpenNetwork(event.target.checked); setPassword(""); setSaved(false); }} />This is an open network</label>
                  <div className="setup-actions"><button className="setup-button primary" type="submit">{busy === "wifi" ? "Saving…" : "Save Wi-Fi settings"}</button>{saved && <button className="setup-button" type="button" onClick={reboot}>Restart board</button>}</div>
                </fieldset>
              </form>
              {saved && <p className="setup-note" role="status">Saved. Restart the board to apply your settings. This page will reconnect and check its Wi-Fi connection automatically.</p>}
            </section>
          </div>

          <aside className="setup-help" aria-label="Setup help">
            <h2>Just a board and a cable.</h2>
            <p>No drivers, SDK or development environment to set up on a typical desktop. The browser asks before it accesses your USB port.</p>
            <dl><div><dt>Board</dt><dd>nucula v2 / Rev-A<br />ESP32-C3 · 4 MB</dd></div><div><dt>Connection</dt><dd>USB-C data cable</dd></div><div><dt>Browser</dt><dd>Desktop Chrome or Edge</dd></div></dl>
            <details><summary>Board not appearing?</summary><p>Try another data cable and USB port. Close other serial monitors and browser tabs using the board. On Rev-A with a battery attached, press RESET after reconnecting USB.</p><p>On Linux, your user may need permission to access serial devices. On managed computers, browser policy can block USB access.</p></details>
            <details><summary>Installation won’t start?</summary><p>Hold BOOT, press and release RESET, then release BOOT. Use Initial firmware install / update and select the Espressif port when prompted.</p></details>
            <details><summary>Wi-Fi won’t connect?</summary><p>The ESP32-C3 uses 2.4 GHz Wi-Fi. Check the network name and password, then save and restart. Networks requiring a browser sign-in or enterprise authentication are not supported by this setup form.</p></details>
            <details><summary>What stays private?</summary><p>Wi-Fi details travel directly over USB. This page does not upload them or save them in browser storage. The serial console can show wallet secrets if you request them; take care when sharing its output.</p></details>
          </aside>
        </div>

        <details className="setup-console">
          <summary><span>Serial console</span><span>Advanced · 115200 baud</span></summary>
          <div className="setup-console-inner">
            <p>Requires installed nucula firmware and a USB connection. Commands can move funds or change wallet data. Use <code>help</code> to see the available commands.</p>
            <div className="setup-console-toolbar"><div className="setup-actions">{["help", "status", "heap"].map((cmd) => <button key={cmd} className="setup-button" disabled={!connected || disabled} onClick={() => send(undefined, cmd)}>{cmd}</button>)}</div><div className="setup-actions"><label className="setup-checkbox"><input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />Follow output</label><button className="setup-text-button" onClick={() => setOutput("")}>Clear</button></div></div>
            <pre ref={log} tabIndex={0} aria-label="Serial output">{output || (connected ? "Connected. Enter a command below.\n" : "Connect your board to see its serial output.\n")}</pre>
            <form className="setup-command" onSubmit={send}><label className="sr-only" htmlFor="console-command">Console command</label><span aria-hidden>nucula&gt;</span><input id="console-command" value={command} onChange={(event) => setCommand(event.target.value)} disabled={!connected || disabled} placeholder="help" autoComplete="off" autoCapitalize="none" spellCheck={false} /><button type="submit" className="setup-button" disabled={!connected || disabled || !command.trim()}>Send ↵</button></form>
          </div>
        </details>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <footer className="setup-footer"><a href="/">← Back to nucula</a><span>Open hardware. Open firmware.</span></footer>
      </main>
    </div>
  );
}
