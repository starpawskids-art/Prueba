// Lightweight blocklist for free-text user input (custom interests,
// usernames, bios, comments). This is an MVP starting point (see README)
// — before a real public launch this should be replaced by (or backed by)
// a proper moderation API/service, per the product doc's own moderation &
// legal review requirement.

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

// Route segments and brand terms a username could otherwise collide with
// or impersonate.
const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "pulse",
  "fate",
  "unknown",
  "onboarding",
  "profile",
  "explore",
  "saved",
  "following",
  "u",
  "me",
  "root",
  "support",
  "help",
  "moderacion",
  "moderator",
]);

// Only for matching against the blocklist — accent-stripped so "büsqueda"
// tricks don't slip past "busqueda". Never used as the value we store or
// display: that would silently mangle correctly-accented input like
// "tecnología" into "tecnologia".
function normalizeForMatching(input: string): string {
  return input
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

// What actually gets stored: trimmed and whitespace-collapsed, but the
// user's real spelling (accents, case) preserved.
function cleanValue(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function containsBlocked(input: string): boolean {
  return BLOCKED_PATTERNS.some((re) => re.test(normalizeForMatching(input)));
}

export type ModerationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

export function sanitizeCustomTopic(raw: string): ModerationResult {
  const value = cleanValue(raw);
  if (value.length < 2) return { ok: false, reason: "Escribe al menos 2 caracteres." };
  if (value.length > 40) return { ok: false, reason: "Máximo 40 caracteres." };
  if (containsBlocked(value)) return { ok: false, reason: "Ese tema no está permitido en PULSE." };
  return { ok: true, value };
}

// Usernames are ASCII-only (used directly in /u/[username] URLs), unlike
// the other free-text fields here.
export function sanitizeUsername(raw: string): ModerationResult {
  const value = raw.trim().toLowerCase();
  if (value.length < 3) return { ok: false, reason: "Mínimo 3 caracteres." };
  if (value.length > 20) return { ok: false, reason: "Máximo 20 caracteres." };
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    return { ok: false, reason: "Solo letras, números y guion bajo — debe empezar por una letra." };
  }
  if (RESERVED_USERNAMES.has(value)) return { ok: false, reason: "Ese nombre de usuario no está disponible." };
  if (containsBlocked(value)) return { ok: false, reason: "Ese nombre de usuario no está permitido." };
  return { ok: true, value };
}

export function sanitizeBio(raw: string): ModerationResult {
  const value = cleanValue(raw);
  if (value.length > 160) return { ok: false, reason: "Máximo 160 caracteres." };
  if (containsBlocked(value)) return { ok: false, reason: "Ese texto no está permitido en PULSE." };
  return { ok: true, value };
}

export function sanitizeCommentBody(raw: string): ModerationResult {
  const value = cleanValue(raw);
  if (value.length < 2) return { ok: false, reason: "Escribe al menos 2 caracteres." };
  if (value.length > 500) return { ok: false, reason: "Máximo 500 caracteres." };
  if (containsBlocked(value)) return { ok: false, reason: "Ese comentario no está permitido en PULSE." };
  return { ok: true, value };
}
