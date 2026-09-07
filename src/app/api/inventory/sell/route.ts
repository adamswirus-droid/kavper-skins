import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, inventoryItems } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// POST { userId, itemIds: string[] }  -> sprzedaż zaznaczonych
// POST { userId, all: true }          -> sprzedaż wszystkich
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = body.userId as string | undefined;
  const itemIds = Array.isArray(body.itemIds) ? (body.itemIds as string[]) : null;
  const all = body.all === true;
  if (!userId || (!all && (!itemIds || itemIds.length === 0))) {
    return NextResponse.json({ error: "Nic do sprzedania" }, { status: 400 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, userId)).for("update");
      if (!user) throw new Error("NO_USER");

      const rows = all
        ? await tx.select().from(inventoryItems).where(eq(inventoryItems.userId, userId)).for("update")
        : await tx
            .select()
            .from(inventoryItems)
            .where(and(eq(inventoryItems.userId, userId), inArray(inventoryItems.id, itemIds!)))
            .for("update");

      if (rows.length === 0) throw new Error("EMPTY");
      const total = rows.reduce((s, r) => s + r.priceCents, 0);
      const ids = rows.map((r) => r.id);
      await tx.delete(inventoryItems).where(inArray(inventoryItems.id, ids));
      const [updated] = await tx
        .update(users)
        .set({ balanceCents: sql`${users.balanceCents} + ${total}` })
        .where(eq(users.id, userId))
        .returning();
      return { sold: rows.length, totalCents: total, balanceCents: updated.balanceCents };
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERR";
    if (msg === "EMPTY") return NextResponse.json({ error: "Nie znaleziono przedmiotów" }, { status: 400 });
    if (msg === "NO_USER") return NextResponse.json({ error: "Nie znaleziono gracza" }, { status: 404 });
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
