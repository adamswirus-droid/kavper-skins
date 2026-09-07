import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, battles } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { publicBattle } from "@/lib/server/battle";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const [battle] = await db.select().from(battles).where(eq(battles.id, id));
  if (!battle) return NextResponse.json({ error: "Nie znaleziono bitwy" }, { status: 404 });
  return NextResponse.json({ battle: publicBattle(battle) });
}

// Anulowanie otwartej bitwy przez twórcę (zwrot kasy)
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { userId } = await req.json().catch(() => ({} as { userId?: string }));
  if (!userId) return NextResponse.json({ error: "Brak userId" }, { status: 400 });

  try {
    await db.transaction(async (tx) => {
      const [battle] = await tx
        .select()
        .from(battles)
        .where(and(eq(battles.id, id), eq(battles.status, "open")))
        .for("update");
      if (!battle) throw new Error("NO_BATTLE");
      if (battle.p1Id !== userId) throw new Error("NOT_OWNER");
      await tx
        .update(users)
        .set({ balanceCents: sql`${users.balanceCents} + ${battle.costCents}` })
        .where(eq(users.id, userId));
      await tx.update(battles).set({ status: "cancelled" }).where(eq(battles.id, id));
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERR";
    if (msg === "NOT_OWNER") return NextResponse.json({ error: "Nie twoja bitwa" }, { status: 403 });
    if (msg === "NO_BATTLE") return NextResponse.json({ error: "Bitwa nie istnieje" }, { status: 404 });
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
