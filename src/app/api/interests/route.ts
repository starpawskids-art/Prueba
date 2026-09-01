import { NextResponse } from "next/server";
import { getOrCreateUserId, getUser, setCustomInterests, setInterests, setLanguage } from "@/lib/user";
import { isLanguage, MAX_CUSTOM_INTERESTS, TOPICS } from "@/lib/types";
import { sanitizeCustomTopic } from "@/lib/moderation";

export async function POST(request: Request) {
  const userId = await getOrCreateUserId();
  const body = (await request.json()) as {
    interests?: string[];
    customInterests?: string[];
    language?: string;
  };

  // Each field is independently patchable — a caller that only sends
  // `interests` (e.g. a topic chip toggle in Profile) must not wipe out
  // custom interests or language set elsewhere.
  let interests: string[] | undefined;
  if (body.interests !== undefined) {
    interests = body.interests.filter((i) => TOPICS.includes(i as (typeof TOPICS)[number]));
    setInterests(userId, interests);
  }

  let customInterests: string[] | undefined;
  const rejected: Array<{ value: string; reason: string }> = [];
  if (body.customInterests !== undefined) {
    customInterests = [];
    for (const raw of body.customInterests.slice(0, MAX_CUSTOM_INTERESTS)) {
      const result = sanitizeCustomTopic(raw);
      if (result.ok) {
        if (!customInterests.includes(result.value)) customInterests.push(result.value);
      } else {
        rejected.push({ value: raw, reason: result.reason });
      }
    }
    setCustomInterests(userId, customInterests);
  }

  if (body.language !== undefined) {
    setLanguage(userId, body.language && isLanguage(body.language) ? body.language : null);
  }

  return NextResponse.json({ ok: true, interests, customInterests, rejected });
}

export async function GET() {
  const userId = await getOrCreateUserId();
  const user = getUser(userId);
  return NextResponse.json({
    interests: user?.interests ?? [],
    customInterests: user?.customInterests ?? [],
    language: user?.language ?? null,
  });
}
