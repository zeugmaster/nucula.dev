import { createHash } from "node:crypto";
import { assetPath, validateRelease, type FirmwareCandidate } from "../setup/release";

export const REPOSITORY = "zeugmaster/nucula";
export const STORAGE_SCHEMA = "nucula-nvs-v1";
const API = `https://api.github.com/repos/${REPOSITORY}`;
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(alpha|beta|rc)\.(0|[1-9]\d*))?$/;
export function isVersion(value: string) { return value.length <= 31 && versionPattern.test(value); }
export function compareVersions(a: string, b: string) {
  const x = versionPattern.exec(a), y = versionPattern.exec(b);
  if (!x || !y) return 0;
  for (const i of [1, 2, 3]) { const difference = Number(x[i]) - Number(y[i]); if (difference) return difference; }
  const rank = (stage: string) => ["alpha", "beta", "rc", undefined].indexOf(stage);
  return rank(x[4]) - rank(y[4]) || Number(x[5] ?? 0) - Number(y[5] ?? 0);
}

type Asset = { id: number; name: string; size: number; state: string; digest?: string };
export type GitHubRelease = { id: number; tag_name: string; draft: boolean; prerelease: boolean; published_at: string; body: string | null; assets: Asset[] };
type File = { file: string; size: number; sha256: string };
type Manifest = { schema: number; board: string; chip: string; version: string; flash_size: number; hardware: string[]; setup_protocol: number; storage_schema: string; source_commit: string; idf_version: string; source: File; parts: (File & { offset: number; md5: string })[] };
export class InvalidRelease extends Error {}
const invalid = () => new InvalidRelease("Incomplete or incompatible firmware release.");

function releaseVersion(release: GitHubRelease) {
  const version = release.tag_name?.replace(/^v/, "");
  if (!Number.isSafeInteger(release.id) || release.id <= 0 || release.draft || !release.published_at ||
      !version || !isVersion(version) || release.prerelease !== version.includes("-") || !Array.isArray(release.assets)) throw invalid();
  return version;
}
function getAsset(release: GitHubRelease, name: string) {
  const matches = release.assets.filter((asset) => asset.name === name);
  if (matches.length !== 1 || matches[0].state !== "uploaded" || !Number.isSafeInteger(matches[0].id) || matches[0].id <= 0) throw invalid();
  return matches[0];
}
export function resolveManifest(release: GitHubRelease, value: unknown) {
  const version = releaseVersion(release);
  const manifest = value as Manifest;
  if (!manifest || manifest.schema !== 2 || manifest.board !== "nucula-v2" || manifest.chip !== "ESP32-C3" ||
      !/^[a-f0-9]{40}$/.test(manifest.source_commit) || manifest.idf_version !== "5.5.1" || manifest.version !== version || manifest.flash_size !== 4194304 || manifest.setup_protocol !== 1 ||
      manifest.storage_schema !== STORAGE_SCHEMA || !Array.isArray(manifest.hardware) || !manifest.hardware.includes("rev-a") ||
      !Array.isArray(manifest.parts) || manifest.parts.length !== 3) throw invalid();
  const files = new Map<string, { asset: Asset; file: File }>();
  function resolve(file: File, expected: string, limit: number) {
    if (!file || file.file !== expected || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > limit || !/^[a-f0-9]{64}$/.test(file.sha256)) throw invalid();
    const asset = getAsset(release, file.file);
    if (asset.size !== file.size || (asset.digest && asset.digest !== `sha256:${file.sha256}`)) throw invalid();
    files.set(file.file, { asset, file });
    return assetPath(release.id, file.sha256, file.file);
  }
  const source = resolve(manifest.source, "source.tar.gz", 32 * 1024 * 1024);
  const names = new Map([[0, ["bootloader.bin", 0x8000]], [0x8000, ["partition-table.bin", 0x1000]], [0x30000, ["nucula.bin", 0x1d0000]]] as const);
  const parts = manifest.parts.map((part) => {
    const spec = names.get(part?.offset as 0 | 0x8000 | 0x30000);
    if (!spec) throw invalid();
    return { ...part, path: resolve(part, spec[0], spec[1]) };
  });
  let normalized;
  try { normalized = validateRelease({ schema: 1, board: manifest.board, chip: manifest.chip, version, source,
    notes: (release.body ?? "").slice(0, 4000), parts }); } catch { throw invalid(); }
  const candidate: FirmwareCandidate = { id: String(release.id), prerelease: release.prerelease, publishedAt: release.published_at,
    url: `https://github.com/${REPOSITORY}/releases/tag/${release.tag_name}`, release: normalized };
  return { candidate, files };
}

