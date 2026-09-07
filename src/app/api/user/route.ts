import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, inventoryItems, battles } from "@/db/schema";
import { desc, eq, or } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// User payload BEZ passwordHash
function sanitize<T extends { passwordHash: string | null }>(u: T) {
  const { passwordHash: _ph, ...rest } = u;
  void _ph;
  return rest;
}

async function userPayload(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return null;
  const inventory = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.userId, id))
    .orderBy(desc(inventoryItems.priceCents), desc(inventoryItems.createdAt));
  const recentBattles = await db
    .select()
    .from(battles)
    .where(or(eq(battles.p1Id, id), eq(battles.p2Id, id)))
    .orderBy(desc(battles.createdAt))
    .limit(8);
  return { user: sanitize(user), inventory, recentBattles };
}

// GET /api/user?id=...
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });
  const payload = await userPayload(id);
  if (!payload) return NextResponse.json({ error: "Nie znaleziono gracza" }, { status: 404 });
  return NextResponse.json(payload);
}

// POST /api/user  { name, password, userId? }
// - z userId: szybki auto-login z localStorage (bez hasła)
// - bez userId: login nick+hasło, albo rejestracja nowego konta
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 18);
  const password = String(body.password ?? "");
  const existingId = typeof body.userId === "string" ? body.userId : null;

  if (existingId) {
    const payload = await userPayload(existingId);
    if (payload) return NextResponse.json(payload);
  }

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Nick musi mieć min. 2 znaki" }, { status: 400 });
  }
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "Hasło musi mieć min. 4 znaki" }, { status: 400 });
  }

  const [found] = await db.select().from(users).where(eq(users.name, name));

  if (found) {
    // Konto istnieje -> weryfikacja hasła
    if (!verifyPassword(password, found.passwordHash)) {
      return NextResponse.json({ error: "Złe hasło dla tego nicku" }, { status: 401 });
    }
    const payload = await userPayload(found.id);
    return NextResponse.json({ ...payload, loggedIn: true });
  }

  // Rejestracja nowego konta
  const [created] = await db
    .insert(users)
    .values({ name, passwordHash: hashPassword(password) })
    .onConflictDoNothing({ target: users.name })
    .returning();

  if (!created) {
    // wyścig: ktoś właśnie zajął nick -> potraktuj jak logowanie
    const [again] = await db.select().from(users).where(eq(users.name, name));
    if (!again || !verifyPassword(password, again.passwordHash)) {
      return NextResponse.json({ error: "Złe hasło dla tego nicku" }, { status: 401 });
    }
    const payload = await userPayload(again.id);
    return NextResponse.json({ ...payload, loggedIn: true });
  }

  const payload = await userPayload(created.id);
  return NextResponse.json({ ...payload, registered: true });
}
