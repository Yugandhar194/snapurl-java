import { deleteShare, readShare } from "../storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(id)) {
    return Response.json({ error: "This share link is invalid." }, { status: 404, headers: noStore });
  }

  try {
    const share = await readShare(id);
    if (!share) return Response.json({ error: "This share was not found or has expired." }, { status: 404, headers: noStore });
    if (Number(share.metadata.expiresAt) <= Date.now()) {
      await deleteShare(id);
      return Response.json({ error: "This share has expired." }, { status: 410, headers: noStore });
    }

    return new Response(share.bytes, {
      headers: {
        ...noStore,
        "Content-Type": "application/octet-stream",
        "X-Share-Name": encodeURIComponent(share.metadata.fileName),
        "X-Share-Type": share.metadata.contentType,
        "X-Share-Salt": share.metadata.salt,
        "X-Share-Iv": share.metadata.iv,
        "X-Share-Iterations": String(share.metadata.iterations),
        "X-Share-Expires": String(share.metadata.expiresAt),
      },
    });
  } catch (error) {
    console.error("Could not retrieve encrypted file share", error);
    return Response.json({ error: "File storage is unavailable right now." }, { status: 503, headers: noStore });
  }
}