import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { del, get, put } from "@vercel/blob";
import { getStorageProvider } from "../storage-provider";

const localDirectory = path.join(process.cwd(), ".data", "short-links");
const storeName = "snapurl-short-links";

function blobPath(code) {
  return `short-links/${code}.json`;
}

async function readVercelShortLink(code) {
  const blob = await get(blobPath(code), { access: "private", useCache: false });
  if (!blob || blob.statusCode !== 200) return null;
  return JSON.parse(await new Response(blob.stream).text());
}

export async function readShortLink(code) {
  const provider = getStorageProvider();
  if (provider === "vercel") return readVercelShortLink(code);
  if (provider === "netlify") {
    return getStore(storeName).get(code, { type: "json", consistency: "strong" });
  }

  try {
    const contents = await readFile(path.join(localDirectory, `${code}.json`), "utf8");
    return JSON.parse(contents);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function createShortLink(record) {
  const provider = getStorageProvider();
  if (provider === "vercel") {
    try {
      await put(blobPath(record.link.code), JSON.stringify(record), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/json",
      });
      return true;
    } catch (error) {
      if (await readVercelShortLink(record.link.code)) return false;
      throw error;
    }
  }
  if (provider === "netlify") {
    const result = await getStore(storeName).set(record.link.code, JSON.stringify(record), { onlyIfNew: true });
    return result.modified;
  }

  await mkdir(localDirectory, { recursive: true });
  try {
    await writeFile(path.join(localDirectory, `${record.link.code}.json`), JSON.stringify(record), { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}

export async function writeShortLink(record) {
  const provider = getStorageProvider();
  if (provider === "vercel") {
    await put(blobPath(record.link.code), JSON.stringify(record), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }
  if (provider === "netlify") {
    await getStore(storeName).set(record.link.code, JSON.stringify(record));
    return;
  }

  await mkdir(localDirectory, { recursive: true });
  await writeFile(path.join(localDirectory, `${record.link.code}.json`), JSON.stringify(record));
}

export async function deleteShortLink(code) {
  const provider = getStorageProvider();
  if (provider === "vercel") {
    await del(blobPath(code), { access: "private" });
    return;
  }
  if (provider === "netlify") {
    await getStore(storeName).delete(code);
    return;
  }

  await rm(path.join(localDirectory, `${code}.json`), { force: true });
}
