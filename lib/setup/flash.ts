import { md5 } from "@noble/hashes/legacy.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { FirmwareImage } from "./release";
import type { ESPLoader } from "esptool-js";
import { startFirmware } from "./serial";

export type FlashProgress = { percent: number; message: string };

export type FlashLoader = Pick<ESPLoader, "chip" | "getSecurityInfo" | "detectFlashSize" | "writeFlash" | "flashMd5sum">;

// Use the stub's checksum command instead of esptool-js 0.7.0 readFlash:
// that stream leaves its final digest unread and can stall between reads.
// MD5 is the device protocol's corruption check, not release authentication.
async function storageDigest(loader: FlashLoader, address: number, size: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const digest = await Promise.race([
      loader.flashMd5sum(address, size),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("The board’s storage check timed out.")), 10000);
      }),
    ]);
    if (!/^[a-f0-9]{32}$/i.test(digest)) throw new Error("The board returned an invalid storage checksum.");
    return digest.toLowerCase();
  } catch (error) {
    throw new Error("Could not check the board’s storage. Nothing was written. Hold BOOT, tap RESET, release BOOT, then retry installation.", { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkStorageLayout(loader: FlashLoader, images: FirmwareImage[], progress: (value: FlashProgress) => void): Promise<"install" | "update"> {
  progress({ percent: 0, message: "Checking the board’s storage layout…" });
  const blankTable = new Uint8Array(0x1000).fill(0xff);
  const tableDigest = await storageDigest(loader, 0x8000, blankTable.length);
  if (tableDigest === bytesToHex(md5(blankTable))) {
    // A missing table alone does not prove that a wallet is absent. Check the
    // entire NVS region on-device; wallet contents never cross the USB cable.
    progress({ percent: 0, message: "Checking that wallet storage is empty…" });
    const blankStorage = new Uint8Array(0x26000).fill(0xff);
    if (await storageDigest(loader, 0x9000, blankStorage.length) !== bytesToHex(md5(blankStorage)))
      throw new Error("The partition table is empty, but wallet storage contains data. Installation stopped to preserve it.");
    return "install";
  }
  const expectedTable = images.find((image) => image.offset === 0x8000)?.data;
  if (!expectedTable || expectedTable.length > blankTable.length) throw new Error("The release has an invalid partition table. Nothing was written.");
  blankTable.set(expectedTable);
  // Include the erased tail of the sector, not just the table image itself.
  if (tableDigest === bytesToHex(md5(blankTable))) return "update";
  throw new Error("This board has a different storage layout. Installation stopped to protect its wallet. Use the firmware repository’s recovery instructions.");
}

export async function writeFirmware(loader: FlashLoader, images: FirmwareImage[], progress: (value: FlashProgress) => void) {
  if (loader.chip?.CHIP_NAME !== "ESP32-C3") throw new Error("This is not an ESP32-C3. Nothing was written. Select your nucula v2 board.");
  const security = await loader.getSecurityInfo();
  if (security.parsedFlags.SECURE_BOOT_EN || security.parsedFlags.SECURE_DOWNLOAD_ENABLE || security.flashCryptCnt !== 0)
    throw new Error("This board has security provisioning that this installer does not support. Nothing was written.");
  if (await loader.detectFlashSize() !== "4MB") throw new Error("Expected the nucula v2’s 4 MB flash. Nothing was written.");
  const plan = await checkStorageLayout(loader, images, progress);
  const files = plan === "update" ? images.filter((p) => p.offset === 0x30000) : [...images].sort((a, b) => a.offset - b.offset);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  progress({ percent: 0, message: "Writing firmware. Keep the USB cable connected." });
  await loader.writeFlash({
    fileArray: files.map((file) => ({ address: file.offset, data: file.data })),
    flashMode: "keep", flashFreq: "keep", flashSize: "keep", eraseAll: false, compress: true,
    reportProgress: (index, written, total) => {
      const before = files.slice(0, index).reduce((sum, file) => sum + file.size, 0);
      progress({ percent: Math.min(99, Math.round((before + files[index].size * written / total) / totalSize * 100)), message: "Writing firmware. Keep the USB cable connected." });
    },
  });
  progress({ percent: 99, message: "Verifying the firmware on your board…" });
  for (const file of files) {
    if ((await loader.flashMd5sum(file.offset, file.size)).toLowerCase() !== file.md5)
      throw new Error("The board’s firmware did not verify. Keep the board connected and retry the installation.");
  }
  progress({ percent: 100, message: "Firmware installed and verified." });
}

export async function flashBoard(port: SerialPort, images: FirmwareImage[], progress: (value: FlashProgress) => void, log: (text: string) => void) {
  const { ESPLoader, Transport } = await import("esptool-js");
  const transport = new Transport(port, false);
  const loader = new ESPLoader({ transport, baudrate: 115200, debugLogging: false,
    terminal: { clean() {}, write: log, writeLine: (line) => log(line + "\n") } });
  try {
    progress({ percent: 0, message: "Connecting to the bootloader…" });
    await loader.main();
    await writeFirmware(loader, images, progress);
    // Flash success is separate from native USB re-enumeration after reset.
    try { await startFirmware(port); }
    catch { log("Firmware verified. Press RESET before reconnecting.\n"); }
  } finally {
    await transport.disconnect().catch(() => {});
  }
}
