import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { del, get, put } from "@vercel/blob";
import { getStorageProvider } from "../storage-provider";

const localDirectory = path.join(process.cwd(), ".data", "secure-shares");
const storeName = "snapurl-secure-file-shares";

function blobPath(id) {
  return `secure-shares/${id}.json`;
}

export function createShareId() {
  return randomBytes(24).toString("base64url");
}

export function cleanFileName(value) {
  const fileName = path.basename(String(value || "shared-file").replaceAll("\\", "/"))
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 180);
  return fileName || "shared-file";
}

export async function saveShare(id, bytes, metadata) {
  const provider = getStorageProvider();
  if (provider === "vercel") {
    await put(blobPath(id), JSON.stringify({
      bytes: Buffer.from(bytes).toString("base64"),
      metadata,
    }), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "application/json",
    });
    return;
  }
  if (provider === "netlify") {
    const store = getStore(storeName);
    await store.set(id, bytes, { onlyIfNew: true, metadata });
    return;
  }

  await mkdir(localDirectory, { recursive: true });
  await writeFile(path.join(localDirectory, `${id}.bin`), Buffer.from(bytes), { flag: "wx" });
  try {
    await writeFile(path.join(localDirectory, `${id}.json`), JSON.stringify(metadata), { flag: "wx" });
  } catch (error) {
    await rm(path.join(localDirectory, `${id}.bin`), { force: true });
    throw error;
  }
}

export async function readShare(id) {
  const provider = getStorageProvider();
  if (provider === "vercel") {
    const blob = await get(blobPath(id), { access: "private", useCache: false });
    if (!blob || blob.statusCode !== 200) return null;
    const record = JSON.parse(await new Response(blob.stream).text());
    return { bytes: Buffer.from(record.bytes, "base64"), metadata: record.metadata };
  }
  if (provider === "netlify") {
    const store = getStore(storeName);
    const result = await store.getWithMetadata(id, { type: "arrayBuffer", consistency: "strong" });
    return result ? { bytes: new Uint8Array(result.data), metadata: result.metadata } : null;
  }

  try {
    const [bytes, metadata] = await Promise.all([
      readFile(path.join(localDirectory, `${id}.bin`)),
      readFile(path.join(localDirectory, `${id}.json`), "utf8"),
    ]);
    return { bytes, metadata: JSON.parse(metadata) };
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteShare(id) {
  const provider = getStorageProvider();
  if (provider === "vercel") {
    await del(blobPath(id), { access: "private" });
    return;
  }
  if (provider === "netlify") {
    await getStore(storeName).delete(id);
    return;
  }
  await Promise.all([
    rm(path.join(localDirectory, `${id}.bin`), { force: true }),
    rm(path.join(localDirectory, `${id}.json`), { force: true }),
  ]);
}