import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const top = await db
    .select()
    .from(users)
    .orderBy(desc(users.balanceCents))
    .limit(25);
  const byWins = await db
    .select()
    .from(users)
    .orderBy(desc(users.biggestWinCents))
    .limit(10);
  return NextResponse.json({ top, byWins });
}
