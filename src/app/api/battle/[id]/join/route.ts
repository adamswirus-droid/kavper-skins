import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, battles } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { finishBattle, rollRounds } from "@/lib/server/battle";

export const dynamic = "force-dynamic";

// POST /api/battle/[id]/join { userId }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { userId } = await req.json().catch(() => ({} as { userId?: string }));
  if (!userId) return NextResponse.json({ error: "Brak userId" }, { status: 400 });

  try {
    const battle = await db.transaction(async (tx) => {
      const [battle] = await tx
        .select()
        .from(battles)
        .where(and(eq(battles.id, id), eq(battles.status, "open")))
        .for("update");
      if (!battle) throw new Error("NO_BATTLE");
      if (battle.p1Id === userId) throw new Error("OWN_BATTLE");

      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new Error("NO_USER");
      if (user.balanceCents < battle.costCents) throw new Error("NO_FUNDS");

      await tx
        .update(users)
        .set({
          balanceCents: sql`${users.balanceCents} - ${battle.costCents}`,
          totalSpentCents: sql`${users.totalSpentCents} + ${battle.costCents}`,
        })
        .where(eq(users.id, userId));

      const caseIds =
        battle.caseIds && battle.caseIds.length > 0
          ? battle.caseIds
          : Array.from({ length: battle.rounds }, () => battle.caseId);
      const p2Rolls = rollRounds(caseIds);
      return await finishBattle(tx, battle, { id: user.id, name: user.name, bot: false }, p2Rolls);
    });
    return NextResponse.json({ battle });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERR";
    if (msg === "NO_BATTLE") return NextResponse.json({ error: "Bitwa już zajęta" }, { status: 400 });
    if (msg === "OWN_BATTLE") return NextResponse.json({ error: "Nie możesz dołączyć do własnej bitwy" }, { status: 400 });
    if (msg === "NO_FUNDS") return NextResponse.json({ error: "Za mało środków" }, { status: 400 });
    if (msg === "NO_USER") return NextResponse.json({ error: "Nie znaleziono gracza" }, { status: 404 });
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
