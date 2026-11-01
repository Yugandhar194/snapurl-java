"use client";

import { useEffect, useState } from "react";

export default function ShortRedirect({ code }) {
  const [message, setMessage] = useState("Opening your short link…");

  useEffect(() => {
    let cancelled = false;
    async function resolveLink() {
      try {
        const response = await fetch(`/api/links?code=${encodeURIComponent(code)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "This short link could not be opened.");
        if (!cancelled) window.location.replace(result.destinationUrl);
      } catch (error) {
        if (!cancelled) setMessage(error.message || "This short link could not be opened.");
      }
    }

    resolveLink();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <main style={{ fontFamily: "sans-serif", margin: "4rem auto", maxWidth: 640, padding: "0 1.25rem" }}>
      <h1>SnapURL</h1>
      <p role="status">{message}</p>
      <a href="/">Back to SnapURL</a>
    </main>
  );
}