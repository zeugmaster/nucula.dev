export type FirmwarePart = { path: string; offset: number; size: number; sha256: string; md5: string };
export type FirmwareRelease = {
  schema: 1;
  board: "nucula-v2";
  chip: "ESP32-C3";
  version: string;
  notes: string;
  source: string;
  parts: FirmwarePart[];
};
export type FirmwareImage = FirmwarePart & { data: Uint8Array };

export function validateRelease(value: unknown): FirmwareRelease {
  const r = value as FirmwareRelease;
  if (!r || r.schema !== 1 || r.board !== "nucula-v2" || r.chip !== "ESP32-C3" ||
      typeof r.version !== "string" || typeof r.notes !== "string" || typeof r.source !== "string" ||
      !/^\/firmware\/[a-zA-Z0-9_.-]+\/source\.tar\.gz$/.test(r.source) || r.source.includes("..") ||
      !Array.isArray(r.parts) || r.parts.length !== 3)
    throw new Error("This firmware release is not compatible with nucula v2.");
  const limits = new Map([[0, 0x8000], [0x8000, 0x1000], [0x30000, 0x1d0000]]);
  const seen = new Set<number>();
  for (const p of r.parts) {
    if (!p || !limits.has(p.offset) || seen.has(p.offset) || !Number.isInteger(p.size) || p.size <= 0 ||
        p.size > limits.get(p.offset)! || !/^\/firmware\/[a-zA-Z0-9_./-]+\.bin$/.test(p.path) ||
        p.path.includes("..") || !/^[a-f0-9]{64}$/.test(p.sha256) || !/^[a-f0-9]{32}$/.test(p.md5))
      throw new Error("The release contains an invalid image or unsafe flash address.");
    seen.add(p.offset);
  }
  return r;
}

export async function loadRelease(signal?: AbortSignal): Promise<FirmwareRelease> {
  const response = await fetch("/firmware/manifest.json", { cache: "no-store", signal });
  if (!response.ok) throw new Error("Firmware download is unavailable. You can still connect and configure an installed board.");
  return validateRelease(await response.json());
}

export async function downloadImages(release: FirmwareRelease): Promise<FirmwareImage[]> {
  validateRelease(release);
  return Promise.all(release.parts.map(async (part) => {
    const response = await fetch(part.path, { cache: "no-store", signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error("Firmware download failed. Check your connection and try again.");
    const data = new Uint8Array(await response.arrayBuffer());
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)), (v) => v.toString(16).padStart(2, "0")).join("");
    if (data.length !== part.size || hash !== part.sha256)
      throw new Error("Firmware verification failed. Nothing has been written. Reload the page and try again.");
    return { ...part, data };
  }));
}
