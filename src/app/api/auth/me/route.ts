import { NextResponse } from "next/server";
import { getOrCreateUserId, isAuthenticated } from "@/lib/user";
import { getEmailForUser } from "@/lib/auth";

export async function GET() {
  const authenticated = await isAuthenticated();
  if (!authenticated) return NextResponse.json({ authenticated: false, email: null });

  const userId = await getOrCreateUserId();
  return NextResponse.json({ authenticated: true, email: getEmailForUser(userId) });
}
