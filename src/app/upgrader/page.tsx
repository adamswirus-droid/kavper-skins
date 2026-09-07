"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/app";
import { useFx } from "@/components/fx";
import { SkinCard } from "@/components/skin";
import {
  RARITY_META,
  Rarity,
  UPGRADE_PRESETS,
  UPGRADE_MIN_PCT,
  UPGRADE_MAX_PCT,
  clampPct,
  findUpgradeTargetByChance,
  formatPLN,
} from "@/lib/data";
import { sfx } from "@/lib/sound";
import { ArrowRight, Backpack, Check, Package, X } from "lucide-react";
import type { DbInventoryItem } from "@/db/schema";

interface UpgradeResult {
  win: boolean;
  chance: number;
  skin: { weapon: string; name: string; rarity: string; price: number };
  priceCents: number;
  fromCents: number;
  topUpCents?: number;
  stakeCents?: number;
  balanceCents?: number;
}

export default function UpgraderPage() {
  const { user, inventory, toast, refresh, setBalance } = useApp();
  const fx = useFx();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const MAX_ITEMS = 10;
  const [pct, setPct] = useState<number>(50);
  const [topUp, setTopUp] = useState<number>(0); // zł
  const [topUpInput, setTopUpInput] = useState<string>("0");
  const [pctInput, setPctInput] = useState<string>("50");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<UpgradeResult | null>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  const selectedItems: DbInventoryItem[] = useMemo(
    () => inventory.filter((i) => selectedIds.includes(i.id)),
    [inventory, selectedIds]
  );
  const itemsCents = selectedItems.reduce((s, i) => s + i.priceCents, 0);
  // "selected" = zbiorczy pseudo-item (kompatybilność z resztą UI)
  const selected = selectedItems.length > 0 ? { priceCents: itemsCents, count: selectedItems.length } : null;
  const toggleItem = (id: string) => {
    sfx.click();
    setResult(null);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_ITEMS ? prev : [...prev, id]));
  };

  const topUpCents = Math.max(0, Math.round(topUp * 100));
  const stakeCents = (selected?.priceCents ?? 0) + topUpCents;
  const canTopUp = !!user && topUpCents <= user.balanceCents;
  const plan = useMemo(
    () => (selected ? findUpgradeTargetByChance(stakeCents, pct) : null),
    [selected, stakeCents, pct]
  );
  const applyTopUp = useCallback(
    (v: number) => {
      const maxZl = Math.floor((user?.balanceCents ?? 0) / 100);
      const c = Math.max(0, Math.min(maxZl, Math.floor(Number.isFinite(v) ? v : 0)));
      setTopUp(c);
      setTopUpInput(String(c));
    },
    [user?.balanceCents]
  );

  const applyPct = useCallback((v: number) => {
    const c = clampPct(v);
    setPct(c);
    setPctInput(String(c));
  }, []);

  const isKnife = (r: string) => r === "knife";
  const arcDeg = plan ? plan.chance * 360 : 0;
  const CIRC = 2 * Math.PI * 100;

  const setNeedle = useCallback((deg: number) => {
    if (needleRef.current) needleRef.current.style.transform = `rotate(${deg}deg)`;
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const roll = useCallback(async () => {
    if (!user || !selected || !plan || spinning) return;
    if (!canTopUp) {
      toast("Za mało środków na dopłatę", "err");
      return;
    }
    setSpinning(true);
    setResult(null);
    sfx.open();
    let data: UpgradeResult & { roll?: number; error?: string };
    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, itemIds: selectedIds, pct, topUpCents }),
      });
      data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Błąd ulepszania", "err");
        setSpinning(false);
        return;
      }
    } catch {
      toast("Brak połączenia", "err");
      setSpinning(false);
      return;
    }

    // Animacja igły
    const arc = data.chance * 360;
    const land = data.win
      ? (0.08 + Math.random() * 0.84) * arc
      : arc + (0.05 + Math.random() * 0.9) * (360 - arc);
    const final = 360 * 6 + land;
    const dur = 3800;
    const start = performance.now();
    let lastTickDeg = 0;
    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - t, 4);
        const deg = final * e;
        setNeedle(deg % 360);
        if (deg - lastTickDeg > 22 && t < 0.97) {
          lastTickDeg = deg;
          sfx.tick();
        }
        if (t >= 1) return resolve();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    });

    setNeedle(land);
    setSpinning(false);
    setResult(data);
    setSelectedIds([]);
    if (typeof data.balanceCents === "number") setBalance(data.balanceCents);
    setTopUp(0);
    setTopUpInput("0");
    void refresh();
    if (data.win) {
      const meta = RARITY_META[data.skin.rarity as Rarity] ?? RARITY_META.milspec;
      sfx.win(meta.order);
      fx.celebrate(window.innerWidth / 2, window.innerHeight / 2, ["#22c55e", meta.color, "#ffffff"], isKnife(data.skin.rarity));
    } else {
      sfx.lose();
      fx.shake(0.9);
    }
  }, [user, selected, plan, spinning, pct, topUpCents, canTopUp, toast, setNeedle, refresh, fx, setBalance]);

  if (inventory.length === 0 && !result) {
    return (
      <div className="panel mx-auto mt-10 max-w-md p-10 text-center">
        <Backpack className="mx-auto h-12 w-12 text-white/20" />
        <h1 className="font-display mt-4 text-xl font-black text-white">BRAK ITEMÓW DO UPGRADE</h1>
        <p className="mt-2 text-sm text-white/45">Otwórz skrzynkę — dropy trafiają do ekwipunku i możesz je tu ulepszać.</p>
        <Link href="/" className="btn-gold mt-6 inline-flex" onClick={() => sfx.click()}>
          <Package size={16} /> Otwieraj skrzynki
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-xl font-black tracking-wide text-white sm:text-2xl">UPGRADER</h1>
      <p className="mt-1 text-xs text-white/40">
        Zaznacz <b className="text-gold">jeden lub kilka itemów</b> (do {MAX_ITEMS} — kilka tanich łączy się w jedną stawkę), wpisz
        szansę (5–90%), ewentualnie dopłać z salda, a system dobierze najlepszy cel. Zielone pole = wygrywasz.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        {/* Lewo: maszyna */}
        <div className="panel relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-gold/10 blur-[70px]" />
          {/* wybrany -> cel */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/35">Twoje</span>
              {selected ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex -space-x-16">
                    {selectedItems.slice(0, 3).map((it, i) => (
                      <div key={it.id} style={{ zIndex: 3 - i, transform: `rotate(${(i - 1) * 6}deg)` }}>
                        <SkinCard weapon={it.weapon} name={it.name} rarity={it.rarity} priceCents={it.priceCents} size="sm" />
                      </div>
                    ))}
                  </div>
                  <span className="rounded-md bg-white/8 px-2 py-0.5 text-[10px] font-black text-white/70">
                    {selectedItems.length} {selectedItems.length === 1 ? "item" : "itemów"} · {formatPLN(itemsCents)}
                  </span>
                </div>
              ) : (
                <div className="grid h-36 w-[132px] place-items-center rounded-xl border border-dashed border-white/15 text-center text-[11px] font-semibold text-white/30">
                  Wybierz itemy<br />z listy →
                </div>
              )}
            </div>
            <ArrowRight className="text-gold" size={20} />
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/35">Cel</span>
              {selected && plan ? (
                <SkinCard weapon={plan.skin.weapon} name={plan.skin.name} rarity={plan.skin.rarity} priceCents={plan.priceCents} size="sm" selected />
              ) : (
                <div className="grid h-36 w-[132px] place-items-center rounded-xl border border-dashed border-white/15 text-[11px] font-semibold text-white/30">
                  brak celu
                </div>
              )}
            </div>
          </div>

          {/* wybór szansy */}
          <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Twoja szansa</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={UPGRADE_MIN_PCT}
                  max={UPGRADE_MAX_PCT}
                  value={pctInput}
                  onChange={(e) => {
                    setPctInput(e.target.value);
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= UPGRADE_MIN_PCT && n <= UPGRADE_MAX_PCT) setPct(Math.round(n));
                  }}
                  onBlur={() => applyPct(Number(pctInput))}
                  onKeyDown={(e) => e.key === "Enter" && applyPct(Number(pctInput))}
                  className="w-20 rounded-lg border border-gold/40 bg-black/40 px-2.5 py-1.5 text-right text-lg font-black tabular-nums text-gold outline-none focus:border-gold"
                />
                <span className="text-lg font-black text-gold">%</span>
              </div>
            </div>
            <input
              type="range"
              min={UPGRADE_MIN_PCT}
              max={UPGRADE_MAX_PCT}
              step={1}
              value={pct}
              onChange={(e) => applyPct(Number(e.target.value))}
              className="upg-range mt-3 w-full"
              style={{ "--p": `${((pct - UPGRADE_MIN_PCT) / (UPGRADE_MAX_PCT - UPGRADE_MIN_PCT)) * 100}%` } as React.CSSProperties}
            />
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {UPGRADE_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    applyPct(p);
                    sfx.click();
                  }}
                  className="chip-toggle px-3 py-1.5 text-xs"
                  data-on={pct === p}
                >
                  {p}%
                </button>
              ))}
            </div>
            {selected && !plan && (
              <p className="mt-2 text-center text-[11px] font-semibold text-red-400">
                Brak skina do zdobycia na {pct}% z tego itemu — zwiększ szansę lub wybierz tańszy item.
              </p>
            )}
            {selected && plan && (
              <p className="mt-2 text-center text-[10px] text-white/35">
                Na {pct}% ze stawką {formatPLN(stakeCents)} możesz sięgnąć maks. po skin za ~{formatPLN(Math.floor((stakeCents * 0.95) / (pct / 100)))}.
                Najlepszy dostępny: <b className="text-white/70">{plan.skin.weapon} | {plan.skin.name}</b>.
              </p>
            )}
          </div>

          {/* dopłata z salda */}
          <div className="mt-2.5 rounded-xl border border-gold/20 bg-gold/[0.04] p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-[10px] font-black uppercase tracking-widest text-gold/80">Dopłać z salda</span>
                <span className="block text-[10px] text-white/35">Podbija stawkę → droższy cel przy tej samej szansie</span>
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={Math.floor((user?.balanceCents ?? 0) / 100)}
                  value={topUpInput}
                  onChange={(e) => {
                    setTopUpInput(e.target.value);
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 0) setTopUp(Math.floor(n));
                  }}
                  onBlur={() => applyTopUp(Number(topUpInput))}
                  onKeyDown={(e) => e.key === "Enter" && applyTopUp(Number(topUpInput))}
                  disabled={!selected}
                  className="w-24 rounded-lg border border-gold/40 bg-black/40 px-2.5 py-1.5 text-right text-base font-black tabular-nums text-gold outline-none focus:border-gold disabled:opacity-40"
                />
                <span className="text-sm font-black text-gold">zł</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[0, 5, 10, 25, 50, 100].map((v) => (
                <button key={v} disabled={!selected} className="chip-toggle px-2.5 py-1 text-[11px]" data-on={topUp === v} onClick={() => { applyTopUp(v); sfx.click(); }}>
                  {v === 0 ? "bez" : `+${v} zł`}
                </button>
              ))}
              <button disabled={!selected} className="chip-toggle px-2.5 py-1 text-[11px]" onClick={() => { applyTopUp(Math.floor((user?.balanceCents ?? 0) / 100)); sfx.click(); }}>
                max
              </button>
            </div>
            {selected && (
              <p className="mt-2 text-[10px] text-white/40">
                Stawka: <b className="text-white/75">{formatPLN(itemsCents)}</b> ({selected.count} {selected.count === 1 ? "item" : "itemów"})
                {topUpCents > 0 && <> + <b className="text-gold">{formatPLN(topUpCents)}</b> (dopłata)</>} ={" "}
                <b className="text-white">{formatPLN(stakeCents)}</b>
                {!canTopUp && <span className="ml-2 font-bold text-red-400">— za mało salda</span>}
              </p>
            )}
          </div>

          {/* koło */}
          <div className="relative mx-auto mt-6 h-[248px] w-[248px]">
            <svg viewBox="0 0 248 248" className="h-full w-full -rotate-90">
              <circle cx="124" cy="124" r="100" fill="none" stroke="rgba(235,75,75,.22)" strokeWidth="26" />
              <circle
                cx="124"
                cy="124"
                r="100"
                fill="none"
                stroke="#22c55e"
                strokeOpacity="0.85"
                strokeWidth="26"
                strokeDasharray={`${(arcDeg / 360) * CIRC} ${CIRC}`}
                strokeLinecap="butt"
                style={{ transition: "stroke-dasharray .3s ease" }}
              />
              <circle cx="124" cy="124" r="74" fill="#0a0c11" />
            </svg>
            {/* igła */}
            <div className="absolute inset-0 grid place-items-center">
              <div ref={needleRef} className="absolute inset-0 will-change-transform">
                <div className="absolute left-1/2 top-[9px] h-[38px] w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,255,255,.65)]" />
                <div className="absolute left-1/2 top-[4px] -translate-x-1/2 border-x-[7px] border-t-[10px] border-x-transparent border-t-white" />
              </div>
              <div className="text-center">
                <div className="font-display text-3xl font-black tabular-nums text-white">
                  {plan ? `${(plan.chance * 100).toFixed(1)}%` : "—"}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35">szansa</div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,.65)]" />
          </div>

          <button onClick={() => void roll()} disabled={!selected || !plan || spinning || !canTopUp} className="btn-gold mx-auto mt-6 flex w-full max-w-xs text-base">
            {spinning ? "Kręcenie…" : selected && plan ? `Ulepsz ${selected.count > 1 ? `${selected.count} itemów ` : ""}do ${formatPLN(plan.priceCents)}${topUpCents > 0 ? ` (dopłata ${formatPLN(topUpCents)})` : ""}` : "Wybierz itemy"}
          </button>
          <p className="mt-3 text-center text-[10px] leading-relaxed text-white/30">
            Szansa = stawka (suma itemów + dopłata) / wartość celu × 95%. Przegrana = tracisz wszystkie itemy i dopłatę.
          </p>
        </div>

        {/* Prawo: wybór itemu */}
        <div className="panel flex max-h-[520px] flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white/35">Twój ekwipunek · wybierz do {MAX_ITEMS}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  sfx.click();
                  setResult(null);
                  const cheap = [...inventory].sort((a, b) => a.priceCents - b.priceCents).slice(0, MAX_ITEMS).map((i) => i.id);
                  setSelectedIds(cheap);
                }}
                className="rounded-md bg-white/6 px-2 py-1 text-[10px] font-bold text-white/60 hover:bg-white/10"
              >
                {Math.min(MAX_ITEMS, inventory.length)} najtańszych
              </button>
              {selectedIds.length > 0 && (
                <button onClick={() => { setSelectedIds([]); sfx.click(); }} className="rounded-md px-2 py-1 text-[10px] font-bold text-red-400/80 hover:text-red-300">
                  wyczyść
                </button>
              )}
            </div>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
            {inventory.map((item) => (
              <button key={item.id} onClick={() => toggleItem(item.id)} className="relative">
                {selectedIds.includes(item.id) && (
                  <span className="absolute -right-1 -top-1 z-20 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-black text-[#ffffff]">
                    {selectedIds.indexOf(item.id) + 1}
                  </span>
                )}
                <SkinCard
                  weapon={item.weapon}
                  name={item.name}
                  rarity={item.rarity}
                  priceCents={item.priceCents}
                  size="xs"
                  selected={selectedIds.includes(item.id)}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* wynik */}
      {result && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setResult(null)}>
          <div
            className={`pop-in w-full max-w-sm overflow-hidden rounded-2xl border bg-panel p-6 text-center ${
              result.win ? "border-green-500/40 shadow-[0_0_80px_-20px_rgba(34,197,94,.6)]" : "border-red-500/40 shadow-[0_0_80px_-20px_rgba(235,75,75,.5)]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${result.win ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
              {result.win ? <Check size={28} strokeWidth={3} /> : <X size={28} strokeWidth={3} />}
            </span>
            <h3 className="font-display mt-3 text-xl font-black text-white">
              {result.win ? "UPGRADE SIĘ UDAŁ!" : "NIESTETY, PUDŁO"}
            </h3>
            <p className="mt-1 text-xs text-white/45">
              {result.win
                ? `${formatPLN(result.stakeCents ?? result.fromCents)} → ${formatPLN(result.priceCents)}`
                : `Straciłeś stawkę ${formatPLN(result.stakeCents ?? result.fromCents)}${(result.topUpCents ?? 0) > 0 ? ` (item ${formatPLN(result.fromCents)} + dopłata ${formatPLN(result.topUpCents ?? 0)})` : ""}`}
            </p>
            {result.win && (
              <div className="mx-auto mt-4 w-fit">
                <SkinCard weapon={result.skin.weapon} name={result.skin.name} rarity={result.skin.rarity} priceCents={result.priceCents} size="md" selected />
              </div>
            )}
            <div className="mt-5 flex justify-center gap-2.5">
              <button onClick={() => setResult(null)} className={result.win ? "btn-gold text-sm" : "btn-ghost text-sm"}>
                {result.win ? "Super, do ekwipunku!" : "Spróbuję jeszcze raz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
