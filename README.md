# SnapURL

SnapURL is a Next.js frontend with browser-based file tools and persistent short-link storage. Secure File Share uses a small API to store encrypted file bytes; the passcode remains in the browser.

## Run locally

1. Install Node.js 22 or newer.
2. From the project folder, run `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000`.

For a production build, run `npm run build` and then `npm start`.

## Data and limitations

- Short-link destinations are stored on the server and resolve across browsers and devices. Local development persists them under `.data/short-links/`; Netlify uses Netlify Blobs; Vercel uses private Vercel Blob storage. The management token remains in the creating browser, so clearing browser data can remove local management access without breaking the short link.
- File conversion and QR generation run in the browser. A PDF QR code must use a publicly reachable PDF URL; this app does not upload or host files.
- Short-link storage must be available to the deployed server. Netlify deployments use Netlify Blobs; Vercel deployments require a private Vercel Blob store connected to the project. Storage failures are reported rather than silently falling back to ephemeral files.
- SIP projections are estimates using monthly compounding and end-of-month contributions; they are not financial advice.
- The Age & Time Calculator reports calendar age, next-birthday countdowns, and elapsed time between selected date-times.
- Secure File Share accepts files up to 5 MB, encrypts them with AES-GCM using a passcode-derived key, and supports links expiring after 1 hour, 24 hours, or 7 days. Send the passcode separately from the link.
- Local development stores encrypted share blobs under `.data/secure-shares/`. Netlify shares use Netlify Blobs; Vercel shares use private Vercel Blob storage. If persistent storage is unavailable on either platform, share creation fails rather than using ephemeral storage.
- Share metadata (file name, content type, encryption salt/IV, and expiry) is not encrypted. The file contents are encrypted before upload; a lost passcode cannot be recovered.

## Deploy to Netlify

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Netlify, choose **Add new site → Import an existing project**, connect the repository, and select the project.
3. Keep the build command as `npm run build`. The repository's `netlify.toml` selects Node 22 and the Next.js runtime plugin.
4. Choose **Deploy site**. Netlify will provide the public URL after the build finishes.

You can also deploy with the CLI after signing in: `npx netlify-cli login`, `npx netlify-cli init`, then `npx netlify-cli deploy --build --prod`.

## Deploy to Vercel

1. Import the repository in Vercel and deploy it with the default Next.js settings.
2. In the Vercel project, open **Storage → Create Storage → Blob** and select **Private** access.
3. Connect the Blob store to this project for the Production and Preview environments. Vercel will configure the store credentials automatically.
4. Redeploy after connecting storage. Short links and encrypted file shares created after the redeploy will resolve across devices.
