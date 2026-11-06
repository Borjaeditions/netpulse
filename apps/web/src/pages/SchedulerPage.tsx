import { useCallback, useEffect, useState } from "react";
import { AlarmClock, CalendarClock, Clock3, Pencil, Plus, RefreshCw, Repeat, Trash2, X } from "lucide-react";
import ScheduleForm from "../components/ScheduleForm";
import {
  createSchedule, deleteSchedule, getScheduleExecutions, getSchedules, updateSchedule,
  type Schedule, type ScheduleExecution, type ScheduleInput,
} from "../services/api";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function inputFromSchedule(row: Schedule): ScheduleInput {
  let days: number[] = [1, 2, 3, 4, 5];
  if (row.days_of_week) {
    try {
      const parsed: unknown = JSON.parse(row.days_of_week);
      if (Array.isArray(parsed) && parsed.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
        days = parsed as number[];
      }
    } catch { /* Conserva los días predeterminados si hay datos inválidos. */ }
  }
  return {
    name: row.name,
    type: row.type,
    enabled: row.enabled === 1,
    intervalMinutes: row.interval_minutes ?? 60,
    timeOfDay: row.time_of_day ?? "08:00",
    daysOfWeek: days,
    timezone: row.timezone || "America/Mexico_City",
  };
}

function describeSchedule(row: Schedule): string {
  if (row.type === "interval") {
    const minutes = row.interval_minutes ?? 60;

    if (minutes === 60) return "Cada hora";

    if (minutes % 60 === 0) {
      return `Cada ${minutes / 60} horas`;
    }

    return `Cada ${minutes} minutos`;
  }

  const days: number[] = row.days_of_week
    ? JSON.parse(row.days_of_week) as number[]
    : [];

  const dayNames: string[] = days
    .map((day: number): string => DAYS[day] ?? "") 
    .filter((name: string): boolean => name.length > 0);

  return `${row.time_of_day ?? "--:--"} · ${dayNames.join(", ")}`;
}


function formatDate(value: string | null): string {
  if (!value) return "Sin próxima ejecución";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : date.toLocaleString("es-MX", {
    dateStyle: "medium", timeStyle: "short",
  });
}

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [executions, setExecutions] = useState<ScheduleExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<ScheduleInput | undefined>();

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [rows, history] = await Promise.all([getSchedules(), getScheduleExecutions()]);
      setSchedules(rows);
      setExecutions(history);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible consultar las programaciones");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const events = new EventSource("/api/events");
    const refresh = () => { void load(); };
    for (const eventName of ["schedule.updated", "schedule.completed", "schedule.failed"]) {
      events.addEventListener(eventName, refresh);
    }
    const timer = window.setInterval(refresh, 60_000);
    return () => { events.close(); window.clearInterval(timer); };
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setEditingValue(undefined);
    setError("");
    setFormOpen(true);
  }

  function openEdit(row: Schedule) {
    setEditingId(row.id);
    setEditingValue(inputFromSchedule(row));
    setError("");
    setFormOpen(true);
  }

  async function save(input: ScheduleInput): Promise<void> {
    setSaving(true);
    setError("");
    try {
      if (editingId === null) await createSchedule(input);
      else await updateSchedule(editingId, input);
      setFormOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(row: Schedule) {
    setBusyId(row.id);
    try {
      await updateSchedule(row.id, { ...inputFromSchedule(row), enabled: row.enabled !== 1 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la programación");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: Schedule) {
    if (!window.confirm(`¿Eliminar "${row.name}"?`)) return;
    setBusyId(row.id);
    try {
      await deleteSchedule(row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible eliminar la programación");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="page scheduler-page">
      <div className="page-header">
        <div><h1>Programador</h1><p>Configura cuándo NetPulse medirá tu conexión</p></div>
        <button type="button" className="primary-action" onClick={openCreate}>
          <Plus size={18} /> Nueva programación
        </button>
      </div>

      {error && (
        <div className="scheduler-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Cerrar error"><X size={16} /></button>
        </div>
      )}

      {formOpen && (
        <ScheduleForm
          key={editingId ?? "new"}
          initialValue={editingValue}
          saving={saving}
          onCancel={() => setFormOpen(false)}
          onSave={save}
          />
      )}

      <div className="scheduler-section-heading">
        <h2>Mis programaciones</h2>
        <button type="button" className="icon-action" aria-label="Actualizar programaciones" title="Actualizar" onClick={() => void load(true)}>
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="schedule-list">
        {loading ? Array.from({ length: 3 }, (_, i) => (
          <div className="panel schedule-card" key={i}><div className="skeleton schedule-card-skeleton" /></div>
        )) : schedules.length === 0 ? (
          <div className="panel scheduler-empty">
            <CalendarClock size={30} /><h3>No hay programaciones</h3>
            <p>Crea un intervalo o una alarma para comenzar.</p>
          </div>
        ) : schedules.map((row) => (
          <article className="panel schedule-card" key={row.id}>
            <div className="schedule-card-icon">
              {row.type === "interval" ? <Repeat size={22} /> : <AlarmClock size={22} />}
            </div>
            <div className="schedule-card-info">
              <h3>{row.name}</h3><p>{describeSchedule(row)}</p>
              <small><Clock3 size={13} />{row.enabled === 1
                ? `Próxima: ${formatDate(row.next_run_at)}` : "Programación desactivada"}</small>
            </div>
            <div className="schedule-card-actions">
              <label className="switch" title="Activar o desactivar">
                <input type="checkbox" checked={row.enabled === 1} disabled={busyId === row.id}
                  aria-label={`Activar ${row.name}`} onChange={() => void toggle(row)} />
                <span className="switch-track" />
              </label>
              <button type="button" className="icon-action" title="Editar" aria-label={`Editar ${row.name}`}
                disabled={busyId === row.id} onClick={() => openEdit(row)}><Pencil size={17} /></button>
              <button type="button" className="icon-action danger" title="Eliminar" aria-label={`Eliminar ${row.name}`}
                disabled={busyId === row.id} onClick={() => void remove(row)}><Trash2 size={17} /></button>
            </div>
          </article>
        ))}
      </div>

      <div className="scheduler-section-heading"><h2>Últimas ejecuciones</h2></div>
      <div className="panel execution-list">
        {loading ? <div className="skeleton execution-skeleton" />
          : executions.length === 0 ? <div className="scheduler-empty compact">Todavía no hay ejecuciones registradas.</div>
          : executions.map((execution) => {
            const name = schedules.find((row) => row.id === execution.schedule_id)?.name
              ?? `Programación #${execution.schedule_id}`;
            const statusLabel = execution.status === "completed" ? "Completada"
              : execution.status === "running" ? "En ejecución"
              : execution.status === "skipped" ? "Omitida" : "Fallida";
            return (
              <div className="execution-row" key={execution.id}>
                <div><strong>{name}</strong><small>{formatDate(execution.scheduled_at)}</small></div>
                <span className={`execution-status ${execution.status}`}>{statusLabel}</span>
              </div>
            );
          })}
      </div>
    </section>
  );
}