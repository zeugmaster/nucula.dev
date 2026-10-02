import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { validateRelease, type FirmwareImage } from "../lib/setup/release";
import { writeFirmware, type FlashLoader } from "../lib/setup/flash";
import { wifiFields, consoleCommand, isDeviceInfo } from "../lib/setup/protocol";
import type { FlashOptions } from "esptool-js";

const release = () => validateRelease(JSON.parse(readFileSync("public/firmware/manifest.json", "utf8")));
const images = (): FirmwareImage[] => release().parts.map((part) => ({ ...part, data: new Uint8Array(readFileSync(`public${part.path}`)) }));
const table = () => {
  const data = new Uint8Array(4096).fill(255);
  data.set(images().find((part) => part.offset === 0x8000)!.data);
  return data;
};

function fakeLoader(options: { blank?: boolean; occupied?: boolean; mismatch?: boolean; dirtyTail?: boolean; chip?: string; secured?: boolean; badHash?: boolean; size?: string; storageHash?: string; storageError?: boolean } = {}) {
  const writes: FlashOptions[] = [];
  const checks: { address: number; size: number }[] = [];
  const loader = {
    chip: { CHIP_NAME: options.chip ?? "ESP32-C3" },
    async getSecurityInfo() { return { flashCryptCnt: options.secured ? 1 : 0, parsedFlags: {} }; },
    async detectFlashSize() { return options.size ?? "4MB"; },
    async writeFlash(value: FlashOptions) { writes.push(value); },
    async flashMd5sum(address: number, size: number) {
      if (writes.length) return options.badHash ? "invalid" : images().find((part) => part.offset === address)!.md5;
      checks.push({ address, size });
      if (options.storageError) throw new Error("Serial data stream stopped");
      if (options.storageHash !== undefined) return options.storageHash;
      const data = address === 0x8000
        ? options.blank ? new Uint8Array(size).fill(255) : options.mismatch ? new Uint8Array(size) : table()
        : new Uint8Array(size).fill(255);
      if (address === 0x8000 && options.dirtyTail) data[data.length - 1] = 0;
      if (address === 0x9000 && options.occupied) data[data.length - 1] = 0;
      return createHash("md5").update(data).digest("hex");
    },
  } as unknown as FlashLoader;
  return { loader, writes, checks };
}

test("release assets match every hash and fit their allowed partitions", () => {
  for (const file of images()) {
    expect(file.data.length).toBe(file.size);
    expect(createHash("sha256").update(file.data).digest("hex")).toBe(file.sha256);
    expect(createHash("md5").update(file.data).digest("hex")).toBe(file.md5);
  }
});

test("release validation rejects an NVS write, duplicate regions and remote URLs", () => {
  for (const update of [{ offset: 0x9000 }, { offset: 0x30000 }, { path: "https://example.com/image.bin" }, { path: "/firmware/../image.bin" }, { size: 0x9000 }]) {
    const value = release();
    Object.assign(value.parts[0], update);
    expect(() => validateRelease(value)).toThrow();
  }
});

test("an update only writes the application and never erases the entire flash", async () => {
  const { loader, writes, checks } = fakeLoader();
  const progress: number[] = [];
  await writeFirmware(loader, images(), (state) => progress.push(state.percent));
  expect(writes).toHaveLength(1);
  expect(writes[0].eraseAll).toBe(false);
  expect(writes[0].fileArray.map((file) => file.address)).toEqual([0x30000]);
  expect(checks).toEqual([{ address: 0x8000, size: 0x1000 }]);
  expect(progress.at(-1)).toBe(100);
});

test("blank installation checks wallet storage and writes three separate regions", async () => {
  const { loader, writes, checks } = fakeLoader({ blank: true });
  const messages: string[] = [];
  await writeFirmware(loader, images(), (state) => messages.push(state.message));
  expect(checks).toEqual([{ address: 0x8000, size: 0x1000 }, { address: 0x9000, size: 0x26000 }]);
  expect(messages).toContain("Checking that wallet storage is empty…");
  expect(writes[0].fileArray.map((file) => file.address)).toEqual([0, 0x8000, 0x30000]);
  expect(writes[0].eraseAll).toBe(false);
});

for (const [name, options] of Object.entries({
  "unknown layout": { mismatch: true },
  "data in the partition sector’s erased tail": { dirtyTail: true },
  "orphaned wallet storage": { blank: true, occupied: true },
  "an incomplete storage checksum": { storageHash: "abcdef" },
  "a disconnected board during the storage check": { storageError: true },
  "wrong chip": { chip: "ESP32-S3" },
  "secured board": { secured: true },
  "wrong flash size": { size: "2MB" },
})) {
  test(`refuses ${name} before any write`, async () => {
    const { loader, writes } = fakeLoader(options);
    await expect(writeFirmware(loader, images(), () => {})).rejects.toThrow();
    expect(writes).toHaveLength(0);
  });
}

test("a readback hash mismatch never reports success", async () => {
  const { loader } = fakeLoader({ badHash: true });
  const progress: number[] = [];
  await expect(writeFirmware(loader, images(), (state) => progress.push(state.percent))).rejects.toThrow("did not verify");
  expect(progress).not.toContain(100);
});

test("a timed-out storage check cannot resume flashing when a late reply arrives", async () => {
  const { loader, writes } = fakeLoader({ blank: true });
  let reply!: (digest: string) => void;
  loader.flashMd5sum = () => new Promise<string>((resolve) => { reply = resolve; });
  const started = Date.now();
  await expect(writeFirmware(loader, images(), () => {})).rejects.toThrow("Nothing was written. Hold BOOT");
  expect(Date.now() - started).toBeLessThan(12000);
  reply(createHash("md5").update(new Uint8Array(0x1000).fill(255)).digest("hex"));
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(writes).toHaveLength(0);
});

test("Wi-Fi encoding preserves spaces and UTF-8 and rejects control injection", () => {
  const encoded = wifiFields(' Café "home" ', "pass word123");
  expect(Buffer.from(encoded.ssid_hex, "hex").toString()).toBe(' Café "home" ');
  expect(Buffer.from(encoded.password_hex, "hex").toString()).toBe("pass word123");
  expect(wifiFields("open", "").password_hex).toBe("");
  expect(() => wifiFields("é".repeat(17), "12345678")).toThrow("UTF-8");
  expect(() => wifiFields("home", "short")).toThrow();
  expect(() => wifiFields("home\rreboot", "12345678")).toThrow();
});

test("console forbids multiline commands and counts UTF-8 bytes", () => {
  expect(consoleCommand("help")).toBe("help\r");
  expect(() => consoleCommand("help\nseed wipe")).toThrow();
  expect(() => consoleCommand("é".repeat(2048))).toThrow("too long");
  expect(isDeviceInfo({ protocol: 1, board: "other-board" })).toBe(false);
});
