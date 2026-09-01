import { runIngestion } from "./run";
import { dispatchNotifications } from "../push/dispatch";
import { dispatchDailyDigest } from "../push/digest";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

declare global {
  var __pulsePollerStarted: boolean | undefined;
}

export function startPoller() {
  if (global.__pulsePollerStarted) return;
  global.__pulsePollerStarted = true;

  const tick = async () => {
    try {
      const result = await runIngestion();
      console.log(
        `[pulse] ingestion run: ${result.signalsSeen} señales, ${result.pulsesGenerated} pulses` +
          (result.errors.length ? ` (errores: ${result.errors.join("; ")})` : "")
      );

      if (result.pulsesGenerated > 0) {
        const sent = await dispatchNotifications(result.ranAt);
        if (sent > 0) console.log(`[pulse] ${sent} notificación(es) push enviada(s)`);
      }
    } catch (err) {
      console.error("[pulse] ingestion run failed", err);
    }

    try {
      // Time-based, independent of whether this tick's ingestion produced
      // anything — only actually sends once the UTC hour matches (see
      // src/lib/push/digest.ts).
      const digestsSent = await dispatchDailyDigest();
      if (digestsSent > 0) console.log(`[pulse] ${digestsSent} resumen(es) diario(s) enviado(s)`);
    } catch (err) {
      console.error("[pulse] daily digest dispatch failed", err);
    }
  };

  tick();
  setInterval(tick, POLL_INTERVAL_MS);
}
