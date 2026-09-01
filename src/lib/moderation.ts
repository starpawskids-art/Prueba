// Lightweight blocklist for free-text custom interests entered at
// onboarding/profile. This is an MVP starting point (see README) — before
// a real public launch this should be replaced by (or backed by) a proper
// moderation API/service, per the product doc's own moderation & legal
// review requirement.

const MIN_LENGTH = 2;
const MAX_LENGTH = 40;

// Word-stem fragments, matched against a normalized (lowercased,
// accent-stripped) string. Kept intentionally broad/conservative — a false
// positive just means the user tries a different phrasing.
const BLOCKED_PATTERNS: RegExp[] = [
  // sexual/explicit content (ES + EN)
  /\bporn\w*/i,
  /\bxxx\b/i,
  /\bsex\w*/i,
  /\besc[oó]rt\w*/i,
  /\bnud\w*/i,
  /\bhentai\b/i,
  /\bonlyfans\b/i,
  // graphic self-harm / violence promotion
  /\bsuicid\w*/i,
  /\bself.?harm\w*/i,
  /\bautolesi\w*/i,
  // slurs / hate speech — generic catch, extend as needed
  /\bnazi\w*/i,
  /\bhate ?speech\b/i,
];

function normalize(input: string): string {
  return input
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

export type ModerationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

export function sanitizeCustomTopic(raw: string): ModerationResult {
  const normalized = normalize(raw);

  if (normalized.length < MIN_LENGTH) {
    return { ok: false, reason: "Escribe al menos 2 caracteres." };
  }
  if (normalized.length > MAX_LENGTH) {
    return { ok: false, reason: `Máximo ${MAX_LENGTH} caracteres.` };
  }
  if (BLOCKED_PATTERNS.some((re) => re.test(normalized))) {
    return { ok: false, reason: "Ese tema no está permitido en PULSE." };
  }

  return { ok: true, value: normalized };
}
