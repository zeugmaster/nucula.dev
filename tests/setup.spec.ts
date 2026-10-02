import { test, expect, type Page } from "@playwright/test";
import bundled from "../public/firmware/manifest.json";

const stable = { id: "1", prerelease: false, publishedAt: "2026-10-02T00:00:00Z", url: "https://github.com/zeugmaster/nucula/releases/tag/v0.1.0", release: { ...bundled, version: "0.1.0", notes: "Stable test firmware" } };
test.beforeEach(async ({ page }) => {
  await page.route("**/api/firmware/releases", (route) => route.fulfill({ json: { candidates: [stable] } }));
});

async function serialMock(page: Page, mode: "modern" | "legacy" | "silent" | "cancel" | "save-error" | "boot-drop" | "download-mode" | "download-slow" | "reboot-delay" | "reboot-offline" | "reboot-error" | "reboot-missing" | "incompatible-storage" = "modern") {
  await page.addInitScript(({ mode }) => {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    let input = "";
    let restartRequired = false;
    let activeSsid = "Workshop";
    let savedSsid = activeSsid;
    let restartingUntil = 0;
    let rebooted = false;
    const state = { requests: [] as Record<string, unknown>[], commands: [] as string[], signals: [] as SerialOutputSignals[], closed: 0, picked: 0, resets: 0, opens: 0 };
    let downloadMode = mode === "download-mode" || mode === "download-slow";
    let resetAsserted = false;
    let droppedInfo = 0;
    const output = (text: string) => controller.enqueue(new TextEncoder().encode(text));
    const port = {
      readable: null as ReadableStream<Uint8Array> | null,
      writable: null as WritableStream<Uint8Array> | null,
      getInfo: () => ({ usbVendorId: 0x303a, usbProductId: 0x1001 }),
      async setSignals(signals: SerialOutputSignals) {
        state.signals.push(signals);
        if (signals.requestToSend === true) resetAsserted = true;
        if (signals.requestToSend === false && resetAsserted) {
          state.resets++; resetAsserted = false; downloadMode = false;
        }
      },
      async open() {
        state.opens++;
        if (Date.now() < restartingUntil) throw new DOMException("USB port is restarting", "NetworkError");
        if (rebooted) { restartRequired = false; activeSsid = savedSsid; }
        this.readable = new ReadableStream({ start(c) { controller = c; } });
        this.writable = new WritableStream({ write(value) {
          input += new TextDecoder().decode(value);
          input = input.replace(/\x03/g, "");
          let end;
          while ((end = input.indexOf("\r")) >= 0) {
            const line = input.slice(0, end); input = input.slice(end + 1);
            if (!line) continue;
            if (["silent", "boot-drop"].includes(mode) || downloadMode) continue;
            if (line.startsWith("web ") && mode !== "legacy") {
              const request = JSON.parse(line.slice(4));
              state.requests.push(request);
              if (mode === "download-slow" && request.op === "info" && droppedInfo++ < 2) continue;
              let reply;
              if (request.op === "info") reply = { id: request.id, ok: true, protocol: 1, board: "nucula-v2", version: "older-test-build", storage_schema: mode === "incompatible-storage" ? "nucula-nvs-v2" : "nucula-nvs-v1", storage_ready: true, configured: true, connected: !(rebooted && mode === "reboot-offline"), restart_required: restartRequired, ssid: activeSsid, ip: rebooted && mode === "reboot-offline" ? "" : "192.168.1.42" };
              else if (request.op === "wifi.set") {
                restartRequired = true;
                savedSsid = new TextDecoder().decode(Uint8Array.from(request.ssid_hex.match(/.{2}/g), (byte: string) => parseInt(byte, 16)));
                reply = mode === "save-error" ? { id: request.id, ok: false, error: "ESP_ERR_NVS_NOT_ENOUGH_SPACE" } : { id: request.id, ok: true, restart_required: true };
              } else if (request.op === "reboot") {
                reply = { id: request.id, ok: mode !== "reboot-error", error: "restart_failed" };
                if (mode !== "reboot-error") {
                  rebooted = true;
                  restartingUntil = mode === "reboot-missing" ? Infinity : Date.now() + (mode === "reboot-delay" ? 1400 : 200);
                }
              } else reply = { id: request.id, ok: true };
              const frame = "\r\n@NUCULA " + JSON.stringify(reply) + "\r\nnucula> ";
              // Split inside the marker and JSON to exercise stream framing.
              output(frame.slice(0, 6)); output(frame.slice(6, 37)); output(frame.slice(37));
            } else {
              state.commands.push(line);
              output(line + "\r\n" + (line === "help" ? "Available commands: status, heap, reboot" : "nucula console ready") + "\r\nnucula> ");
            }
          }
        } });
        if (mode === "boot-drop") {
          output("ESP-ROM:esp32c3\r\ninvalid head");
          setTimeout(() => output("er: 0xffffffff\r\n"), 10);
          setTimeout(() => controller.error(new DOMException("The device has been lost.", "NetworkError")), 60);
        } else if (downloadMode) {
          output("waiting for download\r\n");
        }
      },
      async close() {
        state.closed++; this.readable = null; this.writable = null;
        if (mode === "reboot-delay" && Date.now() < restartingUntil)
          throw new DOMException("Device disappeared during close", "NetworkError");
      },
    };
    Object.assign(window, {
      serialTest: state,
      detachBoard: () => controller.error(new Error("unplugged")),
      recoverRead: () => {
        const previous = controller;
        port.readable = new ReadableStream({ start(c) { controller = c; } });
        previous.error(new DOMException("Receive buffer overflowed.", "BufferOverrunError"));
      },
    });
    Object.defineProperty(navigator, "serial", { configurable: true, value: {
      async requestPort() { state.picked++; if (mode === "cancel") throw new DOMException("No port selected", "NotFoundError"); return port; },
    } });
  }, { mode });
}

