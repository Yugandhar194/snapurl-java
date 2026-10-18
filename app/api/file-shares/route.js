import { cleanFileName, createShareId, saveShare } from "./storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumBytes = 5 * 1024 * 1024;
const maximumLifetime = 7 * 24 * 60 * 60 * 1000;
const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function POST(request) {
  const size = Number(request.headers.get("content-length"));
  if (Number.isFinite(size) && size > maximumBytes + 16) {
    return Response.json({ error: "Files must be 5 MB or smaller." }, { status: 413, headers: noStore });
  }

  const salt = request.headers.get("x-share-salt") || "";
  const iv = request.headers.get("x-share-iv") || "";
  const iterations = Number(request.headers.get("x-share-iterations"));
  const expiresAt = Number(request.headers.get("x-share-expires"));
  if (!/^[A-Za-z0-9_-]{22}$/.test(salt) || !/^[A-Za-z0-9_-]{16}$/.test(iv) || iterations !== 310000) {
    return Response.json({ error: "The encrypted share metadata is invalid." }, { status: 400, headers: noStore });
  }
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || expiresAt > Date.now() + maximumLifetime + 60000) {
    return Response.json({ error: "Choose an expiry within the next 7 days." }, { status: 400, headers: noStore });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength <= 16 || bytes.byteLength > maximumBytes + 16) {
    return Response.json({ error: "Files must be between 1 byte and 5 MB." }, { status: 413, headers: noStore });
  }

  let fileName;
  try {
    fileName = cleanFileName(decodeURIComponent(request.headers.get("x-share-name") || "shared-file"));
  } catch {
    return Response.json({ error: "The file name is invalid." }, { status: 400, headers: noStore });
  }
  const rawType = request.headers.get("x-share-type") || "application/octet-stream";
  const contentType = /^[\w.+-]+\/[\w.+-]+$/.test(rawType) ? rawType : "application/octet-stream";
  const metadata = { salt, iv, iterations, expiresAt, fileName, contentType };
  const id = createShareId();

  try {
    await saveShare(id, bytes, metadata);
    return Response.json({ id, expiresAt }, { headers: noStore });
  } catch (error) {
    console.error("Could not persist encrypted file share", error);
    return Response.json({ error: "File storage is unavailable right now." }, { status: 503, headers: noStore });
  }
}