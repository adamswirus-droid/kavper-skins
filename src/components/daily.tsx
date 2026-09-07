"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "./app";
import { useFx } from "./fx";
import { DAILY_REWARDS, formatPLN } from "@/lib/data";
import { sfx } from "@/lib/sound";
import { CalendarCheck, Gift, Sparkles } from "lucide-react";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function DailyChest() {
  const { user, setBalance, toast } = useApp();
  const fx = useFx();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [opening, setOpening] = useState(false);
  const [reveal, setReveal] = useState<{ cents: number; bonusPct: number; streak: number } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const r = await fetch(`/api/daily?userId=${user.id}`, { cache: "no-store" });
      const d = await r.json();
      if (r.ok) {
        setRemaining(d.remainingMs);
        setStreak(d.streak);
      }
    } catch {
      /* noop */
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const t = setInterval(() => setRemaining((r) => (r === null ? r : Math.max(0, r - 1000))), 1000);
    return () => clearInterval(t);
  }, [remaining]);

  const claim = async () => {
    if (!user || opening) return;
    setOpening(true);
    sfx.open();
    sfx.drumroll(1400);
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const r = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast(d.error ?? "Błąd", "err");
        if (d.remainingMs) setRemaining(d.remainingMs);
      } else {
        setBalance(d.balanceCents);
        setReveal({ cents: d.cents, bonusPct: d.bonusPct, streak: d.streak });
        setStreak(d.streak);
        setRemaining(24 * 3600 * 1000);
        sfx.daily();
        fx.celebrate(window.innerWidth / 2, window.innerHeight / 2, ["#2563eb", "#ffffff", "#34d399"], d.cents >= 10000);
      }
    } catch {
      toast("Brak połączenia", "err");
    }
    setOpening(false);
  };

  if (!user || remaining === null) return null;
  const ready = remaining <= 0;

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${ready ? "border-gold/50 bg-gradient-to-r from-[#3b82f6]/20 via-panel to-panel shadow-[0_0_60px_-20px_rgba(37,99,235,.6)]" : "border-white/8 bg-panel"}`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${ready ? "bg-gold text-[#ffffff] animate-pulse" : "bg-white/6 text-white/40"}`}>
            <Gift size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-black tracking-wide text-white sm:text-base">
              DAILY CHEST {streak > 1 && <span className="ml-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">seria {streak} dni · +{Math.min(50, (streak - 1) * 10)}%</span>}
            </div>
            <div className="mt-0.5 text-[11px] text-white/45">
              Darmowa kasa raz na 24 h: {DAILY_REWARDS[0].label}–{DAILY_REWARDS[DAILY_REWARDS.length - 1].label}. Odbieraj codziennie — seria daje bonus do +50%.
            </div>
          </div>
          {ready ? (
            <button onClick={() => void claim()} disabled={opening} className="btn-gold">
              <Sparkles size={16} /> {opening ? "Otwieranie…" : "Odbierz"}
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-bold tabular-nums text-white/60">
              <CalendarCheck size={15} className="text-gold/70" /> {fmt(remaining)}
            </div>
          )}
        </div>
      </div>

      {reveal && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={() => setReveal(null)}>
          <div className="pop-in w-full max-w-sm rounded-2xl border border-gold/50 bg-panel p-8 text-center shadow-[0_0_100px_-20px_rgba(37,99,235,.7)]" onClick={(e) => e.stopPropagation()}>
            <Gift size={44} className="mx-auto text-gold" />
            <div className="mt-3 text-[11px] font-black uppercase tracking-[0.3em] text-gold/80">Daily chest</div>
            <div className="font-display mt-2 text-4xl font-black text-white">+{formatPLN(reveal.cents)}</div>
            {reveal.bonusPct > 0 && <div className="mt-1 text-xs font-bold text-emerald-300">w tym bonus za serię {reveal.streak} dni: +{reveal.bonusPct}%</div>}
            <p className="mt-3 text-xs text-white/45">Wróć jutro po kolejny. Seria rośnie, jeśli odbierzesz w ciągu 48 h.</p>
            <button onClick={() => setReveal(null)} className="btn-gold mt-6 w-full">Super!</button>
          </div>
        </div>
      )}
    </>
  );
}
