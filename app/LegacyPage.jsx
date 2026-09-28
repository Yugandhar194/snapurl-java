"use client";

import { useEffect, useRef, useState } from "react";

export default function LegacyPage({ file }) {
  const pageRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const page = pageRef.current;

    async function loadPage() {
      try {
        const response = await fetch(`/legacy/${file}`);
        if (!response.ok) throw new Error("Page could not be loaded.");

        const source = new DOMParser().parseFromString(await response.text(), "text/html");
        const scripts = [...source.body.querySelectorAll("script")];
        scripts.forEach((script) => script.remove());
        document.title = source.title || "SnapURL";
        document.body.className = source.body.className;
        page.innerHTML = source.body.innerHTML;

        for (const original of scripts) {
          if (cancelled) return;
          await new Promise((resolve) => {
            const script = document.createElement("script");
            if (original.src) {
              script.src = original.src;
              script.async = false;
              script.onload = resolve;
              script.onerror = resolve;
            } else {
              script.textContent = original.textContent;
              resolve();
            }
            page.appendChild(script);
          });
        }

        document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
      } catch (cause) {
        if (!cancelled) setError(cause.message || "Page could not be loaded.");
      }
    }

    loadPage();
    return () => {
      cancelled = true;
      if (page) page.replaceChildren();
      document.body.className = "";
    };
  }, [file]);

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <div ref={pageRef} />
    </>
  );
}