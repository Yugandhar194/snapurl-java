# SnapURL

SnapURL is a Next.js frontend with browser-based file tools and local-only link management. It does not require a database or application API.

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

## Deploy to Netlify

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Netlify, choose **Add new site → Import an existing project**, connect the repository, and select the project.
3. Keep the build command as `npm run build`. The repository's `netlify.toml` selects Node 22 and the Next.js runtime plugin.
4. Choose **Deploy site**. Netlify will provide the public URL after the build finishes.

You can also deploy with the CLI after signing in: `npx netlify-cli login`, `npx netlify-cli init`, then `npx netlify-cli deploy --build --prod`.