async function connected(page: Page) {
  await page.goto("/setup");
  await page.getByRole("button", { name: "Connect board", exact: true }).click();
  await expect(page.getByText("older-test-build", { exact: true })).toBeVisible();
}

test("configures Wi-Fi, redacts credentials and reconnects automatically after restart", async ({ page }) => {
  await serialMock(page);
  await connected(page);
  await page.getByLabel("Network name").fill(' Café "home" ');
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Save Wi-Fi settings" }).click();
  await expect(page.getByText("Wi-Fi settings saved on your board.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  const requests = await page.evaluate(() => (window as unknown as { serialTest: { requests: Record<string, string>[] } }).serialTest.requests);
  expect(requests.map((r) => r.op)).toEqual(["info", "wifi.set"]);
  expect(Buffer.from(requests[1].ssid_hex, "hex").toString()).toBe(' Café "home" ');
  expect(Buffer.from(requests[1].password_hex, "hex").toString()).toBe("not-a-real-password");
  expect(await page.locator("body").textContent()).not.toContain("not-a-real-password");
  await page.getByRole("button", { name: "Restart board" }).click();
  await expect(page.getByText("Board reconnected. Wi-Fi is connected to", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Network name")).toHaveValue(' Café "home" ');
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Network name")).toBeEnabled();
  await expect(page.getByRole("button", { name: "Restart board" })).toHaveCount(0);
  await page.locator(".setup-console summary").click();
  await page.getByRole("button", { name: "help", exact: true }).click();
  await expect(page.getByLabel("Serial output")).toContainText("Available commands");
  const state = await page.evaluate(() => (window as unknown as { serialTest: { requests: { op: string }[]; picked: number } }).serialTest);
  expect(state.picked).toBe(1);
  expect(state.requests.map((request) => request.op)).toEqual(["info", "wifi.set", "reboot", "info"]);
  await page.evaluate(() => (window as unknown as { detachBoard: () => void }).detachBoard());
  await expect(page.getByLabel("Network name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Connect board", exact: true })).toBeEnabled();
});

test("reconnection waits for the original USB port without another picker or credential write", async ({ page }) => {
  await serialMock(page, "reboot-delay");
  await connected(page);
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Save Wi-Fi settings" }).click();
  await page.getByRole("button", { name: "Restart board" }).click();
  await expect(page.getByText("Restarting the board and reconnecting automatically…")).toBeVisible();
  await expect(page.getByLabel("Network name")).toBeDisabled();
  await expect(page.getByText("Board reconnected. Wi-Fi is connected to Workshop.")).toBeVisible();
  const state = await page.evaluate(() => (window as unknown as { serialTest: { requests: { op: string }[]; picked: number; opens: number } }).serialTest);
  expect(state.picked).toBe(1);
  expect(state.opens).toBeGreaterThan(2);
  expect(state.requests.filter((request) => request.op === "wifi.set")).toHaveLength(1);
  expect(state.requests.filter((request) => request.op === "reboot")).toHaveLength(1);
});

test("USB reconnects even when the saved Wi-Fi network is unavailable", async ({ page }) => {
  await serialMock(page, "reboot-offline");
  await connected(page);
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Save Wi-Fi settings" }).click();
  await page.getByRole("button", { name: "Restart board" }).click();
  await expect(page.getByText("Board reconnected. Wi-Fi has not joined Workshop yet.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Network name")).toBeEnabled();
  await expect(page.getByText("Online", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Check board" })).toBeEnabled();
});

test("a refused reboot keeps the active console and saved-settings retry available", async ({ page }) => {
  await serialMock(page, "reboot-error");
  await connected(page);
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Save Wi-Fi settings" }).click();
  await page.getByRole("button", { name: "Restart board" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Your Wi-Fi settings are saved");
  await expect(page.getByRole("button", { name: "Restart board" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Disconnect", exact: true })).toBeEnabled();
  const state = await page.evaluate(() => (window as unknown as { serialTest: { opens: number; closed: number } }).serialTest);
  expect(state.opens).toBe(1);
  expect(state.closed).toBe(0);
});

test("a board that does not return offers manual reconnection after a bounded wait", async ({ page }) => {
  await serialMock(page, "reboot-missing");
  await connected(page);
  await page.clock.install();
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Save Wi-Fi settings" }).click();
  await page.getByRole("button", { name: "Restart board" }).click();
  await expect(page.getByText("Restarting the board and reconnecting automatically…")).toBeVisible();
  await page.clock.fastForward(26000);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Your Wi-Fi settings were saved");
  await expect(page.getByRole("button", { name: "Connect board", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Network name")).toBeDisabled();
  await expect(page.getByText("Restarting the board and reconnecting automatically…")).toHaveCount(0);
});

test("console sends a command and disconnect releases the port", async ({ page }) => {
  await serialMock(page);
  await connected(page);
  await page.locator(".setup-console summary").click();
  await page.getByRole("button", { name: "help", exact: true }).click();
  await expect(page.getByLabel("Serial output")).toContainText("Available commands");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByLabel("Console command")).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { serialTest: { closed: number } }).serialTest.closed)).toBe(1);
});

test("opening the console releases both modem signals without resetting firmware", async ({ page }) => {
  await serialMock(page);
  await connected(page);
  const state = await page.evaluate(() => (window as unknown as { serialTest: { signals: SerialOutputSignals[]; resets: number } }).serialTest);
  expect(state.signals).toEqual([{ dataTerminalReady: false, requestToSend: false }]);
  expect(state.resets).toBe(0);
});

test("a board left in download mode can start firmware and unlock Wi-Fi without reinstalling", async ({ page }) => {
  await serialMock(page, "download-mode");
  await page.goto("/setup");
  await page.getByRole("button", { name: "Connect board", exact: true }).click();
  await expect(page.getByText("The board is in download mode.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Start installed firmware" }).click();
  await expect(page.getByLabel("Network name")).toBeEnabled();
  await expect(page.getByText("Board ready. Configure Wi-Fi below.")).toBeVisible();
  await page.locator(".setup-console summary").click();
  await page.getByRole("button", { name: "help", exact: true }).click();
  await expect(page.getByLabel("Serial output")).toContainText("Available commands");
  const state = await page.evaluate(() => (window as unknown as { serialTest: { signals: SerialOutputSignals[]; resets: number; picked: number } }).serialTest);
  expect(state.picked).toBe(1);
  expect(state.resets).toBe(1);
  expect(state.signals.slice(1, 3)).toEqual([
    { dataTerminalReady: false, requestToSend: true },
    { dataTerminalReady: false, requestToSend: false },
  ]);
});

test("startup retries only info until the firmware console is listening", async ({ page }) => {
  await serialMock(page, "download-slow");
  await page.goto("/setup");
  await page.getByRole("button", { name: "Connect board", exact: true }).click();
  await page.getByRole("button", { name: "Start installed firmware" }).click();
  await expect(page.getByText("Waiting for the firmware to start…")).toBeVisible();
  await expect(page.getByLabel("Network name")).toBeDisabled();
  await expect(page.getByLabel("Network name")).toBeEnabled({ timeout: 8000 });
  const requests = await page.evaluate(() => (window as unknown as { serialTest: { requests: { op: string }[] } }).serialTest.requests);
  expect(requests.map((request) => request.op)).toEqual(["info", "info", "info"]);
});

test("legacy firmware allows console access but never receives credentials", async ({ page }) => {
  await serialMock(page, "legacy");
  await page.goto("/setup");
  await page.getByRole("button", { name: "Connect board", exact: true }).click();
  await expect(page.getByText("The nucula console is responding", { exact: false })).toBeVisible({ timeout: 10000 });
  await expect(page.getByLabel("Network name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Review installation" })).toBeEnabled();
});

test("a silent board offers a retry and installer without claiming firmware is absent", async ({ page }) => {
  await serialMock(page, "silent");
  await page.goto("/setup");
  await page.getByRole("button", { name: "Connect board", exact: true }).click();
  await expect(page.getByText("No setup reply yet.", { exact: false })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("button", { name: "Check board" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Review installation" })).toBeEnabled();
});

test("cancelling the port picker recovers without a stuck connecting state", async ({ page }) => {
  await serialMock(page, "cancel");
  await page.goto("/setup");
  await page.getByRole("button", { name: "Connect board", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("No port selected");
  await expect(page.getByRole("button", { name: "Connect board", exact: true })).toBeEnabled();
});

test("an unplug disables controls and clears credentials", async ({ page }) => {
  await serialMock(page);
  await connected(page);
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.evaluate(() => (window as unknown as { detachBoard: () => void }).detachBoard());
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Save Wi-Fi settings" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Connect board", exact: true })).toBeEnabled();
});

test("Wi-Fi storage failure never claims settings were saved", async ({ page }) => {
  await serialMock(page, "save-error");
  await connected(page);
  await page.getByLabel("Password", { exact: true }).fill("not-a-real-password");
  await page.getByRole("button", { name: "Save Wi-Fi settings" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("ESP_ERR_NVS_NOT_ENOUGH_SPACE");
  await expect(page.getByRole("button", { name: "Restart board" })).toHaveCount(0);
});

test("a corrupt download stops before closing the console or opening the bootloader", async ({ page }) => {
  await serialMock(page);
  await page.route("**/firmware/**/*.bin", (route) => route.fulfill({ body: "corrupt", contentType: "application/octet-stream" }));
  await connected(page);
  await page.getByRole("button", { name: "Review update" }).click();
  await expect(page.getByRole("button", { name: "Install firmware", exact: true })).toBeDisabled();
  await page.getByLabel("This is a nucula v2 board.").check();
  await page.getByRole("button", { name: "Install firmware", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Firmware verification failed");
  await expect(page.getByRole("button", { name: "Disconnect", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { serialTest: { closed: number } }).serialTest.closed)).toBe(0);
});

test("configuration remains available when the release server fails", async ({ page }) => {
  await serialMock(page);
  await page.route("**/api/firmware/releases", (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await connected(page);
  await expect(page.getByRole("button", { name: "Save Wi-Fi settings" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Review update" })).toBeDisabled();
});

test("unsupported browsers explain requirements and mobile does not overflow", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, "serial", { value: undefined }); });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/setup");
  await expect(page.getByText("Use Chrome or Edge on a computer", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect board", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("an invalid image followed by a USB drop explains recovery and keeps installation available", async ({ page }) => {
  await serialMock(page, "boot-drop");
  await page.goto("/setup");
  await page.getByRole("button", { name: "Connect board", exact: true }).click();
  await expect(page.getByText("The board cannot boot its firmware", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect board", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Review installation" }).click();
  await page.getByLabel("This is a nucula v2 board.").check();
  await expect(page.getByRole("button", { name: "Install firmware", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Network name")).toBeDisabled();
});

test("installation can request a port directly without a firmware handshake", async ({ page }) => {
  await serialMock(page);
  await page.route("**/firmware/**/*.bin", (route) => route.fulfill({ body: "corrupt", contentType: "application/octet-stream" }));
  await page.goto("/setup");
  await page.getByRole("button", { name: "Review installation" }).click();
  await page.getByLabel("This is a nucula v2 board.").check();
  await page.getByRole("button", { name: "Install firmware", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Firmware verification failed");
  const state = await page.evaluate(() => (window as unknown as { serialTest: { picked: number; requests: unknown[]; closed: number } }).serialTest);
  expect(state.picked).toBe(1);
  expect(state.requests).toEqual([]);
  expect(state.closed).toBe(0);
});

test("recoverable serial errors replace the reader without closing the USB port", async ({ page }) => {
  await serialMock(page);
  await connected(page);
  await page.evaluate(() => (window as unknown as { recoverRead: () => void }).recoverRead());
  await page.locator(".setup-console summary").click();
  await expect(page.getByLabel("Serial output")).toContainText("BufferOverrunError");
  await expect(page.getByRole("button", { name: "Disconnect", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Check board" }).click();
  await expect(page.getByRole("button", { name: "Check board" })).toBeEnabled();
  const state = await page.evaluate(() => (window as unknown as { serialTest: { requests: { op: string }[]; closed: number } }).serialTest);
  expect(state.requests.map((r) => r.op)).toEqual(["info", "info"]);
  expect(state.closed).toBe(0);
});

test("ROM download mode gives installation guidance instead of a generic timeout", async ({ page }) => {
  await serialMock(page, "download-mode");
  await page.goto("/setup");
  await page.getByRole("button", { name: "Connect board", exact: true }).click();
  await expect(page.getByText("The board is in download mode.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review installation" })).toBeEnabled();
});


test("version picker defaults to stable, hides previews and resets installation consent", async ({ page }) => {
  await serialMock(page);
  const preview = { ...stable, id: "2", prerelease: true, release: { ...stable.release, version: "0.2.0-rc.1" } };
  const older = { ...stable, id: "3", release: { ...stable.release, version: "0.0.9" } };
  await page.route("**/api/firmware/releases", (route) => route.fulfill({ json: { candidates: [stable, older, preview] } }));
  await page.goto("/setup");
  const picker = page.getByLabel("Firmware version", { exact: true });
  await expect(picker).toHaveValue("1");
  await expect(picker.locator("option")).toHaveCount(2);
  await page.getByRole("button", { name: "Review installation" }).click();
  await page.getByLabel("This is a nucula v2 board.").check();
  await picker.selectOption("3");
  await expect(page.getByRole("button", { name: "Install firmware", exact: true })).toHaveCount(0);
  await page.getByLabel("Include prereleases and the bundled preview").check();
  await expect(picker).toHaveValue("1");
  await expect(picker.locator("option")).toHaveCount(3);
  await picker.selectOption("2");
  await expect(page.getByText("Preview firmware may be unfinished.", { exact: false })).toBeVisible();
  await page.getByLabel("Include prereleases and the bundled preview").uncheck();
  await expect(picker).toHaveValue("1");
});

test("an empty stable catalog offers previews explicitly and leaves configuration available", async ({ page }) => {
  await serialMock(page);
  await page.route("**/api/firmware/releases", (route) => route.fulfill({ json: { candidates: [{ ...stable, id: "bundled-preview", prerelease: true, release: bundled }], warning: "GitHub releases are temporarily unavailable." } }));
  await connected(page);
  await expect(page.getByRole("button", { name: "Review update" })).toBeDisabled();
  await expect(page.getByLabel("Network name")).toBeEnabled();
  await page.getByLabel("Include prereleases and the bundled preview").check();
  await expect(page.getByRole("button", { name: "Review update" })).toBeEnabled();
});

test("release selection stays locked while downloading firmware", async ({ page }) => {
  await serialMock(page);
  let started!: () => void;
  const downloading = new Promise<void>((resolve) => { started = resolve; });
  await page.route("**/firmware/**/*.bin", async (route) => { started(); await new Promise((resolve) => setTimeout(resolve, 1500)); await route.fulfill({ body: "corrupt" }); });
  await page.goto("/setup");
  await page.getByRole("button", { name: "Review installation" }).click();
  await page.getByLabel("This is a nucula v2 board.").check();
  await page.getByRole("button", { name: "Install firmware", exact: true }).click();
  await downloading;
  await expect(page.getByLabel("Firmware version", { exact: true })).toBeDisabled();
  await expect(page.getByLabel("Include prereleases and the bundled preview")).toBeDisabled();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Firmware verification failed");
  await expect(page.getByLabel("Firmware version", { exact: true })).toBeEnabled();
});


test("an installed firmware with a newer storage format cannot be downgraded", async ({ page }) => {
  await serialMock(page, "incompatible-storage");
  await connected(page);
  await page.getByRole("button", { name: "Review update" }).click();
  await page.getByLabel("This is a nucula v2 board.").check();
  await page.getByRole("button", { name: "Install firmware", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("different wallet storage format");
  await expect(page.getByRole("button", { name: "Disconnect", exact: true })).toBeEnabled();
  const state = await page.evaluate(() => (window as unknown as { serialTest: { picked: number; closed: number } }).serialTest);
  expect(state.picked).toBe(1);
  expect(state.closed).toBe(0);
});