// Bounded reads prevent a mislabeled asset from exhausting the server's memory.
async function readBytes(response: Response, maximum: number) {
  if (!response.ok || !response.body) throw new Error("GitHub firmware download is unavailable.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) throw invalid();
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks, size);
}

export class GitHubFirmware {
  constructor(private token?: string, private request: typeof fetch = fetch) {}
  private async api(path: string, binary = false, cacheDownload = false) {
    const headers: Record<string, string> = { Accept: binary ? "application/octet-stream" : "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const options = { headers, redirect: "manual", signal: AbortSignal.timeout(15000), next: { revalidate: binary && !cacheDownload ? 0 : 300 } } as RequestInit;
    const response = await this.request(`${API}${path}`, options);
    if (binary && [301, 302, 307].includes(response.status)) {
      const location = new URL(response.headers.get("location") ?? "", API);
      if (location.protocol !== "https:" || !["release-assets.githubusercontent.com", "objects.githubusercontent.com"].includes(location.hostname) || location.username || location.password) throw invalid();
      // Credentials are only sent to api.github.com, never to the download host.
      return this.request(location.href, { redirect: "error", signal: AbortSignal.timeout(60000), ...(cacheDownload ? { next: { revalidate: 300 } } : { cache: "no-store" as const }) });
    }
    return response;
  }
  private async json(path: string) {
    return JSON.parse((await readBytes(await this.api(path), 4 * 1024 * 1024)).toString("utf8"));
  }
  private async resolve(release: GitHubRelease) {
    releaseVersion(release);
    const manifest = getAsset(release, "manifest.json");
    if (manifest.size < 1 || manifest.size > 65536) throw invalid();
    const bytes = await readBytes(await this.api(`/releases/assets/${manifest.id}`, true, true), 65536);
    if (bytes.length !== manifest.size || (manifest.digest && `sha256:${createHash("sha256").update(bytes).digest("hex")}` !== manifest.digest)) throw invalid();
    let value;
    try { value = JSON.parse(bytes.toString("utf8")); } catch { throw invalid(); }
    return resolveManifest(release, value);
  }
  async catalog() {
    const releases: GitHubRelease[] = [];
    // GitHub's listing is chronological; sort compatible semantic versions ourselves.
    for (let page = 1; page <= 3; page++) {
      const batch = await this.json(`/releases?per_page=100&page=${page}`) as GitHubRelease[];
      if (!Array.isArray(batch)) throw new Error("GitHub release listing is unavailable.");
      releases.push(...batch);
      if (batch.length < 100) break;
    }
    const compatible = releases.filter((release) => { try { releaseVersion(release); getAsset(release, "manifest.json"); return true; } catch { return false; } })
      .sort((a, b) => Number(a.prerelease) - Number(b.prerelease) || compareVersions(b.tag_name.replace(/^v/, ""), a.tag_name.replace(/^v/, "")));
    const eligible = [...compatible.filter((release) => !release.prerelease).slice(0, 20), ...compatible.filter((release) => release.prerelease).slice(0, 10)];
    const candidates: FirmwareCandidate[] = [];
    let unavailable = false;
    for (let i = 0; i < eligible.length; i += 5) {
      const results = await Promise.allSettled(eligible.slice(i, i + 5).map((release) => this.resolve(release)));
      for (const result of results) {
        if (result.status === "fulfilled") candidates.push(result.value.candidate);
        else if (!(result.reason instanceof InvalidRelease)) unavailable = true;
      }
    }
    return { candidates, ...(unavailable ? { warning: "Some GitHub releases could not be checked. Try refreshing later." } : {}) };
  }
  async asset(releaseId: string, sha256: string, name: string) {
    if (!/^[1-9]\d{0,15}$/.test(releaseId) || !/^[a-f0-9]{64}$/.test(sha256) || !["bootloader.bin", "partition-table.bin", "nucula.bin", "source.tar.gz"].includes(name)) throw invalid();
    const release = await this.json(`/releases/${releaseId}`) as GitHubRelease;
    if (String(release.id) !== releaseId) throw invalid();
    const resolved = await this.resolve(release);
    const entry = resolved.files.get(name);
    if (!entry || entry.file.sha256 !== sha256) throw invalid();
    const bytes = await readBytes(await this.api(`/releases/assets/${entry.asset.id}`, true), entry.file.size);
    if (bytes.length !== entry.file.size || createHash("sha256").update(bytes).digest("hex") !== sha256) throw invalid();
    return bytes;
  }
}
