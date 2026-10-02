import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { checkStorageLayout } from "../lib/setup/flash";
import { validateRelease } from "../lib/setup/release";

// Exercise the actual esptool-js command and SLIP transport, not a mocked
// readFlash/flashMd5sum implementation. The simulated chip only accepts the
// read-only MD5 command (0x13); any bulk read or write fails the test.
for (const installed of [false, true]) {
  test(`storage check uses small checksum replies for ${installed ? "installed" : "blank"} boards`, async () => {
    const { ESPLoader, Transport } = await import("esptool-js");
    const release = validateRelease(JSON.parse(readFileSync("public/firmware/manifest.json", "utf8")));
    const images = release.parts.map((part) => ({ ...part, data: new Uint8Array(readFileSync(`public${part.path}`)) }));
    const memory = new Uint8Array(0x400000).fill(255);
    if (installed) memory.set(images.find((image) => image.offset === 0x8000)!.data, 0x8000);
    const requests: { address: number; size: number }[] = [];
    let received!: ReadableStreamDefaultController<Uint8Array>;
    const readable = new ReadableStream<Uint8Array>({ start(controller) { received = controller; } });
    const writable = new WritableStream<Uint8Array>({
      write(frame) {
        expect(frame[0]).toBe(0xc0);
        expect(frame.at(-1)).toBe(0xc0);
        const bytes: number[] = [];
        for (let i = 1; i < frame.length - 1; i++) {
          bytes.push(frame[i] === 0xdb ? (frame[++i] === 0xdc ? 0xc0 : 0xdb) : frame[i]);
        }
        const packet = Uint8Array.from(bytes);
        expect(packet[0]).toBe(0);
        expect(packet[1]).toBe(0x13);
        expect(packet.length).toBe(24);
        const words = new DataView(packet.buffer);
        const address = words.getUint32(8, true);
        const size = words.getUint32(12, true);
        requests.push({ address, size });
        const digest = createHash("md5").update(memory.subarray(address, address + size)).digest();
        // Stub reply: header, 16-byte digest, two status bytes.
        const response = new Uint8Array(26);
        response.set([1, 0x13, 18, 0]);
        response.set(digest, 8);
        const encoded = transport.slipWriter(response);
        // Deliver in separate USB chunks, including splits inside the header.
        received.enqueue(encoded.slice(0, 5));
        received.enqueue(encoded.slice(5));
      },
    });
    const port = { readable, writable, async open() {}, async close() {}, getInfo: () => ({}) } as unknown as SerialPort;
    const transport = new Transport(port);
    const loader = new ESPLoader({ transport, baudrate: 115200, terminal: { clean() {}, write() {}, writeLine() {} } });
    loader.IS_STUB = true;
    await transport.connect(115200);
    const reading = transport.readLoop();
    try {
      expect(await checkStorageLayout(loader, images, () => {})).toBe(installed ? "update" : "install");
      expect(requests).toEqual(installed
        ? [{ address: 0x8000, size: 0x1000 }]
        : [{ address: 0x8000, size: 0x1000 }, { address: 0x9000, size: 0x26000 }]);
    } finally {
      await transport.disconnect();
      await reading;
    }
  });
}
