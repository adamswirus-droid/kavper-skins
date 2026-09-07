import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { DAILY_COOLDOWN_MS, rollDaily } from "@/lib/data";

export const dynamic = "force-dynamic";

// GET /api/daily?userId= -> stan cooldownu
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Brak userId" }, { status: 400 });
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return NextResponse.json({ error: "Nie znaleziono gracza" }, { status: 404 });
  const last = user.lastDailyAt ? new Date(user.lastDailyAt).getTime() : 0;
  const remainingMs = Math.max(0, DAILY_COOLDOWN_MS - (Date.now() - last));
  return NextResponse.json({ remainingMs, streak: user.dailyStreak });
}

// POST { userId } -> odbierz daily chest
export async function POST(req: NextRequest) {
  const { userId } = await req.json().catch(() => ({}) as { userId?: string });
  if (!userId) return NextResponse.json({ error: "Brak userId" }, { status: 400 });

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new Error("NO_USER");
      const last = user.lastDailyAt ? new Date(user.lastDailyAt).getTime() : 0;
      const since = Date.now() - last;
      if (since < DAILY_COOLDOWN_MS) return { remainingMs: DAILY_COOLDOWN_MS - since } as const;

      // streak: odebrany w ciągu 48h od poprzedniego -> +1, inaczej reset
      const streak = last > 0 && since < DAILY_COOLDOWN_MS * 2 ? user.dailyStreak + 1 : 1;
      const reward = rollDaily();
      // bonus za serię: +10% za każdy dzień (max +50%)
      const bonusPct = Math.min(50, (streak - 1) * 10);
      const cents = Math.round(reward.cents * (1 + bonusPct / 100));

      const [updated] = await tx
        .update(users)
        .set({
          balanceCents: sql`${users.balanceCents} + ${cents}`,
          lastDailyAt: new Date(),
          dailyStreak: streak,
        })
        .where(eq(users.id, userId))
        .returning();

      return { cents, baseCents: reward.cents, bonusPct, streak, balanceCents: updated.balanceCents };
    });
    if ("remainingMs" in result) {
      return NextResponse.json({ error: "Daily już odebrany", remainingMs: result.remainingMs }, { status: 429 });
    }
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERR";
    if (msg === "NO_USER") return NextResponse.json({ error: "Nie znaleziono gracza" }, { status: 404 });
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
