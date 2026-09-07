import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, battles } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getCase, parseRoundCase, toCents } from "@/lib/data";
import { finishBattle, getBot, publicBattle, rollRounds } from "@/lib/server/battle";
import { botStats } from "@/db/schema";

export const dynamic = "force-dynamic";

// GET /api/battle?userId=  -> otwarte + ostatnie zakończone + prawdziwe staty botów
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  const open = await db.select().from(battles).where(eq(battles.status, "open")).orderBy(desc(battles.createdAt)).limit(30);
  const finished = await db.select().from(battles).where(eq(battles.status, "finished")).orderBy(desc(battles.finishedAt)).limit(20);
  const stats = await db.select().from(botStats);
  return NextResponse.json({
    open: open.map(publicBattle),
    finished,
    botStats: stats,
    userId,
  });
}

// POST /api/battle { userId, caseIds: string[] (1-5), mode, vsBot }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, vsBot } = body as { userId?: string; vsBot?: boolean };
  const rawIds = Array.isArray(body.caseIds) ? (body.caseIds as string[]) : [];
  // kompatybilność: single caseId + rounds
  let caseIds = rawIds.filter((id) => typeof id === "string");
  if (caseIds.length === 0 && body.caseId) {
    const r = Math.max(1, Math.min(3, Number(body.rounds) || 1));
    caseIds = Array.from({ length: r }, () => String(body.caseId));
  }
  caseIds = caseIds.slice(0, 5);
  const defs = caseIds.map((tok) => {
    const { id, boost } = parseRoundCase(tok);
    return getCase(id, boost);
  });
  const mode = body.mode === "joker" ? "joker" : body.mode === "shared" ? "shared" : "standard";
  const bot = getBot(typeof body.botKey === "string" ? body.botKey : null);
  if (!userId || caseIds.length === 0 || defs.some((d) => !d || d.free)) {
    return NextResponse.json({ error: "Nieprawidłowe skrzynki" }, { status: 400 });
  }

  const rounds = caseIds.length;
  const costCents = defs.reduce((s, d) => s + toCents(d!.price), 0);

  try {
    const battle = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new Error("NO_USER");
      if (user.balanceCents < costCents) throw new Error("NO_FUNDS");

      await tx
        .update(users)
        .set({
          balanceCents: sql`${users.balanceCents} - ${costCents}`,
          totalSpentCents: sql`${users.totalSpentCents} + ${costCents}`,
        })
        .where(eq(users.id, userId));

      const p1Rolls = rollRounds(caseIds);
      const [row] = await tx
        .insert(battles)
        .values({
          caseId: parseRoundCase(caseIds[0]).id,
          caseIds,
          rounds,
          mode,
          status: "open",
          costCents,
          p1Id: user.id,
          p1Name: user.name,
          p1Rolls,
        })
        .returning();

      if (vsBot) {
        // Uczciwe losowanie bota — dokładnie te same szanse co gracz
        const p2Rolls = rollRounds(caseIds);
        return await finishBattle(tx, row, { id: null, name: bot.name, bot: true, botKey: bot.key }, p2Rolls);
      }
      return row;
    });

    return NextResponse.json({ battle, costCents });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERR";
    if (msg === "NO_FUNDS") return NextResponse.json({ error: "Za mało środków" }, { status: 400 });
    if (msg === "NO_USER") return NextResponse.json({ error: "Nie znaleziono gracza" }, { status: 404 });
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
