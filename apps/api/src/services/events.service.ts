import { EventEmitter } from "node:events";

export type SpeedTestEvent =
  | "speedtest.started"
  | "speedtest.completed"
  | "speedtest.failed"
  | "schedule.completed"
  | "schedule.failed"
  | "schedule.updated";

export interface NetPulseEvent {
  type: SpeedTestEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export function publishEvent(
  type: SpeedTestEvent,
  data: Record<string, unknown> = {},
): void {
  const event: NetPulseEvent = {
    type,
    timestamp: new Date().toISOString(),
    data,
  };

  emitter.emit("netpulse", event);
}

export function subscribeToEvents(
  listener: (event: NetPulseEvent) => void,
): () => void {
  emitter.on("netpulse", listener);

  return () => {
    emitter.off("netpulse", listener);
  };
}
