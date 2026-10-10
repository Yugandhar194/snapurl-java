"use client";

import { useEffect, useRef, useState } from "react";
import ThemeToggle from "../../ThemeToggle";
import styles from "./ImageCollager.module.css";

const aspectRatios = {
  square: 1,
  landscape: 4 / 3,
  portrait: 3 / 4,
  story: 9 / 16,
};

async function renderCollage(canvas, photos, options, isCurrent = () => true) {
  const decoded = await Promise.all(photos.map(async (photo) => {
    const image = new Image();
    image.src = photo.url;
    await image.decode();
    return image;
  }));
  if (!isCurrent()) return;

  const width = 1200;
  const height = Math.round(width / aspectRatios[options.aspect]);
  const columns = Math.min(options.columns, photos.length);
  const rows = Math.ceil(photos.length / columns);
  const gap = options.spacing;
  const cellWidth = (width - gap * (columns + 1)) / columns;
  const cellHeight = (height - gap * (rows + 1)) / rows;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.fillStyle = options.background;
  context.fillRect(0, 0, width, height);

  decoded.forEach((image, index) => {
    const x = gap + (index % columns) * (cellWidth + gap);
    const y = gap + Math.floor(index / columns) * (cellHeight + gap);
    const scale = Math.max(cellWidth / image.naturalWidth, cellHeight / image.naturalHeight);
    const sourceWidth = cellWidth / scale;
    const sourceHeight = cellHeight / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, cellWidth, cellHeight);
  });

}

export default function ImageCollager() {
  const [photos, setPhotos] = useState([]);
  const [columns, setColumns] = useState(2);
  const [aspect, setAspect] = useState("square");
  const [spacing, setSpacing] = useState(16);
  const [background, setBackground] = useState("#ffffff");
  const [format, setFormat] = useState("image/png");
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  useEffect(() => {
    let current = true;
    if (photos.length) {
      renderCollage(canvasRef.current, photos, { columns, aspect, spacing, background }, () => current)
        .catch(() => current && setMessage("Could not read one of these images in this browser."));
    } else {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    }
    return () => { current = false; };
  }, [photos, columns, aspect, spacing, background]);

  useEffect(() => () => objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function addPhotos(files) {
    const selected = [...files].filter((file) => file.type.startsWith("image/"));
    if (!selected.length) {
      setMessage("Choose image files to add.");
      return;
    }
    const added = selected.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        file,
        url,
      };
    });
    setPhotos((current) => [...current, ...added]);
    setMessage(`${selected.length} image${selected.length === 1 ? "" : "s"} added.`);
  }

  function removePhoto(id) {
    const photo = photos.find((item) => item.id === id);
    if (photo) {
      URL.revokeObjectURL(photo.url);
      objectUrlsRef.current.delete(photo.url);
    }
    setPhotos((current) => current.filter((item) => item.id !== id));
  }

  function movePhoto(index, direction) {
    setPhotos((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  }

  function clearPhotos() {
    photos.forEach((photo) => {
      URL.revokeObjectURL(photo.url);
      objectUrlsRef.current.delete(photo.url);
    });
    setPhotos([]);
    setMessage("");
  }

  async function exportCollage() {
    if (!photos.length) {
      setMessage("Add at least one photo first.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      await renderCollage(canvas, photos, { columns, aspect, spacing, background });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, format, 0.94));
      if (!blob) throw new Error("Export could not be created.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `snapurl-collage.${format === "image/jpeg" ? "jpg" : "png"}`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Collage exported.");
    } catch {
      setMessage("Could not export the collage. Try fewer or smaller images.");
    }
  }

  return (
    <main className={styles.page}>
      <nav className="advanced-nav">
        <a className="brand" href="/"><span className="brand-mark"><img src="/favicon.svg" alt="" /></span><span>SnapURL</span></a>
        <a className="back-link" href="/">← Back to SnapURL</a>
        <div className="nav-actions"><ThemeToggle /></div>
      </nav>
      <header className="tool-hero">
        <div className="tool-hero-icon" aria-hidden="true">▧</div>
        <h1>Image Collager</h1>
        <p>Arrange your photos into a clean grid and export the finished collage.</p>
      </header>

      <section className={styles.studio} aria-label="Image Collager workspace">
        <div className={styles.controls}>
          <div
            className={styles.dropzone}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); addPhotos(event.dataTransfer.files); }}
          >
            <span className={styles.dropIcon} aria-hidden="true">＋</span>
            <strong>Drop photos here</strong>
            <span>JPG, PNG, WebP and other browser-supported images</span>
            <button className="small-btn" type="button" onClick={() => inputRef.current?.click()}>Choose photos</button>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(event) => { addPhotos(event.target.files); event.target.value = ""; }} />
          </div>

          <div className={styles.settings}>
            <label>Columns
              <select value={columns} onChange={(event) => setColumns(Number(event.target.value))}>
                <option value="2">2 columns</option>
                <option value="3">3 columns</option>
                <option value="4">4 columns</option>
              </select>
            </label>
            <label>Canvas shape
              <select value={aspect} onChange={(event) => setAspect(event.target.value)}>
                <option value="square">Square</option>
                <option value="landscape">Landscape 4:3</option>
                <option value="portrait">Portrait 3:4</option>
                <option value="story">Story 9:16</option>
              </select>
            </label>
            <label className={styles.spacingControl}>Spacing <span>{spacing}px</span>
              <input type="range" min="0" max="48" step="2" value={spacing} onChange={(event) => setSpacing(Number(event.target.value))} />
            </label>
            <label className={styles.colorControl}>Background
              <input type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
            </label>
          </div>

          <div className={styles.photoHeader}>
            <h2>Photos <span>{photos.length}</span></h2>
            {photos.length > 0 && <button className="small-btn" type="button" onClick={clearPhotos}>Clear all</button>}
          </div>
          {photos.length ? (
            <ol className={styles.photoList}>
              {photos.map((photo, index) => (
                <li key={photo.id}>
                  <img src={photo.url} alt="" />
                  <span title={photo.file.name}>{photo.file.name}</span>
                  <div>
                    <button type="button" aria-label={`Move ${photo.file.name} up`} disabled={index === 0} onClick={() => movePhoto(index, -1)}>↑</button>
                    <button type="button" aria-label={`Move ${photo.file.name} down`} disabled={index === photos.length - 1} onClick={() => movePhoto(index, 1)}>↓</button>
                    <button type="button" aria-label={`Remove ${photo.file.name}`} onClick={() => removePhoto(photo.id)}>×</button>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className={styles.emptyPhotos}>Your selected photos will appear here.</p>}
        </div>

        <div className={styles.previewColumn}>
          <div className={styles.previewHeading}>
            <div><h2>Preview</h2><p>1200 px export width</p></div>
            <label className={styles.formatControl}>Format
              <select value={format} onChange={(event) => setFormat(event.target.value)}>
                <option value="image/png">PNG</option>
                <option value="image/jpeg">JPG</option>
              </select>
            </label>
          </div>
          <div className={styles.canvasFrame}>
            {photos.length ? <canvas ref={canvasRef} aria-label="Collage preview" /> : <div className={styles.canvasEmpty}><span aria-hidden="true">▧</span><p>Add photos to preview your collage.</p></div>}
          </div>
          <button className="gradient-action" type="button" disabled={!photos.length} onClick={exportCollage}>Export collage</button>
          <p className={styles.message} role="status">{message || "Images stay on your device; nothing is uploaded."}</p>
        </div>
      </section>
      <footer className="tool-page-footer">Image Collager · Client-side by design</footer>
    </main>
  );
}