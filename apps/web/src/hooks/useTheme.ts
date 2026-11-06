
import { useEffect, useState } from "react";

export type Theme = "system" | "light" | "dark";

const KEY = "netpulse-theme";

function initialTheme(): Theme {
  const saved = localStorage.getItem(KEY);
  return saved === "light" || saved === "dark"
    ? saved
    : "system";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );

    function update() {
      const resolved = theme === "system"
        ? media.matches ? "dark" : "light"
        : theme;

      document.documentElement.dataset.theme = resolved;
    }

    update();
    media.addEventListener("change", update);
    localStorage.setItem(KEY, theme);

    return () => media.removeEventListener("change", update);
  }, [theme]);

  return { theme, setTheme };
}
