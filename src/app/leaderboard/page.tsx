"use client";

import { useEffect, useState } from "react";
import type { DbUser } from "@/db/schema";
import { formatPLN } from "@/lib/data";
import { useApp } from "@/components/app";
import { Crown, Flame, Medal, Package, Swords, Trophy } from "lucide-react";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={16} className="text-gold" />;
  if (rank === 2) return <Medal size={16} className="text-slate-300" />;
  if (rank === 3) return <Medal size={16} className="text-amber-600" />;
  return <span className="w-4 text-center text-xs font-bold text-white/30">{rank}</span>;
}

export default function LeaderboardPage() {
  const { user } = useApp();
  const [top, setTop] = useState<DbUser[]>([]);
  const [byWins, setByWins] = useState<DbUser[]>([]);

  useEffect(() => {
    const load = () =>
      fetch("/api/leaderboard", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          setTop(d.top ?? []);
          setByWins(d.byWins ?? []);
        })
        .catch(() => undefined);
    void load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div>
      <h1 className="font-display text-xl font-black tracking-wide text-white sm:text-2xl">RANKING</h1>
      <p className="mt-1 text-xs text-white/40">Lokalna tabela wyników serwera — odświeża się na żywo co 8 s.</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        {/* Najbogatsi */}
        <div className="panel overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <Trophy size={15} className="text-gold" />
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/50">Najbogatsi gracze</span>
          </div>
          {top.length === 0 ? (
            <p className="py-10 text-center text-xs text-white/30">Brak graczy — bądź pierwszy!</p>
          ) : (
            <div className="divide-y divide-white/5">
              {top.map((u, i) => {
                const me = u.id === user?.id;
                return (
                  <div
                    key={u.id}
                    className={`flex items-center gap-3 px-4 py-3 ${me ? "bg-gold/8" : ""}`}
                  >
                    <RankBadge rank={i + 1} />
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-black ${i === 0 ? "bg-gold text-[#ffffff]" : "bg-white/8 text-white/70"}`}>
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-white">
                        {u.name}
                        {me && <span className="ml-1.5 rounded bg-gold/20 px-1.5 py-0.5 text-[9px] font-black text-gold">TY</span>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[10px] text-white/35">
                        <span className="flex items-center gap-1"><Package size={10} /> {u.totalOpened} otwartych</span>
                        <span className="flex items-center gap-1"><Swords size={10} /> {u.battlesWon} wygranych bitew</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black tabular-nums text-gold">{formatPLN(u.balanceCents)}</div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-white/25">saldo</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Największe wygrane */}
        <div className="panel overflow-hidden h-fit">
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <Flame size={15} className="text-red-400" />
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/50">Największe wygrane</span>
          </div>
          {byWins.length === 0 ? (
            <p className="py-10 text-center text-xs text-white/30">Nikt jeszcze nic nie wygrał.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {byWins.filter((u) => u.biggestWinCents > 0).map((u, i) => {
                const me = u.id === user?.id;
                return (
                  <div key={u.id} className={`flex items-center gap-3 px-4 py-2.5 ${me ? "bg-gold/8" : ""}`}>
                    <RankBadge rank={i + 1} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/80">{u.name}</span>
                    <span className="text-sm font-black tabular-nums text-white/85">{formatPLN(u.biggestWinCents)}</span>
                  </div>
                );
              })}
              {byWins.every((u) => u.biggestWinCents === 0) && (
                <p className="py-8 text-center text-xs text-white/30">Otwórz skrzynkę, żeby się zapisać!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
