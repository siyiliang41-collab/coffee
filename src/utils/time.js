// All time strings are LOCAL (no timezone suffix), avoiding UTC shift issues.

export function pad(n) {
  return String(n).padStart(2, '0');
}

/** "2026-05-20" */
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "2026-05-20T10:58" (local, for datetime-local input) */
export function nowLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "2026-05-20T10:58:30" (full local ISO-like string) */
export function toLocalISO(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Parse a local datetime string like "2026-05-20T10:58" into a Date */
export function parseLocal(str) {
  return new Date(str);
}
