"use client";

import { useEffect, useState } from "react";

const LINKS_KEY = "snapurl.local-links.v1";

export default function ShortRedirect({ code }) {
  const [message, setMessage] = useState("Opening your short link…");

  useEffect(() => {
    try {
      const records = JSON.parse(localStorage.getItem(LINKS_KEY) || "[]");
      const record = records.find((item) => item.link.code === code);
      if (!record) throw new Error("This short link is not saved in this browser.");

      const link = record.link;
      if (!link.active) throw new Error("This short link has been disabled.");
      if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
        throw new Error("This short link has expired.");
      }

      link.clickCount += 1;
      link.lastClickAt = new Date().toISOString();
      localStorage.setItem(LINKS_KEY, JSON.stringify(records));
      window.location.replace(link.destinationUrl);
    } catch (error) {
      setMessage(error.message || "This short link could not be opened.");
    }
  }, [code]);

  return (
    <main style={{ fontFamily: "sans-serif", margin: "4rem auto", maxWidth: 640, padding: "0 1.25rem" }}>
      <h1>SnapURL</h1>
      <p role="status">{message}</p>
      <a href="/">Back to SnapURL</a>
    </main>
  );
}