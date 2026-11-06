import {
  Activity,
  CalendarClock,
  Gauge,
  Monitor,
  Moon,
  Sun,
  Wifi,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Theme } from "../hooks/useTheme";
import ThemeSelector from "./ThemeSelector";

export type Page = "monitor" | "scheduler" | "test";

interface Props {
  page: Page;
  onPageChange: (page: Page) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  connected: boolean;
  children: ReactNode;
}

const navigation = [
  { id: "monitor", label: "Monitoreo", icon: Activity },
  { id: "scheduler", label: "Programador", icon: CalendarClock },
  { id: "test", label: "Prueba", icon: Gauge },
] as const;

export default function Layout({
  page,
  onPageChange,
  theme,
  onThemeChange,
  connected,
  children,
}: Props) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><Activity size={22} /></span>
          <div>
            <strong>NetPulse</strong>
            <small>Network Monitor</small>
          </div>
        </div>

        <nav className="navigation" aria-label="Navegación principal">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => onPageChange(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        
        <div className="sidebar-bottom">
        <div className="appearance-control">
            <span>Apariencia</span>

            <ThemeSelector
            theme={theme}
            onChange={onThemeChange}
            />
        </div>

        <div className="connection-status">
            <Wifi size={16} />

            <span>
            {connected ? "API conectada" : "API sin conexión"}
            </span>

            <span
            className={`status-dot ${connected ? "online" : ""}`}
            />
        </div>
        </div>

      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
