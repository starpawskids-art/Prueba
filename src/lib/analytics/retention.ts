import db from "../db";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RetentionStats = {
  day: number;
  cohortSize: number;
  retainedCount: number;
  retentionRate: number; // 0-1
};

// Classic day-N cohort retention: of the users old enough for day N to have
// fully elapsed, what fraction had any visit in the [day N, day N+1) window
// after signup? Not cumulative ("came back at some point") — the doc's own
// D1/D7/D30 targets (>35%, >15-20%, >8-12%) are this stricter definition.
export function computeRetention(days: number[] = [1, 7, 30]): RetentionStats[] {
  const users = db.prepare(`SELECT id, created_at FROM users`).all() as Array<{
    id: string;
    created_at: number;
  }>;
  const now = Date.now();

  return days.map((day) => {
    const cohort = users.filter((u) => now - u.created_at >= (day + 1) * DAY_MS);

    let retained = 0;
    for (const u of cohort) {
      const windowStart = u.created_at + day * DAY_MS;
      const windowEnd = u.created_at + (day + 1) * DAY_MS;
      const visit = db
        .prepare(`SELECT 1 FROM visits WHERE user_id = ? AND visited_at >= ? AND visited_at < ? LIMIT 1`)
        .get(u.id, windowStart, windowEnd);
      if (visit) retained++;
    }

    return {
      day,
      cohortSize: cohort.length,
      retainedCount: retained,
      retentionRate: cohort.length > 0 ? retained / cohort.length : 0,
    };
  });
}

export type OverviewStats = {
  totalUsers: number;
  totalVisits: number;
  visitsLast24h: number;
  avgSessionsPerActiveUserLast7d: number;
};

export function computeOverview(): OverviewStats {
  const totalUsers = (db.prepare(`SELECT COUNT(*) as n FROM users`).get() as { n: number }).n;
  const totalVisits = (db.prepare(`SELECT COUNT(*) as n FROM visits`).get() as { n: number }).n;
  const visitsLast24h = (
    db.prepare(`SELECT COUNT(*) as n FROM visits WHERE visited_at >= ?`).get(Date.now() - DAY_MS) as {
      n: number;
    }
  ).n;

  const since7d = Date.now() - 7 * DAY_MS;
  const row = db
    .prepare(
      `SELECT COUNT(*) as visits, COUNT(DISTINCT user_id) as users FROM visits WHERE visited_at >= ?`
    )
    .get(since7d) as { visits: number; users: number };

  return {
    totalUsers,
    totalVisits,
    visitsLast24h,
    avgSessionsPerActiveUserLast7d: row.users > 0 ? row.visits / row.users : 0,
  };
}
