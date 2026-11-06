import { useEffect, useState } from "react";

import Layout, { type Page } from "./components/Layout";
import MonitorPage from "./pages/MonitorPage";
import SchedulerPage from "./pages/SchedulerPage";
import TestPage from "./pages/TestPage";

import { useTheme } from "./hooks/useTheme";
import { getHealth } from "./services/api";

import "./App.css";

export default function App() {
  const [page, setPage] = useState<Page>("monitor");
  const [connected, setConnected] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { theme, setTheme } = useTheme();

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        await getHealth();

        if (active) {
          setConnected(true);
        }
      } catch {
        if (active) {
          setConnected(false);
        }
      }
    }

    void checkHealth();

    const healthTimer = window.setInterval(() => {
      void checkHealth();
    }, 30_000);

    const events = new EventSource("/api/events");

    events.addEventListener("open", () => {
      if (active) {
        setConnected(true);
        setRefreshKey((key) => key + 1);
      }
    });

    events.addEventListener("speedtest.completed", () => {
      if (active) {
        setRefreshKey((key) => key + 1);
      }
    });

    events.addEventListener("error", () => {
      void checkHealth();
    });

    return () => {
      active = false;
      window.clearInterval(healthTimer);
      events.close();
    };
  }, []);

  return (
    <Layout
      page={page}
      onPageChange={setPage}
      theme={theme}
      onThemeChange={setTheme}
      connected={connected}
    >
      {page === "monitor" && (
        <MonitorPage refreshKey={refreshKey} />
      )}

      {page === "scheduler" && (
        <SchedulerPage />
      )}

      {page === "test" && (
        <TestPage />
      )}
    </Layout>
  );
}
