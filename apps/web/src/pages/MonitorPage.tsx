
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  RefreshCw,
} from "lucide-react";
import SpeedChart from "../components/SpeedChart";
import {
  getSpeedTests,
  type SpeedTestResult,
} from "../services/api";
import HistoryTable from "../components/HistoryTable";

type Range = "24h" | "7d" | "30d" | "all";

interface Props {
  refreshKey: number;
}

export default function MonitorPage({ refreshKey }: Props) {
  const [results, setResults] = useState<SpeedTestResult[]>([]);
  const [range, setRange] = useState<Range>("24h");
  const [showDownload, setShowDownload] = useState(true);
  const [showUpload, setShowUpload] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await getSpeedTests(500);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) {
          setError("No se pudo cargar el historial de mediciones");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, historyRefreshKey]);

  const filtered = useMemo(() => {
    const now = Date.now();

    const periods: Record<Exclude<Range, "all">, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    if (range === "all") return results;

    const cutoff = now - periods[range];

    return results.filter(
      (item) => Date.parse(item.timestamp) >= cutoff,
    );
  }, [results, range]);

  const latest = filtered.at(-1);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Monitoreo</h1>
          <p>Historial de velocidad de tu conexión a Internet</p>
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="panel-header">
          <div>
            <h2>Velocidad de Internet</h2>
            <p>Descarga y subida · Mbps</p>
          </div>

          <div className="range-selector">
            {([
              ["24h", "24 horas"],
              ["7d", "7 días"],
              ["30d", "30 días"],
              ["all", "Todo"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                className={range === value ? "selected" : ""}
                onClick={() => setRange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="series-selector">
          <label>
            <input
              type="checkbox"
              checked={showDownload}
              onChange={(e) =>
                setShowDownload(e.target.checked)
              }
            />
            Descarga
          </label>
          <label>
            <input
              type="checkbox"
              checked={showUpload}
              onChange={(e) =>
                setShowUpload(e.target.checked)
              }
            />
            Subida
          </label>
        </div>

        {loading ? (
          <div className="chart-skeleton skeleton" />
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            No hay mediciones para este periodo.
          </div>
        ) : !showDownload && !showUpload ? (
          <div className="empty-state">
            Selecciona al menos una velocidad.
          </div>
        ) : (
          <SpeedChart
            results={filtered}
            showDownload={showDownload}
            showUpload={showUpload}
          />
        )}

        <div className="chart-footer">
          <span>{filtered.length} mediciones mostradas</span>
          <span>
            {range === "24h"
              ? "Ventana móvil de 24 horas"
              : "Historial disponible"}
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <Metric
          label="Última descarga"
          value={latest?.downloadMbps}
          unit="Mbps"
          icon={<ArrowDownToLine size={20} />}
          loading={loading}
        />
        <Metric
          label="Última subida"
          value={latest?.uploadMbps}
          unit="Mbps"
          icon={<ArrowUpFromLine size={20} />}
          loading={loading}
        />
        <Metric
          label="Latencia"
          value={latest?.pingMs}
          unit="ms"
          icon={<Activity size={20} />}
          loading={loading}
        />
        <Metric
          label="Jitter"
          value={latest?.jitterMs}
          unit="ms"
          icon={<RefreshCw size={20} />}
          loading={loading}
        />
      </div>

      {latest && !loading && (
        <div className="measurement-info">
          Última medición del periodo:{" "}
          {new Date(latest.timestamp).toLocaleString("es-MX")}
          {" · "}
          {latest.serverName}
        </div>
      )}
          <HistoryTable
      refreshKey={refreshKey}
      onDeleted={async () => {
        setHistoryRefreshKey((value) => value + 1);
      }}
    />
    </section>
  );
}

function Metric({
  label,
  value,
  unit,
  icon,
  loading,
}: {
  label: string;
  value?: number;
  unit: string;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <article className="panel metric-card">
      <div className="metric-heading">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <div className="metric-skeleton skeleton" />
      ) : (
        <div className="metric-value">
          {value?.toFixed(2) ?? "--"}
          <small>{unit}</small>
        </div>
      )}
    </article>
  );
}
