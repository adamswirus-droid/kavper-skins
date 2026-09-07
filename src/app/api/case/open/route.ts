import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, inventoryItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  getCase,
  rollItem,
  toCents,
  FREE_CASE_ID,
  FREE_MAX_BALANCE_CENTS,
  FREE_COOLDOWN_MS,
} from "@/lib/data";

export const dynamic = "force-dynamic";

// POST { userId, caseId, count? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, caseId } = body as { userId?: string; caseId?: string };
  const count = Math.max(1, Math.min(5, Number(body.count) || 1));
  const boost = body.boost === true;
  const caseDef = caseId ? getCase(caseId, boost) : undefined;
  if (!userId || !caseDef) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  const isFree = caseDef.free === true;

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new Error("NO_USER");

      const unit = toCents(caseDef.price);
      const n = isFree ? 1 : count;
      const totalCost = unit * n;

      if (isFree) {
        if (user.balanceCents >= FREE_MAX_BALANCE_CENTS) throw new Error("NOT_BROKE");
        const last = user.lastFreeCaseAt ? new Date(user.lastFreeCaseAt).getTime() : 0;
        const remaining = FREE_COOLDOWN_MS - (Date.now() - last);
        if (remaining > 0) {
          return { cooldownMs: remaining } as const;
        }
      } else if (user.balanceCents < totalCost) {
        throw new Error("NO_FUNDS");
      }

      const wonItems = Array.from({ length: n }, () => rollItem(caseDef));
      const bestCents = Math.max(...wonItems.map((w) => toCents(w.price)));

      await tx
        .update(users)
        .set({
          ...(totalCost > 0 ? { balanceCents: sql`${users.balanceCents} - ${totalCost}` } : {}),
          totalSpentCents: sql`${users.totalSpentCents} + ${totalCost}`,
          totalOpened: sql`${users.totalOpened} + ${n}`,
          biggestWinCents: sql`greatest(${users.biggestWinCents}, ${bestCents})`,
          ...(isFree ? { lastFreeCaseAt: new Date() } : {}),
        })
        .where(eq(users.id, userId));

      const rows = await tx
        .insert(inventoryItems)
        .values(
          wonItems.map((w) => ({
            userId,
            skinKey: w.key,
            name: w.name,
            weapon: w.weapon,
            rarity: w.rarity,
            priceCents: toCents(w.price),
            source: isFree ? "free" : boost ? "boost" : "case",
          }))
        )
        .returning();

      return {
        items: rows,
        balanceCents: user.balanceCents - totalCost,
        costCents: totalCost,
        count: n,
        boost,
      };
    });

    if ("cooldownMs" in result) {
      return NextResponse.json(
        { error: "Darmowa skrzynka na cooldownie", cooldownMs: result.cooldownMs },
        { status: 429 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERR";
    if (msg === "NO_FUNDS") return NextResponse.json({ error: "Za mało środków" }, { status: 400 });
    if (msg === "NOT_BROKE")
      return NextResponse.json({ error: "Darmowa skrzynka dostępna tylko poniżej 15 zł salda" }, { status: 400 });
    if (msg === "NO_USER") return NextResponse.json({ error: "Nie znaleziono gracza" }, { status: 404 });
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
