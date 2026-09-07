import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, inventoryItems } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { findUpgradeTargetByChance, clampPct } from "@/lib/data";

export const dynamic = "force-dynamic";

export const UPGRADE_MAX_ITEMS = 10;

// POST { userId, itemIds: string[] (1-10) | itemId, pct, topUpCents? }
// Stawka = suma wartości wszystkich itemów + dopłata. Wygrana = jeden droższy skin.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  let itemIds: string[] = Array.isArray(body.itemIds) ? body.itemIds.filter((x: unknown) => typeof x === "string") : [];
  if (itemIds.length === 0 && typeof body.itemId === "string") itemIds = [body.itemId];
  itemIds = [...new Set(itemIds)].slice(0, UPGRADE_MAX_ITEMS);
  const pct = clampPct(Number(body.pct));
  const topUp = Math.max(0, Math.min(1_000_000_00, Math.round(Number(body.topUpCents) || 0)));
  if (!userId || itemIds.length === 0) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new Error("NO_USER");
      if (topUp > 0 && user.balanceCents < topUp) throw new Error("NO_FUNDS");

      const items = await tx
        .select()
        .from(inventoryItems)
        .where(and(eq(inventoryItems.userId, userId), inArray(inventoryItems.id, itemIds)))
        .for("update");
      if (items.length !== itemIds.length) throw new Error("NO_ITEM");

      const itemsCents = items.reduce((s, i) => s + i.priceCents, 0);
      const stakeCents = itemsCents + topUp;
      const plan = findUpgradeTargetByChance(stakeCents, pct);
      if (!plan) throw new Error("NO_TARGET");

      const roll = Math.random();
      const win = roll < plan.chance;

      await tx.delete(inventoryItems).where(inArray(inventoryItems.id, items.map((i) => i.id)));
      if (topUp > 0) {
        await tx
          .update(users)
          .set({
            balanceCents: sql`${users.balanceCents} - ${topUp}`,
            totalSpentCents: sql`${users.totalSpentCents} + ${topUp}`,
          })
          .where(eq(users.id, userId));
      }

      let gained = null;
      if (win) {
        const [row] = await tx
          .insert(inventoryItems)
          .values({
            userId,
            skinKey: plan.skin.key,
            name: plan.skin.name,
            weapon: plan.skin.weapon,
            rarity: plan.skin.rarity,
            priceCents: plan.priceCents,
            source: "upgrade",
          })
          .returning();
        gained = row;
        await tx
          .update(users)
          .set({ biggestWinCents: sql`greatest(${users.biggestWinCents}, ${plan.priceCents})` })
          .where(eq(users.id, userId));
      }

      return {
        win,
        chance: plan.chance,
        roll,
        skin: plan.skin,
        priceCents: plan.priceCents,
        gained,
        fromCents: itemsCents,
        itemCount: items.length,
        topUpCents: topUp,
        stakeCents,
        balanceCents: user.balanceCents - topUp,
      };
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERR";
    if (msg === "NO_ITEM") return NextResponse.json({ error: "Nie znaleziono przedmiotów" }, { status: 400 });
    if (msg === "NO_TARGET") return NextResponse.json({ error: "Brak celu dla tej szansy" }, { status: 400 });
    if (msg === "NO_FUNDS") return NextResponse.json({ error: "Za mało środków na dopłatę" }, { status: 400 });
    if (msg === "NO_USER") return NextResponse.json({ error: "Nie znaleziono gracza" }, { status: 404 });
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
