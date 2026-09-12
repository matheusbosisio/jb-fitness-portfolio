"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("jb-theme");
    const initial: Theme = saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    document.documentElement.classList.toggle("dark", initial === "dark");
    const frame = requestAnimationFrame(() => setTheme(initial));
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("jb-theme", next);
    setTheme(next);
  }

  return <button aria-label={`Ativar modo ${theme === "light" ? "noturno" : "claro"}`} className="min-h-10 rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:border-brand" onClick={toggleTheme} type="button"><span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span><span className="ml-2 hidden sm:inline">{theme === "light" ? "Noturno" : "Claro"}</span></button>;
}
