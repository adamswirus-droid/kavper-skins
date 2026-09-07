import { NextResponse } from "next/server";
import { pool } from "@/db";

export const dynamic = "force-dynamic";

// Jednorazowa inicjalizacja bazy po wdrożeniu (np. na Vercel + Neon):
// otwórz https://TWOJA-DOMENA/api/setup — utworzy tabele, jeśli ich nie ma.
// Bezpieczne do wielokrotnego wywołania (IF NOT EXISTS).
const SQL = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  password_hash text,
  balance_cents integer NOT NULL DEFAULT 25000,
  total_opened integer NOT NULL DEFAULT 0,
  total_won_cents integer NOT NULL DEFAULT 0,
  total_spent_cents integer NOT NULL DEFAULT 0,
  biggest_win_cents integer NOT NULL DEFAULT 0,
  battles_won integer NOT NULL DEFAULT 0,
  battles_played integer NOT NULL DEFAULT 0,
  battles_drawn integer NOT NULL DEFAULT 0,
  battle_lost_cents integer NOT NULL DEFAULT 0,
  last_free_case_at timestamptz,
  last_daily_at timestamptz,
  daily_streak integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skin_key text NOT NULL,
  name text NOT NULL,
  weapon text NOT NULL,
  rarity text NOT NULL,
  price_cents integer NOT NULL,
  source text NOT NULL DEFAULT 'case',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inv_user_idx ON inventory_items(user_id);
CREATE TABLE IF NOT EXISTS battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text NOT NULL,
  case_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  rounds integer NOT NULL,
  mode text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'open',
  cost_cents integer NOT NULL,
  p1_id uuid NOT NULL,
  p1_name text NOT NULL,
  p1_rolls jsonb NOT NULL,
  p2_id uuid,
  p2_name text,
  p2_bot boolean NOT NULL DEFAULT false,
  bot_key text,
  p2_rolls jsonb,
  winner_id uuid,
  winner_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS battles_status_idx ON battles(status);
CREATE TABLE IF NOT EXISTS bot_stats (
  bot_key text PRIMARY KEY,
  played integer NOT NULL DEFAULT 0,
  won integer NOT NULL DEFAULT 0
);
`;

export async function GET() {
  try {
    await pool.query(SQL);
    const r = await pool.query("SELECT count(*)::int AS users FROM users");
    return NextResponse.json({ ok: true, message: "Baza gotowa. Możesz grać!", users: r.rows[0].users });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Błąd" }, { status: 500 });
  }
}
