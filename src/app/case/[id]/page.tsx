"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CASE_MAP,
  BOOST_MAP,
  RARITY_META,
  Rarity,
  rollItem,
  formatPLN,
  toCents,
  chancePct,
  FREE_MAX_BALANCE_CENTS,
  FREE_COOLDOWN_MS,
} from "@/lib/data";
import { useApp } from "@/components/app";
import { useFx } from "@/components/fx";
import { SpinReel, type ReelItemData, type SpinHandle } from "@/components/reel";
import WinModal, { type WonItem } from "@/components/winmodal";
import MultiResult, { type MultiItem } from "@/components/multiresult";
import { WeaponArt } from "@/components/skin";
import { sfx } from "@/lib/sound";
import { ArrowLeft, Clock, Gift, Lock, PackageOpen, Pause, Play, SkipForward, Zap } from "lucide-react";

const NORMAL_LEN = 60;
const NORMAL_WIN_AT = 52;
const FAST_LEN = 30;
const FAST_WIN_AT = 24;

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const baseDef = CASE_MAP.get(id);
  const [boost, setBoost] = useState(false);
  const boostDef = BOOST_MAP.get(id);
  const caseDef = boost && boostDef ? boostDef : baseDef;
  const { user, setBalance, toast, refresh } = useApp();
  const fx = useFx();

  const [phase, setPhase] = useState<"idle" | "spinning">("idle");
  const [strip, setStrip] = useState<ReelItemData[] | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [won, setWon] = useState<WonItem | null>(null);
  const [multi, setMulti] = useState<{ items: MultiItem[]; costCents: number } | null>(null);
  const [multiSpin, setMultiSpin] = useState<{
    strips: ReelItemData[][];
    items: MultiItem[];
    costCents: number;
  } | null>(null);
  const [multiSettled, setMultiSettled] = useState(0);
  const multiRefs = useRef<(SpinHandle | null)[]>([]);
  const multiRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const [selling, setSelling] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stripKey, setStripKey] = useState(0);
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState<{ color: string; key: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const reelRef = useRef<SpinHandle>(null);
  const busyRef = useRef(false);

  const isFree = caseDef?.free === true;
  const cost = caseDef ? toCents(caseDef.price) : 0;
  const totalCost = cost * qty;

  // Darmowa skrzynka: blokada + cooldown
  const freeCooldownLeft = useMemo(() => {
    if (!isFree || !user?.lastFreeCaseAt) return 0;
    const last = new Date(user.lastFreeCaseAt).getTime();
    return Math.max(0, FREE_COOLDOWN_MS - (now - last));
  }, [isFree, user?.lastFreeCaseAt, now]);

  const freeLocked = isFree && !!user && user.balanceCents >= FREE_MAX_BALANCE_CENTS;
  const freeOnCooldown = freeCooldownLeft > 0;
  const canOpen = !!user && !freeLocked && !freeOnCooldown && (isFree || user.balanceCents >= cost);
  const canMulti = !!user && !isFree && qty > 1 && user.balanceCents >= totalCost;

  useEffect(() => {
    if (!isFree) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isFree]);

  const cdText = `${String(Math.floor(freeCooldownLeft / 60000)).padStart(2, "0")}:${String(
    Math.floor((freeCooldownLeft % 60000) / 1000)
  ).padStart(2, "0")}`;

  const idleStrip = useMemo<ReelItemData[]>(() => {
    if (!caseDef) return [];
    const arr: ReelItemData[] = [];
    for (let i = 0; i < 40; i++) {
      const s = rollItem(caseDef);
      arr.push({ slotKey: `idle-${i}-${s.key}`, weapon: s.weapon, name: s.name, rarity: s.rarity, priceCents: toCents(s.price) });
    }
    return arr;
  }, [caseDef]);

  const reveal = useCallback(
    (item: WonItem | MultiItem) => {
      const meta = RARITY_META[item.rarity as Rarity] ?? RARITY_META.milspec;
      sfx.win(meta.order);
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      if (meta.order >= 3) fx.celebrate(cx, cy, [meta.color, "#ffffff", "#2563eb"], true);
      else if (meta.order >= 2) fx.celebrate(cx, cy, [meta.color, "#ffffff"], false);
      else if (meta.order >= 1) fx.burst(cx, cy, [meta.color], 30, 0.8);
    },
    [fx]
  );

  // --------------------------------------------------- pojedyncze otwarcie
  const openSingle = useCallback(
    async (mode: "normal" | "fast") => {
      if (!caseDef || !user || busyRef.current) return;
      if (!canOpen) {
        toast(freeLocked ? "Ta skrzynka jest dla spłukanych graczy (< 15 zł)" : "Za mało środków", "err");
        sfx.lose();
        return;
      }
      busyRef.current = true;
      setPhase("spinning");
      setPaused(false);
      setHighlight(null);
      setWon(null);
      setMulti(null);
      sfx.open();

      try {
        const res = await fetch("/api/case/open", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, caseId: caseDef.id, count: 1, boost }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error ?? "Błąd otwierania", "err");
          setPhase("idle");
          busyRef.current = false;
          if (res.status === 429) void refresh();
          return;
        }
        const row = data.items[0];
        setBalance(data.balanceCents);

        const fast = mode === "fast";
        const LEN = fast ? FAST_LEN : NORMAL_LEN;
        const WIN = fast ? FAST_WIN_AT : NORMAL_WIN_AT;
        const items: ReelItemData[] = [];
        for (let i = 0; i < LEN; i++) {
          if (i === WIN) {
            items.push({ slotKey: `w-${row.id}`, weapon: row.weapon, name: row.name, rarity: row.rarity, priceCents: row.priceCents });
          } else {
            const s = rollItem(caseDef);
            items.push({ slotKey: `s${i}-${s.key}`, weapon: s.weapon, name: s.name, rarity: s.rarity, priceCents: toCents(s.price) });
          }
        }
        setStrip(items);
        setStripKey((k) => k + 1);
        await new Promise((r) => setTimeout(r, 60));
        const meta = RARITY_META[row.rarity as Rarity] ?? RARITY_META.milspec;
        await reelRef.current?.spin(WIN, (fast ? 1500 : 6800) + (meta.order >= 3 ? 1000 : 0));
        setHighlight(WIN);
        setFlash({ color: meta.color, key: Date.now() });
        window.setTimeout(() => setFlash(null), 750);
        setPhase("idle");
        busyRef.current = false;
        void refresh();
        const wonItem: WonItem = { invId: row.id, weapon: row.weapon, name: row.name, rarity: row.rarity, priceCents: row.priceCents };
        window.setTimeout(() => setWon(wonItem), meta.order >= 3 ? 550 : 380);
        reveal(wonItem);
      } catch {
        toast("Brak połączenia", "err");
        setPhase("idle");
        busyRef.current = false;
      }
    },
    [caseDef, user, canOpen, freeLocked, setBalance, toast, refresh, reveal, boost]
  );

  // -------------------------------------------------------- multi otwarcie
  const MULTI_LEN = 34;
  const MULTI_WIN = 28;

  const buildMultiStrip = useCallback(
    (winner: MultiItem, stripIdx: number): ReelItemData[] => {
      const arr: ReelItemData[] = [];
      if (!caseDef) return arr;
      for (let i = 0; i < MULTI_LEN; i++) {
        if (i === MULTI_WIN) {
          arr.push({ slotKey: `m${stripIdx}-w-${winner.invId}`, weapon: winner.weapon, name: winner.name, rarity: winner.rarity, priceCents: winner.priceCents });
        } else {
          const s = rollItem(caseDef);
          arr.push({ slotKey: `m${stripIdx}-f${i}-${s.key}`, weapon: s.weapon, name: s.name, rarity: s.rarity, priceCents: toCents(s.price) });
        }
      }
      return arr;
    },
    [caseDef]
  );

  const openMulti = useCallback(async () => {
    if (!caseDef || !user || busyRef.current || qty <= 1) return;
    if (!canMulti) {
      toast(`Za mało środków na ${qty} skrzynki`, "err");
      sfx.lose();
      return;
    }
    busyRef.current = true;
    setWon(null);
    setMulti(null);
    setMultiSpin(null);
    setMultiSettled(0);
    sfx.open();
    try {
      const res = await fetch("/api/case/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, caseId: caseDef.id, count: qty, boost }),
      });
      const data = await res.json();
      if (!res.ok) {
        busyRef.current = false;
        toast(data.error ?? "Błąd otwierania", "err");
        return;
      }
      setBalance(data.balanceCents);
      void refresh();
      const items: MultiItem[] = (data.items as Array<Record<string, unknown>>).map((row) => ({
        invId: row.id as string,
        weapon: row.weapon as string,
        name: row.name as string,
        rarity: row.rarity as string,
        priceCents: row.priceCents as number,
      }));
      const strips = items.map((it, i) => buildMultiStrip(it, i));
      setMultiSpin({ strips, items, costCents: data.costCents });
      await new Promise((r) => setTimeout(r, 100));
      // kręcimy wszystkie naraz, start z przesunięciem
      await Promise.all(
        strips.map((_, i) =>
          new Promise((r2) => setTimeout(r2, i * 230))
            .then(() => {
              multiRowRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
              return multiRefs.current[i]?.spin(MULTI_WIN, 2100 + i * 320);
            })
            .then(() => setMultiSettled((s) => Math.max(s, i + 1)))
        )
      );
      await new Promise((r) => setTimeout(r, 650));
      setMultiSpin(null);
      setMulti({ items, costCents: data.costCents });
      busyRef.current = false;
    } catch {
      busyRef.current = false;
      setMultiSpin(null);
      toast("Brak połączenia", "err");
    }
  }, [caseDef, user, qty, canMulti, setBalance, toast, refresh, buildMultiStrip, boost]);

  // Klawiatura
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (multiSpin) {
        if (e.code === "KeyS" || e.code === "Escape" || e.code === "Space") {
          e.preventDefault();
          multiRefs.current.forEach((r) => r?.skip());
        }
        return;
      }
      if (multi) {
        if (e.code === "Escape") setMulti(null);
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          setMulti(null);
          void openMulti();
        }
        return;
      }
      if (won) {
        if (e.code === "Escape") setWon(null);
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          setWon(null);
          void openSingle("normal");
        }
        return;
      }
      if (phase === "spinning") {
        if (e.code === "KeyP") {
          setPaused((p) => {
            const n = !p;
            reelRef.current?.setPaused(n);
            return n;
          });
        }
        if (e.code === "KeyS" || e.code === "Escape") reelRef.current?.skip();
        return;
      }
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (qty > 1) void openMulti();
        else void openSingle("normal");
      }
      if (e.code === "KeyF") void openSingle("fast");
      if (e.code === "Digit1") setQty(1);
      if (e.code === "Digit3") setQty(3);
      if (e.code === "Digit5") setQty(5);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSingle, openMulti, phase, won, multi, multiSpin, qty]);

  const sellWon = useCallback(async () => {
    if (!won || !user || selling) return;
    setSelling(true);
    const res = await fetch("/api/inventory/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, itemIds: [won.invId] }),
    });
    const data = await res.json();
    setSelling(false);
    if (res.ok) {
      setBalance(data.balanceCents);
      sfx.sell();
      toast(`Sprzedano za ${formatPLN(data.totalCents)}`, "ok");
      setWon(null);
      void refresh();
    } else {
      toast(data.error ?? "Błąd sprzedaży", "err");
    }
  }, [won, user, selling, setBalance, toast, refresh]);

  if (!caseDef) {
    return (
      <div className="panel mx-auto mt-16 max-w-md p-10 text-center">
        <p className="font-display text-lg font-bold text-white">Nie ma takiej skrzynki</p>
        <Link href="/" className="btn-gold mt-5 inline-flex">Wróć do lobby</Link>
      </div>
    );
  }

  const rarityChances = caseDef.items.reduce<Record<string, number>>((acc, it) => {
    acc[it.rarity] = (acc[it.rarity] ?? 0) + chancePct(caseDef, it);
    return acc;
  }, {});

  return (
    <div>
      <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-white/40 transition-colors hover:text-white">
        <ArrowLeft size={14} /> Wszystkie skrzynki
      </Link>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Panel skrzynki */}
        <div className="panel relative overflow-hidden p-5">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-[60px]" style={{ background: `${caseDef.accent}30` }} />
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={caseDef.image}
              alt={caseDef.name}
              className="w-full rounded-xl border border-white/10"
              style={caseDef.hue ? { filter: `hue-rotate(${caseDef.hue}deg) saturate(1.15)` } : undefined}
            />
            {isFree && (
              <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-lg bg-green-500 px-2.5 py-1 text-[11px] font-black text-[#ffffff]">
                <Gift size={12} /> DARMOWA
              </span>
            )}
          </div>
          <h1 className="font-display mt-4 text-xl font-black tracking-wide text-white">
            {baseDef!.name}
            {boost && <span className="ml-2 rounded-md bg-amber-400 px-1.5 py-0.5 align-middle text-[10px] font-black text-black">⚡ BOOST</span>}
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-white/45">{caseDef.tagline}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {Object.entries(rarityChances)
              .sort((a, b) => RARITY_META[b[0] as Rarity].order - RARITY_META[a[0] as Rarity].order)
              .map(([r, pct]) => (
                <span
                  key={r}
                  className="rounded-md px-2 py-1 text-[10px] font-black tabular-nums"
                  style={{ background: `${RARITY_META[r as Rarity].color}1f`, color: RARITY_META[r as Rarity].color }}
                >
                  {pct.toFixed(2)}%
                </span>
              ))}
          </div>

          {/* BOOST */}
          {!isFree && boostDef && (
            <div className={`mt-4 rounded-xl border p-3 transition-colors ${boost ? "border-amber-400/60 bg-amber-500/10" : "border-white/10 bg-white/[0.03]"}`}>
              <button
                onClick={() => {
                  setBoost((b) => !b);
                  setStrip(null);
                  setHighlight(null);
                  sfx.click();
                }}
                disabled={phase === "spinning"}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span className="flex items-center gap-2">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${boost ? "bg-amber-400 text-black" : "bg-white/8 text-amber-300"}`}>
                    <Zap size={16} />
                  </span>
                  <span>
                    <span className="block text-xs font-black text-white">TRYB BOOST</span>
                    <span className="block text-[10px] leading-snug text-white/45">
                      Każdy skin ma <b className="text-amber-300">równą szansę {(100 / (boostDef.items.length)).toFixed(1)}%</b> — także nóż!
                    </span>
                  </span>
                </span>
                <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${boost ? "bg-amber-400" : "bg-white/15"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${boost ? "left-[22px]" : "left-0.5"}`} />
                </span>
              </button>
              <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                <span className="text-white/40">Cena boost:</span>
                <span className="text-amber-300">{formatPLN(toCents(boostDef.price))} <span className="text-white/30">(zwykła {formatPLN(toCents(baseDef!.price))})</span></span>
              </div>
            </div>
          )}

          {/* ilość */}
          {!isFree && (
            <div className="mt-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/35">Ile skrzynek naraz?</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[1, 3, 5].map((n) => (
                  <button
                    key={n}
                    className="chip-toggle"
                    data-on={qty === n}
                    onClick={() => {
                      setQty(n);
                      sfx.click();
                    }}
                  >
                    ×{n} · {formatPLN(cost * n)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* akcje */}
          {isFree ? (
            <div className="mt-5">
              {freeOnCooldown ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-sm font-bold text-white/50">
                  <Clock size={15} className="text-gold" /> Następna darmowa za {cdText}
                </div>
              ) : freeLocked ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center text-xs font-bold leading-snug text-white/50">
                  <Lock size={14} className="shrink-0" /> Dostępna, gdy masz mniej niż 15 zł salda
                </div>
              ) : (
                <button onClick={() => void openSingle("normal")} disabled={phase === "spinning"} className="btn-gold w-full py-3">
                  <Gift size={16} /> OTWÓRZ ZA DARMO
                </button>
              )}
            </div>
          ) : qty > 1 ? (
            <div className="mt-5">
              <button onClick={() => void openMulti()} disabled={!canMulti} className="btn-gold w-full flex-col gap-0.5 py-3">
                <span className="flex items-center gap-1.5"><PackageOpen size={16} /> OTWÓRZ ×{qty} NARAZ</span>
                <span className="text-[10px] font-bold text-[#ffffff]/70">koszt {formatPLN(totalCost)} · wyniki od razu</span>
              </button>
              {!canMulti && <p className="mt-2 text-center text-[11px] font-semibold text-red-400">Za mało środków</p>}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => void openSingle("fast")} disabled={phase === "spinning" || !canOpen} className="btn-ghost flex-col gap-1 py-3">
                <span className="flex items-center gap-1.5 text-gold"><Zap size={15} /> FAST SPIN</span>
                <span className="text-[10px] font-semibold text-white/35">szybko · F</span>
              </button>
              <button onClick={() => void openSingle("normal")} disabled={phase === "spinning" || !canOpen} className="btn-gold flex-col gap-1 py-3">
                <span className="flex items-center gap-1.5"><PackageOpen size={15} /> OTWÓRZ · {formatPLN(cost)}</span>
                <span className="text-[10px] font-bold text-[#ffffff]/70">spacja</span>
              </button>
            </div>
          )}
        </div>

        {/* Maszyna losująca */}
        <div className="panel relative overflow-hidden p-4 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-[0.25em] text-white/35">
              {phase === "spinning" ? "Losowanie…" : "Gotowy do otwarcia"}
            </div>
            <div className="flex items-center gap-2">
              {phase === "spinning" && (
                <>
                  <button
                    onClick={() =>
                      setPaused((p) => {
                        const n = !p;
                        reelRef.current?.setPaused(n);
                        return n;
                      })
                    }
                    className="btn-ghost px-3 py-1.5 text-[11px]"
                  >
                    {paused ? <Play size={12} /> : <Pause size={12} />} {paused ? "Wznów" : "Pauza"} <kbd className="text-white/30">P</kbd>
                  </button>
                  <button onClick={() => reelRef.current?.skip()} className="btn-ghost px-3 py-1.5 text-[11px]">
                    <SkipForward size={12} /> Pomiń <kbd className="text-white/30">S</kbd>
                  </button>
                </>
              )}
              {won === null && phase === "idle" && (
                <div className="hidden items-center gap-2 text-[10px] font-semibold text-white/30 md:flex">
                  <span><kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">Spacja</kbd> otwórz</span>
                  <span><kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">1/3/5</kbd> ilość</span>
                </div>
              )}
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/10 bg-black/35">
            {strip ? (
              <SpinReel key={stripKey} ref={reelRef} items={strip} highlightWin={highlight} itemW={isMobile ? 128 : 158} cardSize={isMobile ? "sm" : "md"} />
            ) : (
              <SpinReel key="idle" items={idleStrip} highlightWin={null} itemW={isMobile ? 128 : 158} cardSize={isMobile ? "sm" : "md"} />
            )}
            {/* błysk przy trafieniu */}
            {flash && (
              <div key={flash.key} className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
                <div className="flash-ring" style={{ borderColor: flash.color, boxShadow: `0 0 60px 10px ${flash.color}` }} />
              </div>
            )}
          </div>
          {paused && phase === "spinning" && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">
              <span className="rounded-xl border border-gold/40 bg-black/80 px-4 py-2 font-display text-sm font-black tracking-[0.3em] text-gold">PAUZA</span>
            </div>
          )}
        </div>
      </div>

      {/* Zawartość skrzynki */}
      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-black tracking-wide text-white">W TEJ SKRZYNCE</h2>
            <p className="mt-0.5 text-xs text-white/40">
              {boost ? <span className="text-amber-300">BOOST: każdy skin dokładnie {(100 / caseDef.items.length).toFixed(2)}% — suma 100%</span> : "Dokładne szanse na każdy drop — suma: 100%"}
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          {[...caseDef.items]
            .sort((a, b) => b.price - a.price)
            .map((it) => {
              const meta = RARITY_META[it.rarity];
              const pct = chancePct(caseDef, it);
              return (
                <div key={it.key} className="group flex items-center gap-3 rounded-xl border border-white/6 bg-panel px-3 py-2.5 transition-colors hover:border-white/15 sm:gap-4">
                  <span
                    className="grid h-12 w-16 shrink-0 place-items-center rounded-lg border sm:h-14 sm:w-20"
                    style={{ borderColor: `${meta.color}33`, background: `${meta.color}12`, color: meta.color }}
                  >
                    <WeaponArt weapon={it.weapon} name={it.name} className="h-8 w-14 transition-transform duration-300 group-hover:scale-110 sm:h-9 sm:w-16" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-white/90">
                      <span className="text-white/45">{it.weapon}</span> · {it.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider" style={{ background: `${meta.color}1c`, color: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="text-xs font-bold tabular-nums text-white/60">{formatPLN(toCents(it.price))}</span>
                    </div>
                  </div>
                  <div className="w-24 shrink-0 sm:w-32">
                    <div className="text-right text-sm font-black tabular-nums" style={{ color: meta.color }}>
                      {pct.toFixed(2)}%
                    </div>
                    <div className="odds-bar mt-1.5">
                      <div style={{ width: `${Math.min(100, pct)}%`, background: meta.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      {/* ANIMOWANY MULTI-OPEN: ruletka dla każdej skrzynki */}
      {multiSpin && (
        <div className="fixed inset-0 z-[104] overflow-y-auto bg-black/85 p-3 backdrop-blur-md">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center py-4">
            <div className="mb-3 flex items-center justify-center gap-3 text-center">
              <span className="font-display text-sm font-black uppercase tracking-[0.3em] text-white/60 sm:text-base">
                Losowanie {multiSpin.strips.length} skrzynek
              </span>
              <button
                onClick={() => multiRefs.current.forEach((r) => r?.skip())}
                className="btn-ghost px-3 py-1.5 text-[11px]"
              >
                <SkipForward size={12} /> Pomiń wszystkie
              </button>
            </div>
            <div className="space-y-2.5">
              {multiSpin.strips.map((strip, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    multiRowRefs.current[i] = el;
                  }}
                  className={`flip-in rounded-2xl border bg-black/40 p-1.5 sm:p-2 ${multiSettled === i ? "border-gold/40" : "border-white/8"}`}
                  style={{ animationDelay: `${i * 0.12}s`, scrollMarginTop: "1rem" }}
                >
                  <div className="mb-1 flex items-center justify-between px-1.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-white/30">
                      Skrzynka {i + 1}/{multiSpin.strips.length}
                    </span>
                    {multiSettled > i && (
                      <span className="text-[10px] font-black tabular-nums" style={{ color: caseDef.accent }}>
                        {formatPLN(multiSpin.items[i]?.priceCents ?? 0)}
                      </span>
                    )}
                  </div>
                  <SpinReel
                    ref={(h) => {
                      multiRefs.current[i] = h;
                    }}
                    items={strip}
                    itemW={isMobile ? 114 : 140}
                    cardSize={isMobile ? "xs" : "sm"}
                    highlightWin={multiSettled > i ? MULTI_WIN : null}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {won && (
        <WinModal
          item={won}
          selling={selling}
          onSell={() => void sellWon()}
          onKeep={() => setWon(null)}
          onAgain={
            isFree || qty > 1
              ? undefined
              : () => {
                  setWon(null);
                  void openSingle("normal");
                }
          }
          againLabel={`Otwórz ponownie · ${formatPLN(cost)}`}
        />
      )}
      {multi && (
        <MultiResult
          items={multi.items}
          costCents={multi.costCents}
          caseName={caseDef.name}
          onClose={() => setMulti(null)}
          onAgain={() => {
            setMulti(null);
            void openMulti();
          }}
          againLabel={`Jeszcze raz ×${qty} · ${formatPLN(totalCost)}`}
        />
      )}
    </div>
  );
}
