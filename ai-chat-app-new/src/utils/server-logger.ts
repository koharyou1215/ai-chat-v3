/**
 * Send logs to server-side so they appear in the terminal instead of browser console.
 */
export function serverLog(label: string, details?: unknown): void {
  try {
    // Fire-and-forget; no await to avoid blocking UI
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, details, ts: new Date().toISOString() }),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {
    // ignore
  }
}
