import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { GitHubFirmware, compareVersions, resolveManifest, type GitHubRelease } from "../lib/firmware/github";
import bundled from "../public/firmware/manifest.json";

function fixture(version = "0.1.0", id = 1) {
  const files = bundled.parts.map((part) => ({ ...part, file: part.path.split("/").at(-1)! }));
  const sourceBytes = readFileSync(`public${bundled.source}`);
  const source = { file: "source.tar.gz", size: sourceBytes.length, sha256: createHash("sha256").update(sourceBytes).digest("hex") };
  const manifest = { schema: 2, board: "nucula-v2", chip: "ESP32-C3", version, flash_size: 4194304, hardware: ["rev-a"], setup_protocol: 1,
    storage_schema: "nucula-nvs-v1", source_commit: "a".repeat(40), idf_version: "5.5.1", source, parts: files };
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  const release: GitHubRelease = { id, tag_name: `v${version}`, draft: false, prerelease: version.includes("-"), published_at: "2026-10-02T00:00:00Z", body: "Release notes",
    assets: [...files, source, { file: "manifest.json", size: manifestBytes.length, sha256: createHash("sha256").update(manifestBytes).digest("hex") }]
      .map((file, index) => ({ id: id * 10 + index, name: file.file, size: file.size, state: "uploaded", digest: `sha256:${file.sha256}` })) };
  return { release, manifest, manifestBytes };
}

test("release contract binds compatible files to content-addressed local URLs", () => {
  const { release, manifest } = fixture();
  const resolved = resolveManifest(release, manifest);
  expect(resolved.candidate.release.parts[2].path).toBe(`/api/firmware/assets/1/${manifest.parts[2].sha256}/nucula.bin`);
  expect(resolved.files.size).toBe(4);
});

test("drafts, missing assets, unsafe layouts and mismatched compatibility are rejected", () => {
  for (const update of [{ schema: 1 }, { board: "other" }, { chip: "ESP32-S3" }, { flash_size: 8388608 }, { version: "0.2.0" }, { hardware: ["rev-b"] }, { setup_protocol: 2 }, { storage_schema: "nucula-nvs-v2" }]) {
    const { release, manifest } = fixture();
    expect(() => resolveManifest(release, { ...manifest, ...update })).toThrow();
  }
  for (const kind of ["draft", "missing", "duplicate", "size", "digest", "prerelease", "nvs", "remote", "duplicate-region"]) {
    const { release, manifest } = fixture();
    if (kind === "draft") release.draft = true;
    if (kind === "missing") release.assets.pop(); // manifest validated by loader, remove image too
    if (kind === "missing") release.assets.shift();
    if (kind === "duplicate") release.assets.push(release.assets[0]);
    if (kind === "size") release.assets[0].size++;
    if (kind === "digest") release.assets[0].digest = `sha256:${"0".repeat(64)}`;
    if (kind === "prerelease") release.prerelease = true;
    if (kind === "nvs") manifest.parts[0].offset = 0x9000;
    if (kind === "remote") manifest.parts[0].file = "https://example.com/bootloader.bin";
    if (kind === "duplicate-region") manifest.parts[0] = manifest.parts[1];
    expect(() => resolveManifest(release, manifest), kind).toThrow();
  }
});

test("semantic ordering handles numeric versions and release candidate precedence", () => {
  const versions = ["0.1.0-rc.2", "0.9.0", "0.1.0-alpha.1", "0.1.0", "0.10.0", "0.1.0-rc.10"];
  expect(versions.sort(compareVersions)).toEqual(["0.1.0-alpha.1", "0.1.0-rc.2", "0.1.0-rc.10", "0.1.0", "0.9.0", "0.10.0"]);
});

test("catalog hides invalid releases and defaults to newest stable regardless of GitHub ordering", async () => {
  const records = [fixture("0.11.0-rc.1", 1), fixture("0.9.0", 2), fixture("0.10.0", 3), fixture("0.12.0", 4)];
  records[3].release.assets.shift();
  const request = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("?per_page")) return Response.json(records.map((r) => r.release));
    const record = records.find((r) => url.endsWith(`/assets/${r.release.id * 10 + 4}`));
    if (!record) throw new Error(`Unexpected request: ${url}`);
    return new Response(record.manifestBytes);
  };
  const catalog = await new GitHubFirmware(undefined, request as typeof fetch).catalog();
  expect(catalog.candidates.map((c) => c.release.version)).toEqual(["0.10.0", "0.9.0", "0.11.0-rc.1"]);
});

test("asset proxy verifies bytes, restricts redirects and never forwards the GitHub token", async () => {
  const { release, manifest, manifestBytes } = fixture();
  let corrupt = false, evil = false;
  const request = async (input: string | URL | Request, options?: RequestInit) => {
    const url = String(input);
    if (url.includes("githubusercontent.com")) {
      expect(options?.headers).toBeUndefined();
      const bytes = readFileSync(`public${bundled.parts[0].path}`);
      if (corrupt) bytes[0] ^= 255;
      return new Response(bytes);
    }
    expect((options?.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    if (url.endsWith("/releases/1")) return Response.json(release);
    if (url.endsWith("/assets/14")) return new Response(manifestBytes);
    if (url.endsWith("/assets/10")) return new Response(null, { status: 302, headers: { Location: evil ? "https://example.com/steal" : "https://release-assets.githubusercontent.com/file" } });
    throw new Error(`Unexpected request: ${url}`);
  };
  const github = new GitHubFirmware("test-token", request as typeof fetch);
  const part = manifest.parts[0];
  expect((await github.asset("1", part.sha256, part.file)).length).toBe(part.size);
  corrupt = true;
  await expect(github.asset("1", part.sha256, part.file)).rejects.toThrow();
  evil = true;
  await expect(github.asset("1", part.sha256, part.file)).rejects.toThrow();
  await expect(github.asset("1", "0".repeat(64), part.file)).rejects.toThrow();
  await expect(github.asset("../private", part.sha256, part.file)).rejects.toThrow();
});
