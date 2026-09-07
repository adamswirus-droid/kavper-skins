import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";

// Snapshot wylosowanego skina (np. w JSON bitew)
export interface RollItem {
  key: string;
  weapon: string;
  name: string;
  rarity: string;
  priceCents: number;
}

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  passwordHash: text("password_hash"), // scrypt: "salt:hash"
  balanceCents: integer("balance_cents").notNull().default(25000), // 250,00 zł start
  totalOpened: integer("total_opened").notNull().default(0),
  totalWonCents: integer("total_won_cents").notNull().default(0),
  totalSpentCents: integer("total_spent_cents").notNull().default(0),
  biggestWinCents: integer("biggest_win_cents").notNull().default(0),
  battlesWon: integer("battles_won").notNull().default(0),
  battlesPlayed: integer("battles_played").notNull().default(0),
  battlesDrawn: integer("battles_drawn").notNull().default(0), // remisy + tryb shared
  battleLostCents: integer("battle_lost_cents").notNull().default(0),
  lastFreeCaseAt: timestamp("last_free_case_at", { withTimezone: true }),
  lastDailyAt: timestamp("last_daily_at", { withTimezone: true }),
  dailyStreak: integer("daily_streak").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    skinKey: text("skin_key").notNull(),
    name: text("name").notNull(),
    weapon: text("weapon").notNull(),
    rarity: text("rarity").notNull(),
    priceCents: integer("price_cents").notNull(),
    source: text("source").notNull().default("case"), // case | battle | upgrade
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("inv_user_idx").on(t.userId)]
);

export const battles = pgTable(
  "battles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: text("case_id").notNull(), // pierwsza skrzynka (kompatybilność)
    caseIds: jsonb("case_ids").$type<string[]>().notNull().default([]),
    rounds: integer("rounds").notNull(),
    mode: text("mode").notNull().default("standard"), // standard | joker
    status: text("status").notNull().default("open"), // open | finished | cancelled
    costCents: integer("cost_cents").notNull(),
    p1Id: uuid("p1_id").notNull(),
    p1Name: text("p1_name").notNull(),
    p1Rolls: jsonb("p1_rolls").$type<RollItem[]>().notNull(),
    p2Id: uuid("p2_id"),
    p2Name: text("p2_name"),
    p2Bot: boolean("p2_bot").notNull().default(false),
    botKey: text("bot_key"),
    p2Rolls: jsonb("p2_rolls").$type<RollItem[]>(),
    winnerId: uuid("winner_id"),
    winnerName: text("winner_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("battles_status_idx").on(t.status)]
);

// Prawdziwe statystyki botów na serwerze (win rate liczony z wyników)
export const botStats = pgTable("bot_stats", {
  botKey: text("bot_key").primaryKey(),
  played: integer("played").notNull().default(0),
  won: integer("won").notNull().default(0),
});

export type DbUser = typeof users.$inferSelect;
export type DbInventoryItem = typeof inventoryItems.$inferSelect;
export type DbBattle = typeof battles.$inferSelect;
export type DbBotStats = typeof botStats.$inferSelect;
