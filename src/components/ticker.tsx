"use client";

import { useEffect, useMemo, useState } from "react";
import { ALL_SKINS, RARITY_META, Rarity, formatPLN, toCents } from "@/lib/data";
import { WeaponArt } from "./skin";

interface TickerDrop {
  userName: string;
  weapon: string;
  name: string;
  rarity: string;
  priceCents: number;
}

const FALLBACK_NAMES = ["GraczVIP", "KavperFan", "DuckLord", "SmokWawel", "PixelPL", "Kumplu"];

export default function Ticker() {
  const [drops, setDrops] = useState<TickerDrop[] | null>(null);

  // pauza animacji, gdy zakładka w tle
  useEffect(() => {
    const onVis = () => document.documentElement.classList.toggle("page-hidden", document.hidden);
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const load = () =>
      fetch("/api/ticker", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setDrops(d.drops ?? []))
        .catch(() => setDrops([]));
    void load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const items = useMemo<TickerDrop[]>(() => {
    if (drops && drops.length > 2) return drops;
    // dopóki nie ma prawdziwych dropów: showcase najlepszych skinów
    const top = [...ALL_SKINS].sort((a, b) => b.price - a.price).slice(0, 16);
    return top.map((s, i) => ({
      userName: FALLBACK_NAMES[i % FALLBACK_NAMES.length],
      weapon: s.weapon,
      name: s.name,
      rarity: s.rarity,
      priceCents: toCents(s.price),
    }));
  }, [drops]);

  const loop = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-b border-white/8 bg-black/30 py-2" style={{ contain: "layout paint" }}>
      <div className="pointer-events-none absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 md:flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        <span className="text-[10px] font-black tracking-[0.2em] text-red-400">LIVE</span>
      </div>
      <div className="marquee-track">
        {loop.map((d, i) => {
          const meta = RARITY_META[d.rarity as Rarity] ?? RARITY_META.milspec;
          return (
            <div key={i} className="mx-2 flex shrink-0 items-center gap-2 rounded-lg border border-white/6 bg-white/[0.03] py-1 pl-2 pr-2.5">
              <span style={{ color: meta.color }}>
                <WeaponArt weapon={d.weapon} name={d.name} className="h-4 w-8" />
              </span>
              <span className="text-[11px] font-semibold text-white/40">@{d.userName}</span>
              <span className="text-[11px] font-semibold text-white/75">
                {d.weapon} · {d.name}
              </span>
              <span className="rounded px-1 py-0.5 text-[10px] font-bold" style={{ background: `${meta.color}22`, color: meta.color }}>
                {formatPLN(d.priceCents)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
