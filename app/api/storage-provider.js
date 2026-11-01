export function getStorageProvider() {
  if (
    process.env.VERCEL
    || process.env.BLOB_STORE_ID
    || process.env.BLOB_READ_WRITE_TOKEN
    || process.env.VERCEL_OIDC_TOKEN
  ) {
    return "vercel";
  }
  if (process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext) {
    return "netlify";
  }
  return "local";
}
