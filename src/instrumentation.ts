// Starts the ingestion poller when the Next.js server process boots.
// This is what keeps PULSE's "what changed" signal genuinely live instead
// of computed once at build time — see lib/pipeline/run.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startPoller } = await import("./lib/pipeline/poller");
  startPoller();
}
