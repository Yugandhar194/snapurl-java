const API = "/api";
const STORE_KEY = "snapurl.links.v1";
const THEME_KEY = "snapurl.theme";
const $ = (s) => document.querySelector(s);

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeSaved(items) {
  localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, 50)));
}

function formatDate(value) {
  if (!value) return "never";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function shortUrl(code) {
  return location.origin + "/s/" + encodeURIComponent(code);
}

function showToast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => element.classList.remove("show"), 2200);
}

async function copyText(value) {
  await navigator.clipboard.writeText(value);
  showToast("Copied to clipboard");
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  $("#themeToggle").textContent = theme === "dark" ? "☀" : "◐";
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(
    saved ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );
}

async function api(path, options = {}) {
  const response = await fetch(
    API + path,
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

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

function renderStats(items) {
  $("#linkCount").textContent = items.length;
  $("#clickCount").textContent = items.reduce(
    (sum, item) => sum + Number(item.link?.clickCount || 0),
    0,
  );
}

async function refreshLinks() {
  const saved = readSaved();
  const panel = $("#linkList");
  const empty = $("#emptyState");

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
      const data = await api("/manage", {
        method: "POST",
        body: JSON.stringify({ code: item.code, token: item.token }),
      });
      resolved.push({ ...item, link: data.link });
    } catch {
      resolved.push({ ...item, link: null });
    }
  }

  const valid = resolved.filter((item) => item.link);
  if (valid.length !== resolved.length) {
    writeSaved(valid.map((item) => ({ code: item.code, token: item.token })));
  }

  renderStats(valid);

  valid.forEach((item) => {
    const link = item.link;
    const url = shortUrl(link.code);
    const active =
      link.active &&
      (!link.expiresAt || new Date(link.expiresAt) > new Date());

    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML =
      '<div class="link-main">' +
      '<div class="short-link">' +
      escapeHtml(url) +
      "</div>" +
      '<div class="destination" title="' +
      escapeHtml(link.destinationUrl) +
      '">' +
      escapeHtml(link.title || link.destinationUrl) +
      "</div>" +
      '<div class="link-meta"><span class="meta">' +
      Number(link.clickCount || 0) +
      " clicks</span><span class="meta">created " +
      escapeHtml(formatDate(link.createdAt)) +
      '</span><span class="status ' +
      (active ? "active" : "off") +
      '">' +
      (active ? "ACTIVE" : "INACTIVE") +
      "</span>" +
      (link.expiresAt
        ? '<span class="meta">expires ' +
          escapeHtml(formatDate(link.expiresAt)) +
          "</span>"
        : "") +
      '</div></div><div class="row-actions"><button class="small-btn copy-btn">Copy</button><button class="small-btn open-btn">Open</button></div><div class="row-actions"><button class="small-btn toggle-btn">' +
      (active ? "Disable" : "Enable") +
      '</button><button class="small-btn delete-btn">Delete</button></div>';

    panel.appendChild(row);

    row.querySelector(".copy-btn").onclick = () => copyText(url);
    row.querySelector(".open-btn").onclick = () =>
      window.open(url, "_blank", "noopener");

    row.querySelector(".toggle-btn").onclick = async () => {
      try {
        await api("/toggle", {
          method: "POST",
          body: JSON.stringify({
            code: link.code,
            token: item.token,
            active: !active,
          }),
        });
        showToast(active ? "Link disabled" : "Link enabled");
        refreshLinks();
      } catch (error) {
        showToast(error.message);
      }
    };

    row.querySelector(".delete-btn").onclick = async () => {
      if (!confirm("Delete this short link? This cannot be undone.")) return;

      try {
        await api("/delete", {
          method: "POST",
          body: JSON.stringify({ code: link.code, token: item.token }),
        });
        writeSaved(readSaved().filter((savedItem) => savedItem.code !== link.code));
        showToast("Link deleted");
        refreshLinks();
      } catch (error) {
        showToast(error.message);
      }
    };
  });
}

let latestResult = "";

$("#themeToggle").onclick = () =>
  applyTheme(
    document.documentElement.dataset.theme === "dark" ? "light" : "dark",
  );

$("#shortenForm").onsubmit = async (event) => {
  event.preventDefault();

  const button = $("#submitBtn");
  const message = $("#message");
  const result = $("#result");

  message.textContent = "";
  result.classList.remove("show");
  button.disabled = true;
  button.textContent = "Creating…";

  try {
    const data = await api("/shorten", {
      method: "POST",
      body: JSON.stringify({
        url: $("#url").value,
        alias: $("#alias").value,
        title: $("#title").value,
        expiresInDays: $("#expiry").value
          ? Number($("#expiry").value)
          : null,
      }),
    });

    latestResult = shortUrl(data.link.code);
    $("#resultUrl").textContent = latestResult;
    result.classList.add("show");

    writeSaved([
      { code: data.link.code, token: data.manageToken },
      ...readSaved().filter((item) => item.code !== data.link.code),
    ]);

    $("#shortenForm").reset();
    showToast("Short link created");
    refreshLinks();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Shorten URL →";
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
