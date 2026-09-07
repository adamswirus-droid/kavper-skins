"use client";

import { RARITY_META, Rarity, formatPLN } from "@/lib/data";
import { WeaponArt } from "./skin";
import { Banknote, PackageOpen, X } from "lucide-react";

export interface WonItem {
  invId: string;
  weapon: string;
  name: string;
  rarity: string;
  priceCents: number;
}

export default function WinModal({
  item,
  onKeep,
  onSell,
  onAgain,
  againLabel,
  selling,
}: {
  item: WonItem;
  onKeep: () => void;
  onSell: () => void;
  onAgain?: () => void;
  againLabel?: string;
  selling?: boolean;
}) {
  const meta = RARITY_META[item.rarity as Rarity] ?? RARITY_META.milspec;
  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onKeep}>
      <div
        className="pop-in relative w-full max-w-sm overflow-hidden rounded-2xl border bg-panel text-center"
        style={{ borderColor: `${meta.color}66`, boxShadow: `0 0 90px -18px ${meta.glow}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {item.rarity === "knife" && <div className="shine" />}
        <div className="h-1.5 w-full" style={{ background: meta.color }} />
        <button
          onClick={onKeep}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Zamknij"
        >
          <X size={16} />
        </button>
        <div className="px-6 pb-6 pt-7">
          <div
            className="text-[11px] font-black uppercase tracking-[0.3em]"
            style={{ color: meta.color }}
          >
            {meta.label}
          </div>
          <div className="relative mx-auto mt-3 h-32 w-52" style={{ color: meta.color }}>
            <div className="absolute inset-0 rounded-full blur-3xl" style={{ background: meta.glow }} />
            <WeaponArt weapon={item.weapon} name={item.name} className="relative h-full w-full drop-shadow-[0_10px_25px_rgba(0,0,0,.6)]" />
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">{item.weapon}</div>
          <h3 className="font-display mt-1 text-xl font-black text-white">{item.name}</h3>
          <div className="mt-2 inline-flex items-center rounded-xl px-4 py-1.5 text-lg font-black tabular-nums" style={{ background: `${meta.color}22`, color: meta.color }}>
            {formatPLN(item.priceCents)}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <button onClick={onSell} disabled={selling} className="btn-ghost text-sm">
              <Banknote size={16} />
              {selling ? "Sprzedaż…" : `Sprzedaj +${formatPLN(item.priceCents)}`}
            </button>
            <button onClick={onKeep} className="btn-ghost text-sm">
              <PackageOpen size={16} />
              Do ekwipunku
            </button>
          </div>
          {onAgain && (
            <button onClick={onAgain} className="btn-gold mt-2.5 w-full text-sm">
              {againLabel ?? "Otwórz ponownie"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
