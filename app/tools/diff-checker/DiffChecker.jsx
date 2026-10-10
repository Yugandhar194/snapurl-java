"use client";

import { createTwoFilesPatch, diffLines, diffWords } from "diff";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "../../ThemeToggle";
import styles from "./DiffChecker.module.css";

const sampleOriginal = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}`;

const sampleModified = `function greet(name) {
  console.log("Hi, " + name);
  return false;
}`;

function linesOf(value) {
  if (!value) return [];
  const lines = value.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

function wordParts(before, after, ignoreWhitespace) {
  const parts = diffWords(before, after, { ignoreWhitespace });
  return {
    left: parts.filter((part) => !part.added).map((part) => ({ value: part.value, changed: part.removed })),
    right: parts.filter((part) => !part.removed).map((part) => ({ value: part.value, changed: part.added })),
  };
}

function compareText(original, modified, ignoreWhitespace) {
  const rows = [];
  const changes = [];
  const oldLines = linesOf(original);
  const newLines = linesOf(modified);
  let oldLine = 1;
  let newLine = 1;
  let removed = [];
  let added = [];

  function addChange() {
    if (!removed.length && !added.length) return;
    const change = changes.length;
    changes.push(rows.length);
    const count = Math.max(removed.length, added.length);
    for (let index = 0; index < count; index += 1) {
      const before = removed[index];
      const after = added[index];
      const words = before !== undefined && after !== undefined
        ? wordParts(before, after, ignoreWhitespace)
        : null;
      rows.push({
        kind: before === undefined ? "added" : after === undefined ? "removed" : "changed",
        change,
        left: before,
        right: after,
        leftLine: before === undefined ? null : oldLine++,
        rightLine: after === undefined ? null : newLine++,
        leftParts: words?.left,
        rightParts: words?.right,
      });
    }
    removed = [];
    added = [];
  }

  for (const part of diffLines(original, modified, { ignoreWhitespace })) {
    if (part.removed) {
      removed.push(...linesOf(part.value));
    } else if (part.added) {
      added.push(...linesOf(part.value));
    } else {
      addChange();
      for (const line of linesOf(part.value)) {
        rows.push({ kind: "equal", left: line, right: line, leftLine: oldLine++, rightLine: newLine++ });
      }
    }
  }
  addChange();
  return { rows, changes };
}

function HighlightedText({ parts, value }) {
  if (!parts) return value;
  return parts.map((part, index) => part.changed
    ? <mark key={index}>{part.value}</mark>
    : <span key={index}>{part.value}</span>);
}

export default function DiffChecker() {
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(true);
  const [rows, setRows] = useState([]);
  const [changes, setChanges] = useState([]);
  const [current, setCurrent] = useState(0);
  const [message, setMessage] = useState("");
  const resultRef = useRef(null);

  useEffect(() => {
    if (!window.location.hash) return;
    const shared = new URLSearchParams(window.location.hash.slice(1));
    const sharedOriginal = shared.get("original");
    const sharedModified = shared.get("modified");
    if (sharedOriginal === null || sharedModified === null) return;
    setOriginal(sharedOriginal);
    setModified(sharedModified);
    const result = compareText(sharedOriginal, sharedModified, true);
    setRows(result.rows);
    setChanges(result.changes);
  }, []);

  function compare() {
    const result = compareText(original, modified, ignoreWhitespace);
    setRows(result.rows);
    setChanges(result.changes);
    setCurrent(0);
    setMessage(result.changes.length ? `${result.changes.length} difference block${result.changes.length === 1 ? "" : "s"} found.` : "No differences found.");
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function navigate(direction) {
    if (!changes.length) return;
    const next = (current + direction + changes.length) % changes.length;
    setCurrent(next);
    document.getElementById(`diff-${next}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function loadFile(side, file) {
    if (!file) return;
    const text = await file.text();
    (side === "original" ? setOriginal : setModified)(text);
    setMessage(`${file.name} loaded locally.`);
  }

  function loadSample() {
    setOriginal(sampleOriginal);
    setModified(sampleModified);
    const result = compareText(sampleOriginal, sampleModified, true);
    setRows(result.rows);
    setChanges(result.changes);
    setCurrent(0);
    setMessage("Sample loaded.");
  }

  function clear() {
    setOriginal("");
    setModified("");
    setRows([]);
    setChanges([]);
    setCurrent(0);
    setMessage("");
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function share() {
    const params = new URLSearchParams({ original, modified });
    const url = `${window.location.origin}${window.location.pathname}#${params}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Private comparison link copied. Text is stored in the link fragment.");
    } catch {
      setMessage("Clipboard access is unavailable in this browser.");
    }
  }

  function downloadPatch() {
    const patch = createTwoFilesPatch("original.txt", "modified.txt", original, modified);
    const url = URL.createObjectURL(new Blob([patch], { type: "text/x-diff;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "comparison.patch";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.page}>
      <nav className="advanced-nav">
        <a className="brand" href="/"><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>SnapURL</span></a>
        <a className="back-link" href="/">← Back to SnapURL</a>
        <div className="nav-actions"><ThemeToggle /></div>
      </nav>
      <header className="tool-hero">
        <div className="tool-hero-icon" aria-hidden="true">⇄</div>
        <h1>Diff Checker</h1>
        <p>Compare text and code side by side. Your content stays in this browser.</p>
      </header>

      <section className={styles.workspace} aria-label="Diff Checker workspace">
        <div className={styles.editors}>
          <label className={styles.editorLabel}>
            <span>Original Text</span>
            <span className={styles.fileControl}>Upload File<input type="file" accept="text/*,.json,.js,.jsx,.ts,.tsx,.css,.html,.xml,.md,.java,.py,.yml,.yaml,.sql" onChange={(event) => loadFile("original", event.target.files?.[0])} /></span>
            <textarea value={original} onChange={(event) => setOriginal(event.target.value)} placeholder="Paste original text here..." spellCheck="false" />
          </label>
          <label className={styles.editorLabel}>
            <span>Modified Text</span>
            <span className={styles.fileControl}>Upload File<input type="file" accept="text/*,.json,.js,.jsx,.ts,.tsx,.css,.html,.xml,.md,.java,.py,.yml,.yaml,.sql" onChange={(event) => loadFile("modified", event.target.files?.[0])} /></span>
            <textarea value={modified} onChange={(event) => setModified(event.target.value)} placeholder="Paste modified text here..." spellCheck="false" />
          </label>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.whitespace}><input type="checkbox" checked={ignoreWhitespace} onChange={(event) => setIgnoreWhitespace(event.target.checked)} /> Ignore whitespace</label>
          <div className={styles.actions}>
            <button className="small-btn" type="button" onClick={clear}>Clear</button>
            <button className="small-btn" type="button" onClick={() => { setOriginal(modified); setModified(original); }}>Swap</button>
            <button className="small-btn" type="button" onClick={loadSample}>Load Sample</button>
            <button className="small-btn" type="button" onClick={share}>Share</button>
            <button className="small-btn" type="button" onClick={downloadPatch}>Download .patch</button>
            <button className="gradient-action" type="button" onClick={compare}>Compare</button>
          </div>
        </div>
        <p className={styles.privacy}>Shared links contain both texts in the URL fragment. Fragments are not sent to the server.</p>
      </section>

      <section className={styles.results} ref={resultRef} aria-label="Differences">
        <div className={styles.resultHeader}>
          <h2>Differences</h2>
          <div className={styles.navigation}>
            <button type="button" className="small-btn" disabled={!changes.length} onClick={() => navigate(-1)}>‹ Prev</button>
            <span>{changes.length ? `${current + 1} of ${changes.length}` : "0 of 0"}</span>
            <button type="button" className="small-btn" disabled={!changes.length} onClick={() => navigate(1)}>Next ›</button>
          </div>
        </div>
        {rows.length ? (
          <div className={styles.diffOutput}>
            {rows.map((row, index) => (
              <div key={index} id={row.change !== undefined && index === changes[row.change] ? `diff-${row.change}` : undefined} className={`${styles.diffRow} ${row.kind !== "equal" ? styles[row.kind] : ""} ${row.change === current ? styles.current : ""}`}>
                <span className={styles.lineNumber}>{row.leftLine ?? ""}</span>
                <code><HighlightedText parts={row.leftParts} value={row.left ?? ""} /></code>
                <span className={styles.lineNumber}>{row.rightLine ?? ""}</span>
                <code><HighlightedText parts={row.rightParts} value={row.right ?? ""} /></code>
              </div>
            ))}
          </div>
        ) : <p className={styles.empty}>Paste both texts or load the sample, then run Compare.</p>}
        <p className={styles.status} role="status">{message || "All comparison happens locally in your browser."}</p>
      </section>
      <footer className="tool-page-footer">Diff Checker · Client-side by design</footer>
    </main>
  );
}