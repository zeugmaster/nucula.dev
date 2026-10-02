import { consoleCommand, FRAME_PREFIX, isDeviceInfo, type DeviceInfo } from "./protocol";

type Reply = Record<string, unknown>;
type Pending = { resolve: (reply: Reply) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

class SetupTimeoutError extends Error {}

/** Leave the bootloader and start the application on native USB Serial/JTAG. */
export async function startFirmware(port: SerialPort) {
  // esptool-js 0.7.0's HardReset only releases RTS; it never asserts reset.
  // Keep DTR inactive so the reset starts the application, not download mode.
  await port.setSignals({ dataTerminalReady: false, requestToSend: true });
  try { await new Promise((resolve) => setTimeout(resolve, 100)); }
  finally { await port.setSignals({ dataTerminalReady: false, requestToSend: false }); }
}

export type BootState = "invalid-image" | "download-mode";

export function bootGuidance(state: BootState) {
  return state === "invalid-image"
    ? "The board cannot boot its firmware: it reports an invalid image header. Use Install firmware below. If USB keeps reconnecting, hold BOOT, tap RESET, release BOOT, then select the port."
    : "The board is in download mode. Use Install firmware below, or press RESET to try starting existing firmware.";
}

/** One owner for a port. The flasher takes over only after close() completes. */
export class BoardConnection {
  private reader?: ReadableStreamDefaultReader<Uint8Array>;
  private reading?: Promise<void>;
  private closing = false;
  private buffer = "";
  private pending = new Map<string, Pending>();
  private writing: Promise<void> = Promise.resolve();
  private protocolReady = false;
  sawConsole = false;
  bootState: BootState | null = null;

  constructor(readonly port: SerialPort, private output: (text: string) => void, private lost: (error: Error) => void) {}

  async open() {
    await this.port.open({ baudRate: 115200, bufferSize: 16384 });
    this.reading = this.readLoop();
    // Do not inherit asserted modem signals from the flasher or OS driver.
    // Release both without pulsing reset or entering download mode.
    await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
    await this.write("\x03\r");
  }

  private async readLoop() {
    let decoder = new TextDecoder();
    let failure = new Error("The USB serial stream ended. Reconnect the board to continue.");
    try {
      // Web Serial replaces the readable stream after a recoverable error
      // (e.g. buffer overflow). Only a fatal error removes the port's stream.
      while (!this.closing && this.port.readable) {
        const stream = this.port.readable;
        this.reader = stream.getReader();
        let readError: unknown;
        try {
          while (!this.closing) {
            const { value, done } = await this.reader.read();
            if (done) break;
            this.receive(decoder.decode(value, { stream: true }));
          }
        } catch (error) {
          readError = error;
          failure = error instanceof Error ? error : new Error("USB read failed.");
        } finally {
          this.reader.releaseLock();
          this.reader = undefined;
        }
        if (this.closing) break;
        if (readError && this.port.readable && this.port.readable !== stream) {
          // Bytes may have been lost. Discard partial frames and fail requests
          // explicitly instead of joining data from opposite sides of the gap.
          this.buffer = "";
          decoder = new TextDecoder();
          this.rejectPending(new Error("USB input was interrupted. The connection recovered; click Check board to retry."));
          this.output(`[USB] ${failure.name}: ${failure.message} Recovered; listening again.\n`);
          continue;
        }
        break;
      }
    } catch (error) {
      failure = error instanceof Error ? error : failure;
    } finally {
      this.rejectPending();
      if (!this.closing) {
        this.closing = true;
        await this.port.close().catch(() => {});
        this.lost(new Error(this.bootState ? bootGuidance(this.bootState)
          : `USB connection lost (${failure.name}: ${failure.message}). Reconnect the board to continue.`));
      }
    }
  }

  private receive(text: string) {
    this.buffer += text;
    const output: string[] = [];
    let newline;
    while ((newline = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, newline).replace(/\r/g, "");
      this.buffer = this.buffer.slice(newline + 1);
      const bootState = /invalid header:\s*0x[0-9a-f]+/i.test(line) ? "invalid-image"
        : /waiting for download|DOWNLOAD_BOOT/i.test(line) ? "download-mode" : null;
      if (bootState && bootState !== this.bootState) {
        this.bootState = bootState;
        this.rejectPending(new Error(bootGuidance(bootState)));
      } else if (line.includes("nucula>")) {
        this.sawConsole = true;
        this.bootState = null;
      }
      const marker = line.indexOf(FRAME_PREFIX);
      if (marker !== -1) {
        try {
          const reply: Reply = JSON.parse(line.slice(marker + FRAME_PREFIX.length));
          const pending = this.pending.get(String(reply.id));
          if (pending) {
            clearTimeout(pending.timer);
            this.pending.delete(String(reply.id));
            if (reply.ok === true) pending.resolve(reply);
            else pending.reject(new Error(`Board: ${String(reply.error ?? "request failed")}`));
          }
        } catch { /* A partial or unrelated log line is not a protocol reply. */ }
      } else if (!line.includes("web ")) {
        output.push(line + "\n");
      }
    }
    // The interactive prompt normally has no trailing newline. It also marks
    // a successful manual reset from download mode back into the application.
    if (this.buffer.includes("nucula>")) { this.sawConsole = true; this.bootState = null; }
    if (this.buffer.length > 8192) this.buffer = this.buffer.slice(-4096);
    if (output.length) this.output(output.join(""));
  }

  private write(data: string) {
    const write = async () => {
      if (this.closing || !this.port.writable) throw new Error("Board disconnected. Connect it again.");
      const writer = this.port.writable.getWriter();
      try { await writer.write(new TextEncoder().encode(data)); }
      finally { writer.releaseLock(); }
    };
    const next = this.writing.then(write);
    this.writing = next.catch(() => {});
    return next;
  }

  async request(op: string, fields: Record<string, string> = {}, timeout = 5000): Promise<Reply> {
    if (op !== "info" && !this.protocolReady) throw new Error("Check the firmware before sending setup details.");
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new SetupTimeoutError("No setup reply yet. The board may still be starting, have older firmware, or be in download mode."));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      void this.write(consoleCommand(`web ${JSON.stringify({ id, op, ...fields })}`)).catch((error) => {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      });
    });
  }

  async info(timeout = 5000): Promise<DeviceInfo> {
    if (this.bootState) throw new Error(bootGuidance(this.bootState));
    const reply = await this.request("info", {}, timeout);
    if (!isDeviceInfo(reply)) throw new Error("This firmware uses an unsupported setup protocol. Install the available firmware to configure it here.");
    this.protocolReady = true;
    return reply;
  }

  async waitForFirmware(timeout = 20000): Promise<DeviceInfo> {
    // The USB peripheral can enumerate before the application installs its
    // console driver. Retry info only; never replay a configuration command.
    const deadline = Date.now() + timeout;
    for (;;) {
      try { return await this.info(Math.min(2000, deadline - Date.now())); }
      catch (error) {
        if (!(error instanceof SetupTimeoutError) || this.closing || Date.now() >= deadline) throw error;
      }
    }
  }

  async command(command: string) {
    await this.write(consoleCommand(command));
  }

  private rejectPending(error = new Error("Board disconnected. Connect it again.")) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    this.protocolReady = false;
  }

  async close() {
    this.closing = true;
    this.rejectPending();
    await this.reader?.cancel().catch(() => {});
    await this.reading;
    await this.writing;
    if (this.port.readable || this.port.writable) await this.port.close();
  }
}
