// Tiny app-wide event bus used for lightweight realtime notifications.
import { EventEmitter } from "node:events";

const globalForRealtime = globalThis;

if (!globalForRealtime.__inventoryRealtime) {
  globalForRealtime.__inventoryRealtime = new EventEmitter();
}

export const realtimeBus = globalForRealtime.__inventoryRealtime;

// Emits a realtime event to any in-process listeners.
export function emitRealtime(event, payload) {
  realtimeBus.emit(event, payload);
}
