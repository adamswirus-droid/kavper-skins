"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app";
import { SkinCard } from "@/components/skin";
import { RARITY_META, Rarity, SHOP_MARKUP, SHOP_SKINS, formatPLN, toCents } from "@/lib/data";
import { sfx } from "@/lib/sound";
import { useFx } from "@/components/fx";
import { ArrowDownWideNarrow, Search, ShoppingBag, TrendingUp } from "lucide-react";

const RARITY_ORDER: Rarity[] = ["milspec", "restricted", "classified", "covert", "knife"];

export default function ShopPage() {
  const { user, setBalance, toast, refresh } = useApp();
  const fx = useFx();
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [affordable, setAffordable] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  const list = useMemo(() => {
    let arr = SHOP_SKINS;
    if (rarity !== "all") arr = arr.filter((s) => s.rarity === rarity);
    if (q.trim()) {
      const t = q.toLowerCase();
      arr = arr.filter((s) => `${s.weapon} ${s.name}`.toLowerCase().includes(t));
    }
    if (affordable && user) arr = arr.filter((s) => Math.round(toCents(s.price) * SHOP_MARKUP) <= user.balanceCents);
    return [...arr].sort((a, b) => (sort === "asc" ? a.price - b.price : b.price - a.price));
  }, [q, rarity, sort, affordable, user]);

  const buy = async (key: string) => {
    if (!user || buying) return;
    setBuying(key);
    sfx.click();
    try {
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, skinKey: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Błąd zakupu", "err");
        sfx.lose();
      } else {
        setBalance(data.balanceCents);
        sfx.coin();
        fx.burst(window.innerWidth / 2, window.innerHeight / 2, ["#2563eb", "#ffffff"], 30, 0.8);
        toast(`Kupiono ${data.item.weapon} | ${data.item.name} za ${formatPLN(data.paidCents)}`, "win");
        void refresh();
      }
    } catch {
      toast("Brak połączenia", "err");
    }
    setBuying(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-xl font-black tracking-wide text-white sm:text-2xl">
            <ShoppingBag size={20} className="text-gold" /> SKLEP ZE SKINAMI
          </h1>
          <p className="mt-1 text-xs text-white/40">
            Kup dowolnego skina za saldo (+{Math.round((SHOP_MARKUP - 1) * 100)}% marży) i od razu wrzuć go na{" "}
            <Link href="/upgrader" className="font-bold text-gold hover:underline">Upgrader</Link> albo trzymaj w ekwipunku.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/50">
          {SHOP_SKINS.length} skinów
        </span>
      </div>

      {/* filtry */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj: AK-47, Asiimov…"
            className="w-56 rounded-xl border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm font-semibold text-white outline-none placeholder:text-white/25 focus:border-gold/60"
          />
        </div>
        <button className="chip-toggle" data-on={rarity === "all"} onClick={() => { setRarity("all"); sfx.click(); }}>Wszystkie</button>
        {RARITY_ORDER.map((r) => (
          <button key={r} className="chip-toggle" data-on={rarity === r} onClick={() => { setRarity(rarity === r ? "all" : r); sfx.click(); }}>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: RARITY_META[r].color }} />
            {RARITY_META[r].label.replace("★ ", "")}
          </button>
        ))}
        <button className="chip-toggle flex items-center gap-1.5" data-on={sort === "desc"} onClick={() => { setSort(sort === "asc" ? "desc" : "asc"); sfx.click(); }}>
          <ArrowDownWideNarrow size={13} /> {sort === "asc" ? "Od najtańszych" : "Od najdroższych"}
        </button>
        <button className="chip-toggle" data-on={affordable} onClick={() => { setAffordable(!affordable); sfx.click(); }}>
          Stać mnie
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
        {list.map((s) => {
          const value = toCents(s.price);
          const price = Math.round(value * SHOP_MARKUP);
          const can = !!user && user.balanceCents >= price;
          return (
            <div key={s.key} className="flex flex-col gap-1.5">
              <SkinCard weapon={s.weapon} name={s.name} rarity={s.rarity} priceCents={value} size="md" dim={!can} />
              <button
                onClick={() => void buy(s.key)}
                disabled={!can || buying === s.key}
                className={`w-[150px] rounded-lg py-1.5 text-[11px] font-black transition-colors ${
                  can ? "bg-gold text-[#ffffff] hover:brightness-110" : "bg-white/6 text-white/30"
                }`}
              >
                {buying === s.key ? "Kupowanie…" : `Kup · ${formatPLN(price)}`}
              </button>
            </div>
          );
        })}
      </div>
      {list.length === 0 && <p className="mt-10 text-center text-sm text-white/35">Nic nie pasuje do filtra.</p>}

      <div className="panel mt-8 flex items-start gap-3 p-4 text-xs text-white/50">
        <TrendingUp size={16} className="mt-0.5 shrink-0 text-gold" />
        <span>
          <b className="text-white/80">Taktyka:</b> kup tani skin, idź do Upgradera, ustaw szansę i ewentualnie{" "}
          <b className="text-white/80">dopłać z salda</b>, żeby podbić stawkę i sięgnąć po droższy cel.
        </span>
      </div>
    </div>
  );
}
