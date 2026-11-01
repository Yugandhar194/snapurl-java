import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";

const localDirectory = path.join(process.cwd(), ".data", "short-links");
const storeName = "snapurl-short-links";

function useNetlifyStore() {
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext);
}

export async function readShortLink(code) {
  if (useNetlifyStore()) {
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
  if (useNetlifyStore()) {
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
  if (useNetlifyStore()) {
    await getStore(storeName).set(record.link.code, JSON.stringify(record));
    return;
  }

  await mkdir(localDirectory, { recursive: true });
  await writeFile(path.join(localDirectory, `${record.link.code}.json`), JSON.stringify(record));
}

export async function deleteShortLink(code) {
  if (useNetlifyStore()) {
    await getStore(storeName).delete(code);
    return;
  }

  await rm(path.join(localDirectory, `${code}.json`), { force: true });
}
