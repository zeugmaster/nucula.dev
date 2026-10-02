import { test, expect } from "@playwright/test";
import { reconnectAfterRestart } from "../lib/setup/reconnect";

function board(reply: (attempt: number, request: { id: string; op: string }) => Record<string, unknown> | undefined) {
  let opens = 0;
  const requests: { op: string }[] = [];
  let input = "";
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const port = {
    readable: null as ReadableStream<Uint8Array> | null,
    writable: null as WritableStream<Uint8Array> | null,
    async open() {
      opens++;
      port.readable = new ReadableStream({ start(value) { controller = value; } });
      port.writable = new WritableStream<Uint8Array>({ write(bytes) {
        input += new TextDecoder().decode(bytes);
        let end;
        while ((end = input.indexOf("\r")) >= 0) {
          const line = input.slice(0, end); input = input.slice(end + 1);
          if (!line.startsWith("web ")) continue;
          const request = JSON.parse(line.slice(4));
          requests.push(request);
          const response = reply(opens, request);
          if (response) controller.enqueue(new TextEncoder().encode(`\r\n@NUCULA ${JSON.stringify({ id: request.id, ...response })}\r\n`));
        }
      } });
    },
    async setSignals() {},
    async close() { port.readable = null; port.writable = null; },
  };
  return { port: port as unknown as SerialPort, requests, opens: () => opens };
}

test("reconnection rejects an old session that still requires a restart", async () => {
  const fake = board((attempt) => ({
    ok: true, protocol: 1, board: "nucula-v2", version: "test", storage_ready: true,
    configured: true, connected: true, restart_required: attempt === 1,
    ssid: attempt === 1 ? "Old network" : "New network", ip: "192.168.1.5",
  }));
  const result = await reconnectAfterRestart(fake.port, () => {}, () => {}, new AbortController().signal, 3000);
  try {
    expect(result.info.ssid).toBe("New network");
    expect(fake.opens()).toBe(2);
    expect(fake.requests.map((request) => request.op)).toEqual(["info", "info"]);
  } finally { await result.device.close(); }
});

test("leaving setup cancels pending replies, releases USB and stops reconnect attempts", async () => {
  const controller = new AbortController();
  const fake = board(() => { controller.abort(); return undefined; });
  await expect(reconnectAfterRestart(fake.port, () => {}, () => {}, controller.signal)).rejects.toThrow();
  expect(fake.port.readable).toBeNull();
  expect(fake.port.writable).toBeNull();
  expect(fake.opens()).toBe(1);
  expect(fake.requests.map((request) => request.op)).toEqual(["info"]);
});
