import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Gauge,
  LoaderCircle,
  Play,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  getLatestSpeedTest,
  runSpeedTest,
  type SpeedTestResult,
} from "../services/api";

import "./TestPage.css";

type TestStatus = "idle" | "running" | "completed" | "error";

function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return date.toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default function TestPage() {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [result, setResult] = useState<SpeedTestResult | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [error, setError] = useState("");

  
    useEffect(() => {
    if (status !== "completed") {
        return;
    }

    const timer = window.setTimeout(() => {
        setStatus("idle");
    }, 3000);

    return () => {
        window.clearTimeout(timer);
    };
    }, [status]);


  useEffect(() => {
    let active = true;

    async function loadLatest() {
      try {
        const latest = await getLatestSpeedTest();

        if (active) {
          setResult(latest);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible consultar la última medición",
          );
        }
      } finally {
        if (active) {
          setLoadingLatest(false);
        }
      }
    }

    void loadLatest();

    return () => {
      active = false;
    };
  }, []);

  async function startTest() {
    if (status === "running") {
      return;
    }

    setStatus("running");
    setError("");

    try {
      const newResult = await runSpeedTest();

      setResult(newResult);
      setStatus("completed");
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al ejecutar la prueba",
      );
    }
  }

  async function refreshLatest() {
    if (status === "running") {
      return;
    }

    setLoadingLatest(true);
    setError("");

    try {
      const latest = await getLatestSpeedTest();
      setResult(latest);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible actualizar los resultados",
      );
    } finally {
      setLoadingLatest(false);
    }
  }

  const running = status === "running";
  const completed = status === "completed";

  return (
    <section className="page test-page">
      <div className="page-header">
        <div>
          <h1>Prueba de velocidad</h1>
          <p>
            Mide el rendimiento de tu conexión mediante LibreSpeed
          </p>
        </div>

        <button
          type="button"
          className="icon-action"
          title="Actualizar última medición"
          aria-label="Actualizar última medición"
          onClick={() => void refreshLatest()}
          disabled={running || loadingLatest}
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="panel test-main-panel">
        <div className="test-main-header">
          <div className="test-connection-icon">
            <Wifi size={22} />
          </div>

          <div>
            <h2>Diagnóstico de conexión</h2>
            <p>
              Descarga, subida, latencia y estabilidad
            </p>
          </div>
        </div>

        <div className="test-action-area">
          
        <button
        type="button"
        className={`test-start-button ${
            running ? "is-running" : completed ? "is-completed" : ""
        }`}
        onClick={() => void startTest()}
        disabled={running}
        >
        {running ? (
            <LoaderCircle
            size={38}
            className="test-spinner"
            />
        ) : completed ? (
            <CheckCircle2
            size={46}
            className="test-success-icon"
            />
        ) : (
            <Play size={38} fill="currentColor" />
        )}

        <span>
            {running
            ? "Midiendo..."
            : completed
                ? "¡Completada!"
                : "Iniciar prueba"}
        </span>
        </button>


          <div className="test-status-message">
            {running ? (
              <>
                <Activity size={17} />
                <span>
                  LibreSpeed está realizando la medición.
                  Esto puede tardar algunos segundos.
                </span>
              </>
            ) : status === "completed" ? (
              <>
                <CheckCircle2 size={17} />
                <span>
                  La prueba terminó correctamente.
                </span>
              </>
            ) : status === "error" ? (
              <>
                <WifiOff size={17} />
                <span>
                  No fue posible completar la prueba.
                </span>
              </>
            ) : (
              <>
                <Gauge size={17} />
                <span>
                  Presiona el botón para medir tu conexión.
                </span>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="test-error" role="alert">
            <WifiOff size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="test-results-heading">
        <div>
          <h2>Resultados</h2>
          <p>
            {result
              ? `Última medición: ${formatDate(result.timestamp)}`
              : "Todavía no hay resultados disponibles"}
          </p>
        </div>
      </div>

      {loadingLatest ? (
        <div className="test-metrics-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="panel test-metric-card" key={index}>
              <div className="skeleton test-metric-skeleton" />
            </div>
          ))}
        </div>
      ) : result ? (
        <div className="test-metrics-grid">
          <article className="panel test-metric-card">
            <div className="test-metric-header">
              <span>Descarga</span>
              <ArrowDown size={21} />
            </div>

            <div className="test-metric-value">
              <strong>
                {formatNumber(result.downloadMbps)}
              </strong>
              <span>Mbps</span>
            </div>

            <p>Velocidad de recepción</p>
          </article>

          <article className="panel test-metric-card">
            <div className="test-metric-header">
              <span>Subida</span>
              <ArrowUp size={21} />
            </div>

            <div className="test-metric-value">
              <strong>
                {formatNumber(result.uploadMbps)}
              </strong>
              <span>Mbps</span>
            </div>

            <p>Velocidad de transmisión</p>
          </article>

          <article className="panel test-metric-card">
            <div className="test-metric-header">
              <span>Ping</span>
              <Activity size={21} />
            </div>

            <div className="test-metric-value">
              <strong>
                {formatNumber(result.pingMs)}
              </strong>
              <span>ms</span>
            </div>

            <p>Latencia de conexión</p>
          </article>

          <article className="panel test-metric-card">
            <div className="test-metric-header">
              <span>Jitter</span>
              <Gauge size={21} />
            </div>

            <div className="test-metric-value">
              <strong>
                {formatNumber(result.jitterMs)}
              </strong>
              <span>ms</span>
            </div>

            <p>Variación de latencia</p>
          </article>
        </div>
      ) : (
        <div className="panel test-empty-results">
          <Gauge size={34} />
          <h3>Sin mediciones disponibles</h3>
          <p>
            Ejecuta tu primera prueba para visualizar
            los resultados.
          </p>
        </div>
      )}

      {result && (
        <div className="panel test-server-panel">
          <div className="test-server-icon">
            <Server size={21} />
          </div>

          <div className="test-server-info">
            <span>Servidor de medición</span>
            <strong>{result.serverName}</strong>
            <small>{result.serverUrl}</small>
          </div>

          <div className="test-server-id">
            ID: {result.serverId}
          </div>
        </div>
      )}
    </section>
  );
}
