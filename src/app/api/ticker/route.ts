import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, inventoryItems } from "@/db/schema";
import { desc, eq, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Ostatnie najlepsze dropy wszystkich graczy -> pasek "na żywo" w lobby
export async function GET() {
  const rows = await db
    .select({
      userName: users.name,
      name: inventoryItems.name,
      weapon: inventoryItems.weapon,
      rarity: inventoryItems.rarity,
      priceCents: inventoryItems.priceCents,
      createdAt: inventoryItems.createdAt,
    })
    .from(inventoryItems)
    .innerJoin(users, eq(inventoryItems.userId, users.id))
    .where(gt(inventoryItems.priceCents, 800))
    .orderBy(desc(inventoryItems.createdAt))
    .limit(30);
  return NextResponse.json({ drops: rows });
}
