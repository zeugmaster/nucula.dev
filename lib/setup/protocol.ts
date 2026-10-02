export const FRAME_PREFIX = "@NUCULA ";
export const MAX_CONSOLE_BYTES = 4094;

export type DeviceInfo = {
  protocol: 1;
  board: "nucula-v2";
  version: string;
  storage_ready: boolean;
  configured: boolean;
  connected: boolean;
  restart_required: boolean;
  ssid: string;
  ip: string;
};

export function isDeviceInfo(value: unknown): value is DeviceInfo {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return d.protocol === 1 && d.board === "nucula-v2" &&
    ["version", "ssid", "ip"].every((k) => typeof d[k] === "string") &&
    ["storage_ready", "configured", "connected", "restart_required"].every((k) => typeof d[k] === "boolean");
}

export function wifiFields(ssid: string, password: string) {
  const bytes = (s: string) => new TextEncoder().encode(s);
  if (/[\x00-\x1f\x7f]/.test(ssid + password)) throw new Error("Wi-Fi details cannot contain control characters.");
  if (bytes(ssid).length < 1 || bytes(ssid).length > 32) throw new Error("Network name must be 1–32 UTF-8 bytes.");
  if (password && (bytes(password).length < 8 || bytes(password).length > 63))
    throw new Error("Wi-Fi password must be 8–63 UTF-8 bytes, or empty for an open network.");
  const hex = (s: string) => Array.from(bytes(s), (b) => b.toString(16).padStart(2, "0")).join("");
  return { ssid_hex: hex(ssid), password_hex: hex(password) };
}

export function consoleCommand(command: string) {
  // One submitted line must never turn into multiple commands on the device.
  if (/[\x00-\x1f\x7f]/.test(command)) throw new Error("Send one command at a time, without control characters.");
  if (new TextEncoder().encode(command).length > MAX_CONSOLE_BYTES)
    throw new Error("This command is too long for the board’s console.");
  return command + "\r";
}

export function readableError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotFoundError") return "No port selected. Connect your board and try again.";
    if (error.name === "SecurityError") return "USB access was blocked. Open this page directly in Chrome or Edge over HTTPS.";
    if (error.name === "NetworkError" || error.name === "InvalidStateError")
      return "The USB port is unavailable. Close other serial monitors or browser tabs, reconnect the cable, then try again.";
  }
  return error instanceof Error ? error.message : "The board did not respond. Reconnect it and try again.";
}
