import { BoardConnection } from "./serial";
import type { DeviceInfo } from "./protocol";

function pause(ms: number, signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

/** Retry only the selected port; never send settings or restart commands again. */
export async function reconnectAfterRestart(
  port: SerialPort,
  output: (text: string) => void,
  lost: (device: BoardConnection, error: Error) => void,
  signal: AbortSignal,
  timeout = 25000,
): Promise<{ device: BoardConnection; info: DeviceInfo }> {
  const deadline = Date.now() + timeout;
  // Firmware acknowledges reboot before its 200 ms restart delay. Do not
  // mistake a reply from that old session for a completed restart.
  await pause(Math.min(500, timeout), signal);
  while (Date.now() < deadline) {
    signal.throwIfAborted();
    let accepted = false;
    let disconnected = false;
    const device = new BoardConnection(port, output, (error) => {
      disconnected = true;
      if (accepted) lost(device, error);
    });
    const abort = () => { void device.close().catch(() => {}); };
    signal.addEventListener("abort", abort, { once: true });
    try {
      await device.open();
      signal.throwIfAborted();
      const info = await device.waitForFirmware(Math.max(1, deadline - Date.now()));
      signal.throwIfAborted();
      if (!disconnected && !info.restart_required) {
        accepted = true;
        return { device, info };
      }
    } catch {
      // The same USB port can briefly disappear or drop its stream on reset.
      // Keep that expected interruption out of the normal disconnect notice.
    } finally {
      signal.removeEventListener("abort", abort);
      if (!accepted) await device.close().catch(() => {});
    }
    await pause(Math.max(0, Math.min(500, deadline - Date.now())), signal);
  }
  throw new Error("The board did not reconnect. Your Wi-Fi settings were saved. Check the USB cable, press RESET, then connect again.");
}
