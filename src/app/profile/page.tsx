"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DbBattle } from "@/db/schema";
import { CASE_MAP, formatPLN } from "@/lib/data";
import { useApp } from "@/components/app";
import { sfx } from "@/lib/sound";
import {
  Backpack,
  CalendarDays,
  Copy,
  CreditCard,
  Crown,
  Ghost,
  PackageOpen,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `${color}1c`, color }}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{label}</span>
        <span className="block truncate text-base font-black tabular-nums text-white">{value}</span>
        {sub && <span className="block text-[10px] font-semibold text-white/35">{sub}</span>}
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const { user, inventory, toast, refresh } = useApp();
  const [recent, setRecent] = useState<DbBattle[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/user?id=${user.id}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setRecent(data.recentBattles ?? []);
    } catch {
      /* noop */
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  const invValue = inventory.reduce((s, i) => s + i.priceCents, 0);
  const played = user.battlesPlayed;
  const won = user.battlesWon;
  const drawn = user.battlesDrawn;
  const lost = Math.max(0, played - won - drawn);
  const decisive = played - drawn;
  const wr = decisive > 0 ? Math.round((won / decisive) * 100) : 0;
  const memberDate = new Date(user.createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      sfx.coin();
      toast("Skopiowano link — wyślij znajomym!", "win");
    } catch {
      toast("Nie udało się skopiować", "err");
    }
  };

  return (
    <div>
      {/* nagłówek */}
      <div className="panel relative overflow-hidden p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold/10 blur-[70px]" />
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#6fb1ff] to-[#2563eb] text-2xl font-black text-[#ffffff] shadow-[0_10px_40px_-10px_rgba(37,99,235,.5)]">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display truncate text-2xl font-black tracking-wide text-white">{user.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
              <CalendarDays size={12} /> gra od {memberDate}
            </p>
          </div>
          <button onClick={() => void copyLink()} className="btn-ghost text-xs">
            <Copy size={14} /> Zaproś znajomych
          </button>
        </div>
      </div>

      {/* win rate */}
      <div className="panel mt-4 p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative grid h-28 w-28 place-items-center">
            <svg viewBox="0 0 112 112" className="absolute inset-0 -rotate-90">
              <circle cx="56" cy="56" r="46" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="10" />
              <circle
                cx="56" cy="56" r="46" fill="none"
                stroke={wr >= 50 ? "#22c55e" : "#eb4b4b"}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(wr / 100) * 2 * Math.PI * 46} ${2 * Math.PI * 46}`}
                style={{ transition: "stroke-dasharray .8s ease" }}
              />
            </svg>
            <div className="text-center">
              <div className="font-display text-2xl font-black tabular-nums text-white">{played > 0 ? `${wr}%` : "—"}</div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">WIN RATE</div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Target size={15} className="text-gold" />
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Bitwy</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
              <div>
                <span className="text-xl font-black text-green-400">{won}</span>
                <span className="ml-1.5 text-[10px] font-bold uppercase text-white/35">wygrane</span>
              </div>
              <div>
                <span className="text-xl font-black text-red-400">{lost}</span>
                <span className="ml-1.5 text-[10px] font-bold uppercase text-white/35">przegrane</span>
              </div>
              <div>
                <span className="text-xl font-black text-white/80">{played}</span>
                <span className="ml-1.5 text-[10px] font-bold uppercase text-white/35">łącznie</span>
              </div>
              <div>
                <span className="text-xl font-black text-emerald-400/80">{drawn}</span>
                <span className="ml-1.5 text-[10px] font-bold uppercase text-white/35">remisy/drużyny</span>
              </div>
            </div>
            <div className="mt-3 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-white/6">
              <div className="flex h-full">
                <div className="bg-green-500 transition-all duration-700" style={{ width: played ? `${(won / played) * 100}%` : "0%" }} />
                <div className="bg-red-500/70 transition-all duration-700" style={{ width: played ? `${(lost / played) * 100}%` : "0%" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* statystyki */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Saldo" value={formatPLN(user.balanceCents)} color="#2563eb" />
        <StatCard icon={Backpack} label="Ekwipunek" value={formatPLN(invValue)} sub={`${inventory.length} itemów`} color="#4b69ff" />
        <StatCard icon={PackageOpen} label="Otwarte skrzynki" value={String(user.totalOpened)} color="#38e0ff" />
        <StatCard icon={CreditCard} label="Wydano łącznie" value={formatPLN(user.totalSpentCents)} sub="skrzynki + wpisowe" color="#d32ee6" />
        <StatCard icon={TrendingDown} label="Przegrane w bitwach" value={formatPLN(user.battleLostCents)} sub="wpisowe po przegranych" color="#eb4b4b" />
        <StatCard icon={TrendingUp} label="Wygrane pule" value={formatPLN(user.totalWonCents)} sub="wartość pul z bitew" color="#22c55e" />
        <StatCard icon={Trophy} label="Największa wygrana" value={formatPLN(user.biggestWinCents)} color="#ffcf5e" />
        <StatCard icon={Swords} label="Majątek netto" value={formatPLN(user.balanceCents + invValue)} sub="saldo + ekwipunek" color="#8be9ff" />
      </div>

      {/* ostatnie bitwy */}
      <div className="panel mt-4 p-4">
        <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Twoje ostatnie bitwy</h3>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-xs text-white/30">
            Jeszcze nie stoczyłeś żadnej bitwy.{" "}
            <Link href="/battles" className="font-bold text-gold hover:underline" onClick={() => sfx.click()}>
              Stwórz pierwszą!
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((b) => {
              const meP1 = b.p1Id === user.id;
              const opponent = meP1 ? b.p2Name ?? "?" : b.p1Name;
              const iWon = b.winnerId === user.id;
              const tie = b.status === "finished" && !b.winnerName;
              const caseId = b.caseIds?.[0] ?? b.caseId;
              const caseName = CASE_MAP.get(caseId)?.name ?? caseId;
              return (
                <Link
                  key={b.id}
                  href={b.status === "finished" ? `/battle/${b.id}` : "/battles"}
                  onClick={() => sfx.click()}
                  className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 transition-colors hover:border-white/15"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-black ${
                      tie ? "bg-white/10 text-white/60" : iWon ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {tie ? "R" : iWon ? "W" : "L"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="text-white/80">vs {opponent}</span>
                      {b.mode === "joker" ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-purple-300"><Ghost size={9} /> joker</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-gold"><Crown size={9} /> std</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/35">
                      {caseName}{b.rounds > 1 ? ` +${b.rounds - 1}` : ""} · wpisowe {formatPLN(b.costCents)}
                      {b.status === "open" && " · czeka na przeciwnika"}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/25">
                    {new Date(b.createdAt).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
