import * as React from "react";
import { defaultSettings, type AppSettings } from "@/types";
import { useTheme } from "./ThemeContext";

interface SettingsContextValue {
  settings: AppSettings;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null);
const STORAGE_KEY = "pf-settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = React.useState<AppSettings>(() => {
    if (typeof window === "undefined") return defaultSettings;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored
      ? { ...defaultSettings, ...JSON.parse(stored) }
      : { ...defaultSettings, darkMode: theme === "dark" };
  });

  const update = React.useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (key === "darkMode") setTheme(value ? "dark" : "light");
        return next;
      });
    },
    [setTheme]
  );

  // Mantém o toggle de dark mode espelhado ao tema
  React.useEffect(() => {
    setSettings((prev) =>
      prev.darkMode === (theme === "dark")
        ? prev
        : { ...prev, darkMode: theme === "dark" }
    );
  }, [theme]);

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings deve ser usado dentro de SettingsProvider");
  return ctx;
}
