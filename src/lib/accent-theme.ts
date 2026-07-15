export const ACCENT_THEMES = [
  { id: "lavender", label: "Lavender", swatch: "#A78BDB" },
  { id: "ocean", label: "Ocean", swatch: "#6FA8DC" },
  { id: "cherry", label: "Cherry", swatch: "#E0748A" },
  { id: "matcha", label: "Matcha", swatch: "#6FAE7F" },
  { id: "peach", label: "Peach", swatch: "#E0964F" },
  { id: "sunshine", label: "Sunshine", swatch: "#E0B84F" },
  { id: "mint", label: "Mint", swatch: "#4FB8A8" },
  { id: "berry", label: "Berry", swatch: "#A8508F" },
] as const;

export type AccentId = (typeof ACCENT_THEMES)[number]["id"];

export const ACCENT_STORAGE_KEY = "rei-accent-theme";
export const DEFAULT_ACCENT: AccentId = "lavender";

export function applyAccent(id: string) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-accent", id);
}

export function setStoredAccent(id: AccentId) {
  applyAccent(id);
  try {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private browsing, etc.) — accent just won't persist
  }
}

export function getStoredAccent(): AccentId {
  try {
    const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    if (stored && ACCENT_THEMES.some((t) => t.id === stored)) return stored as AccentId;
  } catch {
    // ignore
  }
  return DEFAULT_ACCENT;
}

