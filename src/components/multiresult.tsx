"use client";

import { useEffect, useMemo } from "react";
import { SkinCard } from "./skin";
import { RARITY_META, Rarity, formatPLN } from "@/lib/data";
import { sfx } from "@/lib/sound";
import { useFx } from "./fx";
import { PackageOpen, RotateCcw, X } from "lucide-react";

export interface MultiItem {
  invId: string;
  weapon: string;
  name: string;
  rarity: string;
  priceCents: number;
}

export default function MultiResult({
  items,
  costCents,
  caseName,
  onClose,
  onAgain,
  againLabel,
}: {
  items: MultiItem[];
  costCents: number;
  caseName: string;
  onClose: () => void;
  onAgain?: () => void;
  againLabel?: string;
}) {
  const fx = useFx();
  const sorted = useMemo(() => [...items].sort((a, b) => b.priceCents - a.priceCents), [items]);
  const total = useMemo(() => items.reduce((s, i) => s + i.priceCents, 0), [items]);
  const diff = total - costCents;
  const best = sorted[0];
  const bestMeta = best ? RARITY_META[best.rarity as Rarity] : null;

  useEffect(() => {
    // dźwięki schodkowo pod rzadkość + świętowanie za rzadkie dropy
    const timers: number[] = [];
    sorted.forEach((it, i) => {
      const order = RARITY_META[it.rarity as Rarity]?.order ?? 0;
      if (order >= 1) timers.push(window.setTimeout(() => sfx.tick(), 120 + i * 140));
    });
    const top = RARITY_META[sorted[0]?.rarity as Rarity]?.order ?? 0;
    if (top >= 3) {
      timers.push(
        window.setTimeout(() => {
          sfx.win(top);
          fx.celebrate(
            window.innerWidth / 2,
            window.innerHeight / 2,
            [RARITY_META[sorted[0].rarity as Rarity].color, "#ffffff", "#2563eb"],
            top >= 4
          );
        }, 400)
      );
    } else {
      timers.push(window.setTimeout(() => sfx.sell(), 200));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="pop-in relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto overflow-x-hidden rounded-2xl border border-white/12 bg-panel p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Zamknij"
        >
          <X size={16} />
        </button>

        <div className="text-center">
          <h3 className="font-display text-lg font-black tracking-wide text-white sm:text-xl">
            {items.length}× {caseName}
          </h3>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
            <span className="rounded-lg bg-white/6 px-3 py-1.5 text-white/60">
              Wydane: <b className="text-white/90">{formatPLN(costCents)}</b>
            </span>
            <span className="rounded-lg bg-white/6 px-3 py-1.5 text-white/60">
              Dropy: <b className="text-white/90">{formatPLN(total)}</b>
            </span>
            <span
              className={`rounded-lg px-3 py-1.5 ${
                diff >= 0 ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
              }`}
            >
              {diff >= 0 ? "+" : ""}
              {formatPLN(diff)}
            </span>
          </div>
          {best && bestMeta && (
            <p className="mt-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: bestMeta.color }}>
              Najlepszy drop: {best.weapon} · {best.name}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          {sorted.map((it, i) => (
            <div key={it.invId} className="flip-in" style={{ animationDelay: `${0.08 + i * 0.13}s` }}>
              <SkinCard
                weapon={it.weapon}
                name={it.name}
                rarity={it.rarity}
                priceCents={it.priceCents}
                size="sm"
                selected={i === 0}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <button onClick={onClose} className="btn-ghost text-sm">
            <PackageOpen size={16} /> Do ekwipunku
          </button>
          {onAgain && (
            <button onClick={onAgain} className="btn-gold text-sm">
              <RotateCcw size={15} /> {againLabel ?? "Jeszcze raz"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
