import { useState, type FormEvent } from "react";
import { AlarmClock, Repeat, Check, X } from "lucide-react";
import type { ScheduleInput } from "../services/api";

interface Props {
  initialValue?: ScheduleInput;
  saving?: boolean;
  onSave: (input: ScheduleInput) => Promise<void>;
  onCancel: () => void;
}

const DAYS = [
  { value: 0, label: "D", name: "Domingo" },
  { value: 1, label: "L", name: "Lunes" },
  { value: 2, label: "M", name: "Martes" },
  { value: 3, label: "M", name: "Miércoles" },
  { value: 4, label: "J", name: "Jueves" },
  { value: 5, label: "V", name: "Viernes" },
  { value: 6, label: "S", name: "Sábado" },
];

const INTERVALS = [5, 15, 30, 60, 120, 360, 720, 1440];

function defaultInput(): ScheduleInput {
  return {
    name: "",
    type: "interval",
    enabled: true,
    intervalMinutes: 60,
    timeOfDay: "08:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    timezone: "America/Mexico_City",
  };
}

export default function ScheduleForm({
  initialValue,
  saving = false,
  onSave,
  onCancel,
}: Props) {
  const [form, setForm] = useState<ScheduleInput>(
    () => initialValue ?? defaultInput(),
  );
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError("Escribe un nombre para la programación.");
      return;
    }

    if (form.type === "alarm") {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.timeOfDay ?? "")) {
        setError("Introduce una hora válida en formato HH:mm.");
        return;
      }

      if (!form.daysOfWeek?.length) {
        setError("Selecciona al menos un día de la semana.");
        return;
      }
    }

    if (
      form.type === "interval" &&
      (!Number.isInteger(form.intervalMinutes) ||
        (form.intervalMinutes ?? 0) < 1)
    ) {
      setError("Selecciona un intervalo válido.");
      return;
    }

    setError("");

    const payload: ScheduleInput = {
      name,
      type: form.type,
      enabled: form.enabled,
      timezone: "America/Mexico_City",
      ...(form.type === "interval"
        ? { intervalMinutes: form.intervalMinutes }
        : {
            timeOfDay: form.timeOfDay,
            daysOfWeek: form.daysOfWeek,
          }),
    };

    try {
      await onSave(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible guardar la programación.",
      );
    }
  }

  return (
    <form
      className="panel schedule-form"
      onSubmit={(event) => void submit(event)}
    >
      <div className="schedule-form-heading">
        <h2>
          {initialValue ? "Editar programación" : "Nueva programación"}
        </h2>
        <button
          type="button"
          className="icon-action"
          onClick={onCancel}
          aria-label="Cerrar formulario"
        >
          <X size={19} />
        </button>
      </div>

      {error && (
        <div className="scheduler-error" role="alert">
          {error}
        </div>
      )}

      <label className="field">
        <span>Nombre</span>
        <input
          required
          maxLength={100}
          placeholder="Ej. Medición cada hora"
          value={form.name}
          onChange={(event) =>
            setForm({ ...form, name: event.target.value })
          }
        />
      </label>

      <div className="field">
        <span>Tipo de programación</span>

        <div className="schedule-type-selector">
          <button
            type="button"
            className={form.type === "interval" ? "selected" : ""}
            onClick={() => setForm({ ...form, type: "interval" })}
          >
            <Repeat size={17} />
            Intervalo
          </button>

          <button
            type="button"
            className={form.type === "alarm" ? "selected" : ""}
            onClick={() => setForm({ ...form, type: "alarm" })}
          >
            <AlarmClock size={17} />
            Alarma
          </button>
        </div>
      </div>

      {form.type === "interval" ? (
        <label className="field">
          <span>Repetir cada</span>
          <select
            value={form.intervalMinutes ?? 60}
            onChange={(event) =>
              setForm({
                ...form,
                intervalMinutes: Number(event.target.value),
              })
            }
          >
            {INTERVALS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes < 60
                  ? `${minutes} minutos`
                  : minutes === 60
                    ? "60 minutos (1 hora)"
                    : `${minutes / 60} horas`}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="field">
            <span>Hora de ejecución</span>
            <input
              type="time"
              required
              value={form.timeOfDay ?? "08:00"}
              onChange={(event) =>
                setForm({ ...form, timeOfDay: event.target.value })
              }
            />
          </label>

          <div className="field">
            <span>Días de la semana</span>

            <div className="weekday-selector">
              {DAYS.map((day) => {
                const selected =
                  form.daysOfWeek?.includes(day.value) ?? false;

                return (
                  <button
                    key={day.value}
                    type="button"
                    title={day.name}
                    aria-label={day.name}
                    aria-pressed={selected}
                    className={selected ? "selected" : ""}
                    onClick={() => {
                      const current = form.daysOfWeek ?? [];

                      const days = selected
                        ? current.filter((value) => value !== day.value)
                        : [...current, day.value].sort((a, b) => a - b);

                      setForm({ ...form, daysOfWeek: days });
                    }}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <label className="schedule-enabled">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(event) =>
            setForm({ ...form, enabled: event.target.checked })
          }
        />
        Activar programación
      </label>

      <div className="schedule-form-actions">
        <button
          type="button"
          className="secondary-action"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="primary-action"
          disabled={saving}
        >
          <Check size={17} />
          {saving ? "Guardando..." : "Guardar programación"}
        </button>
      </div>
    </form>
  );
}
