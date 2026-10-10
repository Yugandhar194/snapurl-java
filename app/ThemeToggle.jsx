"use client";

import { useEffect, useState } from "react";
import { applyTheme, getPreferredTheme } from "./themePreference";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const preferred = getPreferredTheme();
    applyTheme(preferred);
    setTheme(preferred);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  return (
    <button
      className="icon-btn"
      type="button"
      aria-label="Toggle theme"
      title="Toggle light/dark mode"
      onClick={toggleTheme}
    >
      {theme === "dark" ? "☀" : "◐"}
    </button>
  );
}