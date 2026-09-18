const STORE_KEY = "snapurl.links.v1",
  THEME_KEY = "snapurl.theme";
const $ = (s) => document.querySelector(s);
function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeSaved(x) {
  localStorage.setItem(STORE_KEY, JSON.stringify(x.slice(0, 50)));
}
function formatDate(v) {
  if (!v) return "never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
}
function escapeHtml(v) {
  return String(v || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function shortUrl(c) {
  return location.origin + "/s/" + encodeURIComponent(c);
}
function showToast(t) {
  const e = $("#toast");
  e.textContent = t;
  e.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => e.classList.remove("show"), 2200);
}
async function copyText(t) {
  await navigator.clipboard.writeText(t);
  showToast("Copied to clipboard");
}
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem(THEME_KEY, t);
  $("#themeToggle").textContent = t === "dark" ? "☀" : "◐";
}
function initTheme() {
  const s = localStorage.getItem(THEME_KEY);
  applyTheme(
    s ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );
}
async function api(path, options = {}) {
  const r = await fetch(
    "/api" + path,
    Object.assign(
      {
        headers: Object.assign(
          { "Content-Type": "application/json" },
          options.headers || {},
        ),
      },
      options,
    ),
  );
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong.");
  return d;
}
function renderStats(items) {
  $("#linkCount").textContent = items.length;
  $("#clickCount").textContent = items.reduce(
    (s, i) => s + Number(i.link?.clickCount || 0),
    0,
  );
}
async function refreshLinks() {
  const saved = readSaved(),
    panel = $("#linkList"),
    empty = $("#emptyState");
  panel.innerHTML = "";
  if (!saved.length) {
    empty.style.display = "block";
    renderStats([]);
    return;
  }
  empty.style.display = "none";
  const resolved = [];
  for (const item of saved) {
    try {
      const d = await api("/manage", {
        method: "POST",
        body: JSON.stringify({ code: item.code, token: item.token }),
      });
      resolved.push({ ...item, link: d.link });
    } catch {}
  }
  writeSaved(resolved.map((i) => ({ code: i.code, token: i.token })));
  renderStats(resolved);
  resolved.forEach((item) => {
    const l = item.link,
      u = shortUrl(l.code),
      active = l.active && (!l.expiresAt || new Date(l.expiresAt) > new Date()),
      row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML =
      '<div class="link-main"><div class="short-link">' +
      escapeHtml(u) +
      ' </div><div class="destination" title="' +
      escapeHtml(l.destinationUrl) +
      '">' +
      escapeHtml(l.title || l.destinationUrl) +
      '</div><div class="link-meta"><span class="meta">' +
      Number(l.clickCount || 0) +
      ' clicks</span><span class="meta">created ' +
      escapeHtml(formatDate(l.createdAt)) +
      '</span><span class="status ' +
      (active ? "active" : "off") +
      '">' +
      (active ? "ACTIVE" : "INACTIVE") +
      "</span>" +
      (l.expiresAt
        ? '<span class="meta">expires ' +
          escapeHtml(formatDate(l.expiresAt)) +
          "</span>"
        : "") +
      '</div></div><div class="row-actions"><button class="small-btn copy-btn">Copy</button><button class="small-btn open-btn">Open</button></div><div class="row-actions"><button class="small-btn toggle-btn">' +
      (active ? "Disable" : "Enable") +
      '</button><button class="small-btn delete-btn">Delete</button></div>';
    panel.appendChild(row);
    row.querySelector(".copy-btn").onclick = () => copyText(u);
    row.querySelector(".open-btn").onclick = () =>
      window.open(u, "_blank", "noopener");
    row.querySelector(".toggle-btn").onclick = async () => {
      try {
        await api("/toggle", {
          method: "POST",
          body: JSON.stringify({
            code: l.code,
            token: item.token,
            active: !active,
          }),
        });
        showToast(active ? "Link disabled" : "Link enabled");
        refreshLinks();
      } catch (e) {
        showToast(e.message);
      }
    };
    row.querySelector(".delete-btn").onclick = async () => {
      if (!confirm("Delete this short link? This cannot be undone.")) return;
      try {
        await api("/delete", {
          method: "POST",
          body: JSON.stringify({ code: l.code, token: item.token }),
        });
        writeSaved(readSaved().filter((i) => i.code !== l.code));
        showToast("Link deleted");
        refreshLinks();
      } catch (e) {
        showToast(e.message);
      }
    };
  });
}
let latestResult = "";
$("#themeToggle").onclick = () =>
  applyTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark",
  );
$("#shortenForm").onsubmit = async (e) => {
  e.preventDefault();
  const b = $("#submitBtn"),
    m = $("#message"),
    r = $("#result");
  m.textContent = "";
  r.classList.remove("show");
  b.disabled = true;
  b.textContent = "Creating…";
  try {
    const d = await api("/shorten", {
      method: "POST",
      body: JSON.stringify({
        url: $("#url").value,
        alias: $("#alias").value,
        title: $("#title").value,
        expiresInDays: $("#expiry").value ? Number($("#expiry").value) : null,
      }),
    });
    latestResult = shortUrl(d.link.code);
    $("#resultUrl").textContent = latestResult;
    r.classList.add("show");
    writeSaved([
      { code: d.link.code, token: d.manageToken },
      ...readSaved().filter((i) => i.code !== d.link.code),
    ]);
    $("#shortenForm").reset();
    showToast("Short link created");
    refreshLinks();
  } catch (e) {
    m.textContent = e.message;
  } finally {
    b.disabled = false;
    b.textContent = "Shorten URL →";
  }
};
$("#copyResult").onclick = () => copyText(latestResult);
$("#openResult").onclick = () =>
  window.open(latestResult, "_blank", "noopener");
$("#shareResult").onclick = async () =>
  navigator.share
    ? await navigator.share({ title: "Short link", url: latestResult })
    : copyText(latestResult);
initTheme();
refreshLinks();
