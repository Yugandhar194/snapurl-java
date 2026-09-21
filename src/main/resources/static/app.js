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
  showToast("Copied!");
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  $("#themeToggle").textContent = theme === "dark" ? "☀" : "◐";
}

function initCurrentYear() {
  const year = $("#currentYear");
  if (year) year.textContent = new Date().getFullYear();
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

initCurrentYear();
initTheme();
refreshLinks();


// File tools
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function setToolOutput(id,msg){const e=$(id);e.innerHTML=msg}
function loadExternalScript(url,globalName){return new Promise((resolve,reject)=>{if(window[globalName])return resolve(window[globalName]);const s=document.createElement("script");s.src=url;s.onload=()=>window[globalName]?resolve(window[globalName]):reject(new Error(globalName+" failed to initialize"));s.onerror=()=>reject(new Error("Could not load "+globalName));document.head.appendChild(s)})}
async function ensureWordPdfLibraries(){const mammoth=window.mammoth||await loadExternalScript("https://unpkg.com/mammoth@1.12.3/mammoth.browser.min.js","mammoth");const jspdf=window.jspdf||await loadExternalScript("https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js","jspdf");return{mammoth,jspdf}}
const var sizeInput=$("#imageSize"); var sizeError=$("#imageSizeError"); function validateImageSize(){var n=Number(sizeInput.value);var ok=Number.isInteger(n)&&n>=10&&n<=1000;if(sizeError)sizeError.textContent=ok?"":"Target size must be a whole number between 10 and 1000 KB.";sizeInput.setCustomValidity(ok?"":"Enter 10–1000 KB.");return ok} sizeInput.addEventListener("input",validateImageSize); validateImageSize();
async function compressToTarget(blobFactory,targetBytes){let low=.05,high=.95,best=null;for(let i=0;i<9;i++){const quality=(low+high)/2;const blob=await blobFactory(quality);if(blob.size<=targetBytes){best=blob;low=quality}else high=quality}return best||await blobFactory(.05)}
$("#compressImage").onclick=async()=>{const f=$("#imageInput").files[0];if(!f)return showToast("Choose an image first");const out=$("#imageOutput");var targetKB=Number(sizeInput.value);if(!validateImageSize()){sizeInput.reportValidity();showToast("Enter 10–1000 KB");return}out.textContent="Compressing…";try{const im=new Image();im.src=URL.createObjectURL(f);await im.decode();const max=2400,scale=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.width*scale));c.height=Math.max(1,Math.round(im.height*scale));c.getContext("2d").drawImage(im,0,0,c.width,c.height);const type=/png/i.test(f.type)?"image/png":"image/jpeg";const targetBytes=Number(sizeInput.value)*1024;const blob=await compressToTarget(q=>new Promise(r=>c.toBlob(r,type,q)),targetBytes);downloadBlob(blob,(f.name.replace(/\.[^.]+$/,"")||"image")+"-compressed."+(type==="image/png"?"png":"jpg"));out.textContent="Compressed: "+Math.round(blob.size/1024).toLocaleString()+" KB";showToast("Image compressed!")}catch(e){console.error(e);out.textContent="Compression failed. Try another image.";showToast("Compression failed")}};
function convertImageFormat(file,targetType){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file);const im=new Image();im.onload=()=>{try{const c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext("2d");if(targetType==="image/jpeg"){ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height)}ctx.drawImage(im,0,0);c.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not create converted image")),targetType,targetType==="image/jpeg"?.95:undefined)}catch(e){reject(e)}finally{URL.revokeObjectURL(url)}};im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Invalid image file"))};im.src=url})}
async function runImageConversion(targetType){const f=$("#imageConvertInput").files[0];if(!f)return showToast("Choose a JPG or PNG first");const out=$("#imageConvertOutput");const isJpg=f.type==="image/jpeg";const isPng=f.type==="image/png";if(targetType==="image/png"&&!isJpg)return showToast("Choose a JPG file for JPG → PNG");if(targetType==="image/jpeg"&&!isPng)return showToast("Choose a PNG file for PNG → JPG");out.textContent="Converting…";try{const blob=await convertImageFormat(f,targetType);const ext=targetType==="image/png"?"png":"jpg";downloadBlob(blob,(f.name.replace(/\.[^.]+$/,"")||"image")+"."+ext);out.textContent="Done — "+Math.round(blob.size/1024).toLocaleString()+" KB downloaded.";showToast(targetType==="image/png"?"JPG converted to PNG!":"PNG converted to JPG!")}catch(e){console.error(e);out.textContent="Conversion failed: "+e.message;showToast("Image conversion failed")}}
$("#jpgToPng").onclick=()=>runImageConversion("image/png");
async function runImageToPdf(targetType){const f=$("#imagePdfInput").files[0];if(!f)return showToast("Choose a JPG or PNG first");const isJpg=f.type==="image/jpeg",isPng=f.type==="image/png";if(targetType==="image/jpeg"&&!isJpg)return showToast("Choose a JPG file for JPG → PDF");if(targetType==="image/png"&&!isPng)return showToast("Choose a PNG file for PNG → PDF");const out=$("#imagePdfOutput");out.textContent="Converting…";try{const libs=await ensureWordPdfLibraries();const {jsPDF}=libs.jspdf;const url=URL.createObjectURL(f);const im=new Image();im.src=url;await im.decode();const orientation=im.naturalWidth>=im.naturalHeight?"landscape":"portrait";const pdf=new jsPDF({unit:"mm",format:"a4",orientation});const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=10,maxW=pageW-margin*2,maxH=pageH-margin*2,scale=Math.min(maxW/im.naturalWidth,maxH/im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale,x=(pageW-w)/2,y=(pageH-h)/2;pdf.addImage(im,targetType==="image/png"?"PNG":"JPEG",x,y,w,h);pdf.save(f.name.replace(/\.[^.]+$/,"")+".pdf");URL.revokeObjectURL(url);out.textContent="Done — PDF downloaded.";showToast("Image converted to PDF!")}catch(e){console.error(e);out.textContent="Conversion failed: "+e.message;showToast("Image → PDF failed")}}
$("#jpgToPdf").onclick=()=>runImageToPdf("image/jpeg");
$("#pngToPdf").onclick=()=>runImageToPdf("image/png");

$("#pngToJpg").onclick=()=>runImageConversion("image/jpeg");
$("#wordToPdf").onclick=async()=>{const f=$("#wordToPdfInput").files[0];if(!f)return showToast("Choose a Word file first");const out=$("#wordPdfOutput");out.textContent="Converting…";try{const libs=await ensureWordPdfLibraries();const result=await libs.mammoth.extractRawText({arrayBuffer:await f.arrayBuffer()});const text=result.value||"";if(!text.trim())throw new Error("No readable text found in DOCX");const {jsPDF}=libs.jspdf;const pdf=new jsPDF({unit:"mm",format:"a4"});const margin=15,width=180,lineHeight=6;let y=18;for(const para of text.split(/\n+/)){const lines=pdf.splitTextToSize(para.trim(),width);if(!lines.length)continue;for(const line of lines){if(y>282){pdf.addPage();y=18}pdf.text(line,margin,y);y+=lineHeight}y+=2}pdf.save(f.name.replace(/\.docx$/i,"")+".pdf");out.textContent="Done — PDF downloaded.";showToast("Word converted!")}catch(e){console.error(e);out.textContent="Conversion failed: "+e.message;showToast("Word → PDF failed")}};
$("#pdfToWord").onclick=async()=>{const f=$("#pdfToWordInput").files[0];if(!f)return showToast("Choose a PDF first");const out=$("#pdfWordOutput");out.textContent="Extracting text…";try{if(!window.pdfjsLib||!window.docx)throw new Error("Conversion libraries did not load");window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";const doc=await window.pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;const paras=[];for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i),content=await page.getTextContent();let text=content.items.map(x=>x.str).join(" ").replace(/\s+/g," ").trim();if(text)paras.push(text)}if(!paras.length)throw new Error("No selectable text found. This PDF may be scanned/image-only.");const {Document,Packer,Paragraph}=window.docx;const d=new Document({sections:[{children:paras.map(t=>new Paragraph({text:t}))}]});const blob=await Packer.toBlob(d);downloadBlob(blob,f.name.replace(/\.pdf$/i,"")+".docx");out.textContent="Done — Word file downloaded.";showToast("PDF converted!")}catch(e){console.error(e);out.textContent="Conversion failed: "+e.message;showToast("PDF → Word failed")}};
