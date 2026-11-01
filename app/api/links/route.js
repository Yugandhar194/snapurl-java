import { randomBytes } from "node:crypto";
import { createShortLink, deleteShortLink, readShortLink, writeShortLink } from "./storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const codePattern = /^[A-Za-z0-9_-]{4,32}$/;

class LinkRequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function validateCode(value) {
  const code = String(value || "");
  if (!codePattern.test(code)) throw new LinkRequestError("The short-link code is invalid.");
  return code;
}

function validateDestination(value) {
  let destination;
  try {
    destination = new URL(String(value || ""));
  } catch {
    throw new LinkRequestError("Enter a valid destination URL.");
  }
  if (!["http:", "https:"].includes(destination.protocol)) {
    throw new LinkRequestError("Only HTTP and HTTPS URLs are supported.");
  }
  return destination;
}

function validateToken(value) {
  const token = String(value || "");
  if (token.length < 16 || token.length > 128) {
    throw new LinkRequestError("The link management token is invalid.", 403);
  }
  return token;
}

function validateImportedLink(value) {
  if (!value || typeof value !== "object") throw new LinkRequestError("The saved link data is invalid.");
  const code = validateCode(value.code);
  const destination = validateDestination(value.destinationUrl);
  const createdAt = new Date(value.createdAt);
  const expiresAt = value.expiresAt ? new Date(value.expiresAt) : null;
  if (Number.isNaN(createdAt.getTime()) || (expiresAt && Number.isNaN(expiresAt.getTime()))) {
    throw new LinkRequestError("The saved link dates are invalid.");
  }

  return {
    code,
    destinationUrl: destination.href,
    title: destination.hostname,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    clickCount: Number.isSafeInteger(value.clickCount) && value.clickCount >= 0 ? value.clickCount : 0,
    lastClickAt: value.lastClickAt && !Number.isNaN(new Date(value.lastClickAt).getTime())
      ? new Date(value.lastClickAt).toISOString()
      : null,
    active: value.active !== false,
  };
}

function jsonError(error) {
  if (error instanceof LinkRequestError) {
    return Response.json({ error: error.message }, { status: error.status, headers: noStore });
  }
  console.error("Could not access short-link storage", error);
  return Response.json({ error: "Short-link storage is unavailable right now." }, { status: 503, headers: noStore });
}

export async function GET(request) {
  const code = new URL(request.url).searchParams.get("code") || "";
  if (!codePattern.test(code)) {
    return Response.json({ error: "This short link could not be found." }, { status: 404, headers: noStore });
  }

  try {
    const record = await readShortLink(code);
    if (!record) {
      return Response.json({ error: "This short link could not be found." }, { status: 404, headers: noStore });
    }
    if (!record.link.active) {
      return Response.json({ error: "This short link has been disabled." }, { status: 410, headers: noStore });
    }
    if (record.link.expiresAt && new Date(record.link.expiresAt) <= new Date()) {
      return Response.json({ error: "This short link has expired." }, { status: 410, headers: noStore });
    }

    record.link.clickCount = Number(record.link.clickCount || 0) + 1;
    record.link.lastClickAt = new Date().toISOString();
    await writeShortLink(record);
    return Response.json({ destinationUrl: record.link.destinationUrl }, { headers: noStore });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400, headers: noStore });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "The request body is invalid." }, { status: 400, headers: noStore });
  }

  try {
    if (body.action === "shorten") {
      const destination = validateDestination(body.url);
      const requestedAlias = String(body.alias || "").trim();
      if (requestedAlias && !codePattern.test(requestedAlias)) {
        throw new LinkRequestError("Custom aliases must be 4–32 letters, numbers, hyphens or underscores.");
      }
      const alias = requestedAlias.toLowerCase();
      const expiresInDays = body.expiresInDays == null || body.expiresInDays === ""
        ? null
        : Number(body.expiresInDays);
      if (expiresInDays !== null && (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 3650)) {
        throw new LinkRequestError("Choose an expiry between 1 and 3650 days.");
      }

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = alias || randomBytes(9).toString("base64url");
        const createdAt = new Date().toISOString();
        const record = {
          manageToken: randomBytes(32).toString("base64url"),
          link: {
            code,
            destinationUrl: destination.href,
            title: destination.hostname,
            createdAt,
            expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000).toISOString() : null,
            clickCount: 0,
            lastClickAt: null,
            active: true,
          },
        };
        if (await createShortLink(record)) {
          return Response.json({ link: record.link, manageToken: record.manageToken }, { headers: noStore });
        }
        if (alias) throw new LinkRequestError("That custom alias is already in use.", 409);
      }
      throw new LinkRequestError("Could not allocate a unique short link. Please try again.", 503);
    }

    if (body.action === "import") {
      const link = validateImportedLink(body.link);
      const manageToken = validateToken(body.manageToken);
      const existing = await readShortLink(link.code);
      if (existing) {
        if (existing.manageToken === manageToken) {
          return Response.json({ link: existing.link }, { headers: noStore });
        }
        throw new LinkRequestError("That short-link code is already in use.", 409);
      }
      const record = { link, manageToken };
      if (!await createShortLink(record)) {
        throw new LinkRequestError("That short-link code is already in use.", 409);
      }
      return Response.json({ link }, { headers: noStore });
    }

    const code = validateCode(body.code);
    const manageToken = validateToken(body.token);
    const record = await readShortLink(code);
    if (!record || record.manageToken !== manageToken) {
      throw new LinkRequestError("Link not found or management access denied.", 404);
    }

    if (body.action === "manage") {
      return Response.json({ link: record.link }, { headers: noStore });
    }
    if (body.action === "toggle") {
      if (typeof body.active !== "boolean") throw new LinkRequestError("Choose whether the link should be enabled.");
      record.link.active = body.active;
      await writeShortLink(record);
      return Response.json({ link: record.link }, { headers: noStore });
    }
    if (body.action === "delete") {
      await deleteShortLink(code);
      return Response.json({ ok: true }, { headers: noStore });
    }
    throw new LinkRequestError("Unsupported short-link operation.");
  } catch (error) {
    return jsonError(error);
  }
}
