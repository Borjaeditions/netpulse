
import { useState } from "react";
import { Trash2, CalendarDays, AlertTriangle } from "lucide-react";

import {
  deleteSpeedTest,
  deleteSpeedTestsBefore,
  deleteAllSpeedTests,
  type SpeedTestResult,
} from "../services/api";

interface Props {
  results: SpeedTestResult[];
  onDeleted: () => Promise<void>;
}

type DeleteAction =
  | { type: "single"; id: number }
  | { type: "before" }
  | { type: "all" }
  | null;

export default function HistoryTable({
  results,
  onDeleted,
}: Props) {
  const [action, setAction] = useState<DeleteAction>(null);
  const [date, setDate] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const ordered = [...results].reverse();

  async function confirmDelete() {
    if (!action || deleting) return;

    setDeleting(true);
    setError("");

    try {
      if (action.type === "single") {
        await deleteSpeedTest(action.id);
      }

      if (action.type === "before") {
        if (!date) {
          throw new Error("Selecciona una fecha");
        }

        // Inicio del día seleccionado, en hora local.
        const cutoff = new Date(`${date}T00:00:00`);

        if (Number.isNaN(cutoff.getTime())) {
          throw new Error("Fecha inválida");
        }

        await deleteSpeedTestsBefore(cutoff);
      }

      if (action.type === "all") {
        if (confirmation !== "ELIMINAR") {
          throw new Error(
            "Escribe ELIMINAR para confirmar",
          );
        }

        await deleteAllSpeedTests();
      }

      setAction(null);
      setDate("");
      setConfirmation("");

      await onDeleted();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible eliminar los registros",
      );
    } finally {
      setDeleting(false);
    }
  }

  function openAction(next: DeleteAction) {
    setAction(next);
    setError("");
    setConfirmation("");
    setDate("");
  }

  return (
    <section className="panel history-panel">
      <div className="history-header">
        <div>
          <h2>Historial de mediciones</h2>
          <p>
            Consulta y administra los resultados
            almacenados.
          </p>
        </div>

        <div className="history-actions">
          <button
            className="secondary-action"
            onClick={() => openAction({ type: "before" })}
            disabled={results.length === 0}
          >
            <CalendarDays size={16} />
            Limpiar por fecha
          </button>

          <button
            className="history-danger-button"
            onClick={() => openAction({ type: "all" })}
            disabled={results.length === 0}
          >
            <Trash2 size={16} />
            Vaciar historial
          </button>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="history-empty">
          Todavía no hay mediciones almacenadas.
        </div>
      ) : (
        <div className="history-table-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descarga</th>
                <th>Subida</th>
                <th>Ping</th>
                <th>Jitter</th>
                <th>Servidor</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>

            <tbody>
              {ordered.map((item) => (
                <tr key={item.id ?? item.timestamp}>
                  <td>
                    {new Date(
                      item.timestamp,
                    ).toLocaleString("es-MX")}
                  </td>

                  <td>
                    {item.downloadMbps.toFixed(2)}
                    <small> Mbps</small>
                  </td>

                  <td>
                    {item.uploadMbps.toFixed(2)}
                    <small> Mbps</small>
                  </td>

                  <td>
                    {item.pingMs.toFixed(2)}
                    <small> ms</small>
                  </td>

                  <td>
                    {item.jitterMs.toFixed(2)}
                    <small> ms</small>
                  </td>

                  <td>{item.serverName}</td>

                  <td>
                    <button
                      className="icon-action danger"
                      title="Eliminar medición"
                      aria-label="Eliminar medición"
                      disabled={item.id == null}
                      onClick={() => {
                        if (item.id != null) {
                          openAction({
                            type: "single",
                            id: item.id,
                          });
                        }
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {action && (
        <div className="history-modal-backdrop">
          <div
            className="history-modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
          >
            <div className="history-modal-icon">
              <AlertTriangle size={24} />
            </div>

            <h3 id="history-modal-title">
              {action.type === "single"
                ? "Eliminar medición"
                : action.type === "before"
                  ? "Limpiar historial por fecha"
                  : "Vaciar todo el historial"}
            </h3>

            <p>
              {action.type === "single"
                ? "Esta medición se eliminará permanentemente."
                : action.type === "before"
                  ? "Se eliminarán todas las mediciones anteriores a la fecha seleccionada."
                  : "Se eliminarán permanentemente todas las mediciones almacenadas."}
            </p>

            {action.type === "before" && (
              <label className="field">
                <span>Eliminar registros anteriores a:</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) =>
                    setDate(e.target.value)
                  }
                />
              </label>
            )}

            {action.type === "all" && (
              <label className="field">
                <span>
                  Escribe ELIMINAR para confirmar:
                </span>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) =>
                    setConfirmation(e.target.value)
                  }
                  placeholder="ELIMINAR"
                  autoComplete="off"
                />
              </label>
            )}

            {error && (
              <div className="scheduler-error">
                {error}
              </div>
            )}

            <div className="history-modal-actions">
              <button
                className="secondary-action"
                disabled={deleting}
                onClick={() => openAction(null)}
              >
                Cancelar
              </button>

              <button
                className="history-danger-button solid"
                disabled={
                  deleting ||
                  (action.type === "before" && !date) ||
                  (action.type === "all" &&
                    confirmation !== "ELIMINAR")
                }
                onClick={() => void confirmDelete()}
              >
                <Trash2 size={16} />
                {deleting
                  ? "Eliminando..."
                  : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
