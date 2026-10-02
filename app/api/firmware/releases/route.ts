import { GitHubFirmware } from "@/lib/firmware/github";
import { validateRelease, type FirmwareCatalog } from "@/lib/setup/release";
import bundled from "@/public/firmware/manifest.json";

export const runtime = "nodejs";
export async function GET() {
  let catalog: FirmwareCatalog;
  try { catalog = await new GitHubFirmware(process.env.FIRMWARE_GITHUB_TOKEN).catalog(); }
  catch { catalog = { candidates: [], warning: "GitHub releases are temporarily unavailable. You can still configure your board or choose the bundled preview." }; }
  catalog.candidates.push({ id: "bundled-preview", prerelease: true, publishedAt: null,
    url: "https://github.com/zeugmaster/nucula", release: validateRelease(bundled) });
  return Response.json(catalog, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
