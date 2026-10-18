# SnapURL

SnapURL is a Next.js frontend with browser-based file tools and local-only link management. Secure File Share uses a small API to store encrypted file bytes; the passcode remains in the browser.

## Run locally

1. Install Node.js 22 or newer.
2. From the project folder, run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

For a production build, run `npm run build` and then `npm start`.

## Data and limitations

- Short links and management state are stored in the current browser's `localStorage`. They are not shared with other browsers or devices, and clearing browser data removes them.
- File conversion and QR generation run in the browser. A PDF QR code must use a publicly reachable PDF URL; this app does not upload or host files.
- A globally shareable URL shortener requires a storage/API service, which is intentionally not included.
- SIP projections are estimates using monthly compounding and end-of-month contributions; they are not financial advice.
- Secure File Share accepts files up to 5 MB, encrypts them with AES-GCM using a passcode-derived key, and supports links expiring after 1 hour, 24 hours, or 7 days. Send the passcode separately from the link.
- Local development stores encrypted share blobs under `.data/secure-shares/`. On Netlify, shares use Netlify Blobs. If Blob context is unavailable in a Netlify deployment, share creation fails rather than using ephemeral storage.
- Share metadata (file name, content type, encryption salt/IV, and expiry) is not encrypted. The file contents are encrypted before upload; a lost passcode cannot be recovered.

## Deploy to Netlify

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Netlify, choose **Add new site → Import an existing project**, connect the repository, and select the project.
3. Keep the build command as `npm run build`. The repository's `netlify.toml` selects Node 22 and the Next.js runtime plugin.
4. Choose **Deploy site**. Netlify will provide the public URL after the build finishes.

You can also deploy with the CLI after signing in: `npx netlify-cli login`, `npx netlify-cli init`, then `npx netlify-cli deploy --build --prod`.
