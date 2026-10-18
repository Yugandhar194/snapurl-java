"use client";

import { useEffect, useRef, useState } from "react";
import ThemeToggle from "../../ThemeToggle";
import styles from "./FileShare.module.css";

const maximumFileSize = 5 * 1024 * 1024;
const iterations = 310000;
const expiryOptions = [
  ["3600000", "1 hour"],
  ["86400000", "24 hours"],
  ["604800000", "7 days"],
];

function encodeBase64(bytes) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(passcode, salt, usage) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passcode), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

function shareCodeFromHash() {
  return new URLSearchParams(window.location.hash.slice(1)).get("share") || "";
}

export default function FileShare() {
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState("send");
  const [file, setFile] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [expiresIn, setExpiresIn] = useState("86400000");
  const [shareId, setShareId] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [downloadPasscode, setDownloadPasscode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const code = shareCodeFromHash();
    if (code) {
      setShareId(code);
      setTab("receive");
    }
  }, []);

  async function createShare() {
    if (!file) return setMessage("Choose a file to share.");
    if (file.size === 0) return setMessage("Empty files cannot be shared.");
    if (file.size > maximumFileSize) return setMessage("This file is over the 5 MB limit.");
    if (passcode.length < 8) return setMessage("Use a passcode with at least 8 characters.");
    if (passcode !== confirmPasscode) return setMessage("The passcodes do not match.");

    setBusy(true);
    setMessage("Encrypting file in this browser...");
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(passcode, salt, "encrypt");
      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await file.arrayBuffer());
      const expiresAt = Date.now() + Number(expiresIn);
      const response = await fetch("/api/file-shares", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Share-Name": encodeURIComponent(file.name),
          "X-Share-Type": file.type || "application/octet-stream",
          "X-Share-Salt": encodeBase64(salt),
          "X-Share-Iv": encodeBase64(iv),
          "X-Share-Iterations": String(iterations),
          "X-Share-Expires": String(expiresAt),
        },
        body: encrypted,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create this share.");
      const url = new URL(window.location.href);
      url.hash = new URLSearchParams({ share: data.id }).toString();
      setShareId(data.id);
      setShareUrl(url.toString());
      setPasscode("");
      setConfirmPasscode("");
      setMessage("Encrypted share created. Send the passcode to the recipient separately.");
    } catch (error) {
      setMessage(error.message || "Could not create this share.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadShare() {
    const id = shareId.trim();
    if (!/^[A-Za-z0-9_-]{32}$/.test(id)) return setMessage("Enter a valid share link or code.");
    if (downloadPasscode.length < 8) return setMessage("Enter the passcode used to protect this file.");

    setBusy(true);
    setMessage("Fetching encrypted file and decrypting in this browser...");
    try {
      const response = await fetch(`/api/file-shares/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "This share could not be opened.");
      }
      const encrypted = await response.arrayBuffer();
      const salt = decodeBase64(response.headers.get("X-Share-Salt") || "");
      const iv = decodeBase64(response.headers.get("X-Share-Iv") || "");
      const rounds = Number(response.headers.get("X-Share-Iterations"));
      if (salt.length !== 16 || iv.length !== 12 || rounds !== iterations) throw new Error("This share has invalid encryption details.");
      const key = await deriveKey(downloadPasscode, salt, "decrypt");
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
      const type = response.headers.get("X-Share-Type") || "application/octet-stream";
      const fileName = decodeURIComponent(response.headers.get("X-Share-Name") || "shared-file");
      const url = URL.createObjectURL(new Blob([decrypted], { type }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`Decrypted and downloaded ${fileName}.`);
      setDownloadPasscode("");
    } catch (error) {
      setMessage(error.name === "OperationError" ? "Wrong passcode, or the encrypted file is damaged." : error.message || "Could not decrypt this file.");
    } finally {
      setBusy(false);
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Share link copied. Send the passcode separately.");
    } catch {
      setMessage("Clipboard access is unavailable. Select and copy the share link below.");
    }
  }

  function receiveLink(value) {
    setShareUrl("");
    const match = value.match(/(?:#|[?&])share=([A-Za-z0-9_-]{32})/);
    setShareId(match ? match[1] : value.trim());
    setMessage("");
  }

  return <main className={styles.page}>
    <nav className="advanced-nav">
      <a className="brand" href="/"><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>SnapURL</span></a>
      <a className="back-link" href="/">← Back to SnapURL</a>
      <div className="nav-actions"><ThemeToggle /></div>
    </nav>
    <header className="tool-hero"><div className="tool-hero-icon" aria-hidden="true">⇧</div><h1>Secure File Share</h1><p>Password-protected file transfer with encryption in your browser.</p></header>

    <section className={styles.workspace} aria-label="Secure file sharing">
      <div className={styles.tabs} role="group" aria-label="File sharing action">
        <button type="button" aria-pressed={tab === "send"} onClick={() => { setTab("send"); setMessage(""); }}>Send a file</button>
        <button type="button" aria-pressed={tab === "receive"} onClick={() => { setTab("receive"); setMessage(""); }}>Receive a file</button>
      </div>

      {tab === "send" ? <div className={styles.form}>
        <label className={styles.field}>File <span>Up to 5 MB</span>
          <input ref={fileInputRef} type="file" onChange={(event) => { setFile(event.target.files?.[0] || null); setShareUrl(""); setMessage(""); }} />
        </label>
        {file && <p className={styles.selectedFile}>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        <div className={styles.formGrid}>
          <label className={styles.field}>Passcode <input type="password" autoComplete="new-password" minLength={8} maxLength={256} value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="At least 8 characters" /></label>
          <label className={styles.field}>Confirm passcode <input type="password" autoComplete="new-password" minLength={8} maxLength={256} value={confirmPasscode} onChange={(event) => setConfirmPasscode(event.target.value)} placeholder="Enter it again" /></label>
          <label className={styles.field}>Link expiry <select value={expiresIn} onChange={(event) => setExpiresIn(event.target.value)}>{expiryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <p className={styles.privacy}>The passcode never leaves this browser. Share it with the recipient through a separate channel.</p>
        <button className="gradient-action" type="button" disabled={busy} onClick={createShare}>{busy ? "Encrypting..." : "Encrypt & create link"}</button>
        {shareUrl && <div className={styles.shareResult}>
          <label className={styles.field}>Share link <input type="url" readOnly value={shareUrl} onFocus={(event) => event.target.select()} /></label>
          <button className="small-btn" type="button" onClick={copyShareLink}>Copy link</button>
          <span>Expires {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(Date.now() + Number(expiresIn)))}</span>
        </div>}
      </div> : <div className={styles.form}>
        <label className={styles.field}>Share link or code <input type="text" autoComplete="off" value={shareId} onChange={(event) => receiveLink(event.target.value)} placeholder="Paste the SnapURL share link" /></label>
        <label className={styles.field}>Passcode <input type="password" autoComplete="current-password" minLength={8} maxLength={256} value={downloadPasscode} onChange={(event) => setDownloadPasscode(event.target.value)} placeholder="Ask the sender for the passcode" /></label>
        <p className={styles.privacy}>The encrypted file is decrypted on this device. A wrong passcode cannot recover the file.</p>
        <button className="gradient-action" type="button" disabled={busy} onClick={downloadShare}>{busy ? "Decrypting..." : "Decrypt & download"}</button>
      </div>}
      {message && <p className={styles.message} role="status" aria-live="polite">{message}</p>}
    </section>
    <footer className="tool-page-footer">Secure File Share · Browser-encrypted · 5 MB maximum · Links expire within 7 days</footer>
  </main>;
}