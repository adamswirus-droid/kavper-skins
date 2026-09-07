"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app";
import { SkinCard } from "@/components/skin";
import { RARITY_META, Rarity, formatPLN } from "@/lib/data";
import { sfx } from "@/lib/sound";
import { useFx } from "@/components/fx";
import { ArrowDownWideNarrow, Backpack, Banknote, CheckCheck, Package } from "lucide-react";

const RARITY_ORDER: Rarity[] = ["knife", "covert", "classified", "restricted", "milspec"];

export default function InventoryPage() {
  const { user, inventory, setInventory, setBalance, toast, refresh } = useApp();
  const fx = useFx();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [sort, setSort] = useState<"value" | "date">("value");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    let arr = [...inventory];
    if (rarityFilter !== "all") arr = arr.filter((i) => i.rarity === rarityFilter);
    arr.sort((a, b) =>
      sort === "value" ? b.priceCents - a.priceCents : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return arr;
  }, [inventory, rarityFilter, sort]);

  const totalValue = useMemo(() => inventory.reduce((s, i) => s + i.priceCents, 0), [inventory]);
  const selectedTotal = useMemo(
    () => inventory.filter((i) => selected.has(i.id)).reduce((s, i) => s + i.priceCents, 0),
    [inventory, selected]
  );

  const toggle = (id: string) => {
    sfx.click();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    sfx.click();
    setSelected((prev) => {
      const allIn = filtered.every((i) => prev.has(i.id));
      const next = new Set(prev);
      if (allIn) filtered.forEach((i) => next.delete(i.id));
      else filtered.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const sell = async (ids: string[] | "all") => {
    if (busy || !user) return;
    setBusy(true);
    const res = await fetch("/api/inventory/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: ids === "all" ? JSON.stringify({ userId: user.id, all: true }) : JSON.stringify({ userId: user.id, itemIds: ids }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setBalance(data.balanceCents);
      sfx.sell();
      fx.burst(window.innerWidth / 2, window.innerHeight - 100, ["#2563eb", "#ffffff"], 40, 0.9);
      toast(`Sprzedano ${data.sold} itemów za ${formatPLN(data.totalCents)}`, "win");
      setSelected(new Set());
      setInventory(ids === "all" ? [] : inventory.filter((i) => !ids.includes(i.id)));
      void refresh();
    } else {
      toast(data.error ?? "Błąd sprzedaży", "err");
    }
  };

  if (inventory.length === 0) {
    return (
      <div className="panel mx-auto mt-10 max-w-md p-10 text-center">
        <Backpack className="mx-auto h-12 w-12 text-white/20" />
        <h1 className="font-display mt-4 text-xl font-black text-white">EKWIPUNEK PUSTY</h1>
        <p className="mt-2 text-sm text-white/45">Otwórz skrzynkę albo wygraj bitwę, a dropy trafią tutaj.</p>
        <Link href="/" className="btn-gold mt-6 inline-flex" onClick={() => sfx.click()}>
          <Package size={16} /> Przeglądaj skrzynki
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-black tracking-wide text-white sm:text-2xl">EKWIPUNEK</h1>
          <p className="mt-1 text-xs text-white/40">
            {inventory.length} itemów · wartość: <b className="text-gold">{formatPLN(totalValue)}</b>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <button
              className="chip-toggle"
              data-on={rarityFilter === "all"}
              onClick={() => {
                setRarityFilter("all");
                sfx.click();
              }}
            >
              Wszystkie
            </button>
            {RARITY_ORDER.map((r) => {
              const count = inventory.filter((i) => i.rarity === r).length;
              if (count === 0) return null;
              return (
                <button
                  key={r}
                  className="chip-toggle"
                  data-on={rarityFilter === r}
                  onClick={() => {
                    setRarityFilter(rarityFilter === r ? "all" : r);
                    sfx.click();
                  }}
                >
                  <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: RARITY_META[r].color }} />
                  {count}
                </button>
              );
            })}
          </div>
          <button
            className="chip-toggle flex items-center gap-1.5"
            data-on={sort === "value"}
            onClick={() => {
              setSort(sort === "value" ? "date" : "value");
              sfx.click();
            }}
          >
            <ArrowDownWideNarrow size={13} /> {sort === "value" ? "Wg wartości" : "Najnowsze"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={selectAllFiltered}
          className="btn-ghost px-3.5 py-2 text-xs"
        >
          <CheckCheck size={14} />
          {filtered.every((i) => selected.has(i.id)) && filtered.length > 0
            ? "Odznacz wszystkie"
            : `Zaznacz wszystkie (${filtered.length})`}
        </button>
        <button onClick={() => void sell("all")} disabled={busy} className="btn-ghost px-3.5 py-2 text-xs text-red-300">
          <Banknote size={14} /> Sprzedaj wszystko · {formatPLN(totalValue)}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
        {filtered.map((item) => {
          const isSel = selected.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              className={`relative text-left transition-transform duration-150 active:scale-95 ${isSel ? "-translate-y-1" : ""}`}
            >
              {isSel && (
                <span className="absolute -right-1.5 -top-1.5 z-20 grid h-6 w-6 place-items-center rounded-full bg-gold text-[#ffffff] shadow-lg">
                  <CheckCheck size={13} strokeWidth={3} />
                </span>
              )}
              <SkinCard
                weapon={item.weapon}
                name={item.name}
                rarity={item.rarity}
                priceCents={item.priceCents}
                selected={isSel}
                size="md"
              />
            </button>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/35">Brak itemów dla tego filtra.</p>
      )}

      {/* Sticky bar sprzedaży */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 px-3 md:bottom-4">
          <div className="pop-in mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-gold/30 bg-white/95 p-3 shadow-[0_20px_60px_-15px_rgba(37,99,235,.4)] backdrop-blur-xl">
            <div className="flex-1 pl-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">Zaznaczono {selected.size}</div>
              <div className="text-sm font-black tabular-nums text-gold">{formatPLN(selectedTotal)}</div>
            </div>
            <button onClick={() => setSelected(new Set())} className="btn-ghost px-3 py-2 text-xs">
              Anuluj
            </button>
            <button onClick={() => void sell([...selected])} disabled={busy} className="btn-gold px-4 py-2 text-sm">
              <Banknote size={15} /> {busy ? "Sprzedaję…" : "Sprzedaj"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
