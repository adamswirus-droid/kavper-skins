import { db } from "@/db";
import { users, battles, inventoryItems, botStats, type RollItem, type DbBattle } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCase, parseRoundCase, rollItem, toCents, battleWinner, BOTS } from "@/lib/data";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function rollSnapshot(token: string): RollItem {
  const { id, boost } = parseRoundCase(token);
  const c = getCase(id, boost);
  if (!c) throw new Error("NO_CASE");
  const s = rollItem(c);
  return { key: s.key, weapon: s.weapon, name: s.name, rarity: s.rarity, priceCents: toCents(s.price) };
}

// Uczciwe rolki — te same dla graczy i botów. Po jednej na każdą skrzynkę z listy.
export function rollRounds(caseIds: string[]): RollItem[] {
  return caseIds.map((id) => rollSnapshot(id));
}

export const getBot = (key?: string | null) =>
  BOTS.find((b) => b.key === key) ?? BOTS[Math.floor(Math.random() * BOTS.length)];

export const sumRolls = (rolls: RollItem[]) => rolls.reduce((s, r) => s + r.priceCents, 0);

async function grantItems(tx: Tx, userId: string, items: RollItem[], source: string) {
  if (items.length === 0) return;
  await tx.insert(inventoryItems).values(
    items.map((r) => ({
      userId,
      skinKey: r.key,
      weapon: r.weapon,
      name: r.name,
      rarity: r.rarity,
      priceCents: r.priceCents,
      source,
    }))
  );
}

// Rozstrzyga bitwę: liczy zwycięzcę (albo dzieli pulę w trybie shared),
// wypłaca nagrody / zwroty, aktualizuje statystyki graczy i botów, zamyka bitwę.
export async function finishBattle(
  tx: Tx,
  battle: DbBattle,
  p2: { id: string | null; name: string; bot: boolean; botKey?: string | null },
  p2Rolls: RollItem[]
): Promise<DbBattle> {
  const p1Total = sumRolls(battle.p1Rolls);
  const p2Total = sumRolls(p2Rolls);
  const pot = p1Total + p2Total;
  const isShared = battle.mode === "shared";

  let winnerId: string | null = null;
  let winnerName: string | null = null;

  // obaj zagrali
  await tx
    .update(users)
    .set({ battlesPlayed: sql`${users.battlesPlayed} + 1` })
    .where(eq(users.id, battle.p1Id));
  if (p2.id) {
    await tx
      .update(users)
      .set({ battlesPlayed: sql`${users.battlesPlayed} + 1` })
      .where(eq(users.id, p2.id));
  }

  if (isShared) {
    // ---------------- TRYB SHARED / DRUŻYNA ----------------
    // Pula wszystkich dropów dzielona dokładnie 50/50 po wartości w zł.
    const half1 = Math.floor(pot / 2);
    const half2 = pot - half1;
    await tx
      .update(users)
      .set({
        balanceCents: sql`${users.balanceCents} + ${half1}`,
        totalWonCents: sql`${users.totalWonCents} + ${half1}`,
        battlesDrawn: sql`${users.battlesDrawn} + 1`,
        biggestWinCents: sql`greatest(${users.biggestWinCents}, ${half1})`,
      })
      .where(eq(users.id, battle.p1Id));
    if (p2.id) {
      await tx
        .update(users)
        .set({
          balanceCents: sql`${users.balanceCents} + ${half2}`,
          totalWonCents: sql`${users.totalWonCents} + ${half2}`,
          battlesDrawn: sql`${users.battlesDrawn} + 1`,
          biggestWinCents: sql`greatest(${users.biggestWinCents}, ${half2})`,
        })
        .where(eq(users.id, p2.id));
    }
  } else {
    // ---------------- STANDARD / JOKER ----------------
    const result = battleWinner(p1Total, p2Total, battle.mode);

    if (result === "tie") {
      await tx
        .update(users)
        .set({
          balanceCents: sql`${users.balanceCents} + ${battle.costCents}`,
          battlesDrawn: sql`${users.battlesDrawn} + 1`,
        })
        .where(eq(users.id, battle.p1Id));
      if (p2.id) {
        await tx
          .update(users)
          .set({
            balanceCents: sql`${users.balanceCents} + ${battle.costCents}`,
            battlesDrawn: sql`${users.battlesDrawn} + 1`,
          })
          .where(eq(users.id, p2.id));
      }
    } else {
      if (result === "p1") {
        winnerId = battle.p1Id;
        winnerName = battle.p1Name;
      } else {
        winnerId = p2.id;
        winnerName = p2.name;
      }
      if (winnerId) {
        const all = [...battle.p1Rolls, ...p2Rolls];
        await grantItems(tx, winnerId, all, "battle");
        await tx
          .update(users)
          .set({
            battlesWon: sql`${users.battlesWon} + 1`,
            totalWonCents: sql`${users.totalWonCents} + ${pot}`,
            biggestWinCents: sql`greatest(${users.biggestWinCents}, ${pot})`,
          })
          .where(eq(users.id, winnerId));
      }
      const loserId = winnerId === battle.p1Id ? p2.id : battle.p1Id;
      if (loserId) {
        await tx
          .update(users)
          .set({ battleLostCents: sql`${users.battleLostCents} + ${battle.costCents}` })
          .where(eq(users.id, loserId));
      }

      // PRAWDZIWY win rate bota: zapis wyniku do statystyk serwera
      if (p2.bot && p2.botKey) {
        const botWon = result === "p2" ? 1 : 0;
        await tx
          .insert(botStats)
          .values({ botKey: p2.botKey, played: 1, won: botWon })
          .onConflictDoUpdate({
            target: botStats.botKey,
            set: {
              played: sql`${botStats.played} + 1`,
              won: sql`${botStats.won} + ${botWon}`,
            },
          });
      }
    }
  }

  const [updated] = await tx
    .update(battles)
    .set({
      status: "finished",
      p2Id: p2.id,
      p2Name: p2.name,
      p2Bot: p2.bot,
      botKey: p2.botKey ?? null,
      p2Rolls,
      winnerId,
      winnerName,
      finishedAt: new Date(),
    })
    .where(eq(battles.id, battle.id))
    .returning();
  return updated;
}

export function publicBattle(b: DbBattle) {
  // Ukryj rolki dopóki bitwa nierozstrzygnięta (suspense)
  if (b.status === "open") return { ...b, p1Rolls: [], p2Rolls: null };
  return b;
}
