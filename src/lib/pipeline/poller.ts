import { runIngestion } from "./run";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

declare global {
  var __pulsePollerStarted: boolean | undefined;
}

export function startPoller() {
  if (global.__pulsePollerStarted) return;
  global.__pulsePollerStarted = true;

  const tick = () => {
    runIngestion()
      .then((result) => {
        console.log(
          `[pulse] ingestion run: ${result.signalsSeen} señales, ${result.pulsesGenerated} pulses` +
            (result.errors.length ? ` (errores: ${result.errors.join("; ")})` : "")
        );
      })
      .catch((err) => console.error("[pulse] ingestion run failed", err));
  };

  tick();
  setInterval(tick, POLL_INTERVAL_MS);
}
