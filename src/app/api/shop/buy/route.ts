import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, inventoryItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { SHOP_SKINS, SHOP_MARKUP, toCents } from "@/lib/data";

export const dynamic = "force-dynamic";

// POST { userId, skinKey }  — kup skina za saldo (cena = wartość × 1.1)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, skinKey } = body as { userId?: string; skinKey?: string };
  const skin = SHOP_SKINS.find((s) => s.key === skinKey);
  if (!userId || !skin) return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });

  const valueCents = toCents(skin.price);
  const priceCents = Math.round(valueCents * SHOP_MARKUP);

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new Error("NO_USER");
      if (user.balanceCents < priceCents) throw new Error("NO_FUNDS");

      await tx
        .update(users)
        .set({
          balanceCents: sql`${users.balanceCents} - ${priceCents}`,
          totalSpentCents: sql`${users.totalSpentCents} + ${priceCents}`,
        })
        .where(eq(users.id, userId));

      const [row] = await tx
        .insert(inventoryItems)
        .values({
          userId,
          skinKey: skin.key,
          name: skin.name,
          weapon: skin.weapon,
          rarity: skin.rarity,
          priceCents: valueCents,
          source: "shop",
        })
        .returning();

      return { item: row, paidCents: priceCents, balanceCents: user.balanceCents - priceCents };
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERR";
    if (msg === "NO_FUNDS") return NextResponse.json({ error: "Za mało środków" }, { status: 400 });
    if (msg === "NO_USER") return NextResponse.json({ error: "Nie znaleziono gracza" }, { status: 404 });
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
