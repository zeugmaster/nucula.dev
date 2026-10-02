import { GitHubFirmware, InvalidRelease } from "@/lib/firmware/github";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ releaseId: string; sha256: string; name: string }> }) {
  const { releaseId, sha256, name } = await context.params;
  try {
    const bytes = await new GitHubFirmware(process.env.FIRMWARE_GITHUB_TOKEN).asset(releaseId, sha256, name);
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length),
      "Content-Disposition": `attachment; filename="${name}"`, "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
    } });
  } catch (error) {
    return Response.json({ error: "This firmware asset is unavailable or failed verification. Refresh the release list and try again." },
      { status: error instanceof InvalidRelease ? 404 : 502, headers: { "Cache-Control": "no-store" } });
  }
}
