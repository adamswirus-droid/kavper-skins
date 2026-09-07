"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";
import type { DbBattle, RollItem } from "@/db/schema";
import { CASE_MAP, formatPLN, rollItem, toCents, parseRoundCase, getCase } from "@/lib/data";
import { useApp } from "@/components/app";
import { useFx } from "@/components/fx";
import { SpinReel, type ReelItemData, type SpinHandle } from "@/components/reel";
import { SkinCard } from "@/components/skin";
import { sfx } from "@/lib/sound";
import { getSettings, animMs } from "@/lib/settings";
import { ArrowLeft, Crown, Ghost, Hourglass, Swords, Trophy, Users, X } from "lucide-react";

const STRIP_LEN = 26;
const WIN_AT = 22;
const SPIN_MS = 2100;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function BattleRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, toast, refresh, setBalance } = useApp();
  const fx = useFx();

  const [battle, setBattle] = useState<DbBattle | null>(null);
  const [missing, setMissing] = useState(false);
  const [phase, setPhase] = useState<"waiting" | "animating" | "done" | "idle">("idle");
  const [count, setCount] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const [roundStrips, setRoundStrips] = useState<{ p1: ReelItemData[]; p2: ReelItemData[] }[]>([]);
  const [settled, setSettled] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [joining, setJoining] = useState(false);
  const reelRefs = useRef<Map<string, SpinHandle>>(new Map());
  const roundRefs = useRef<(HTMLDivElement | null)[]>([]);
  const verdictRef = useRef<HTMLDivElement | null>(null);

  // płynne przewinięcie do elementu (środek ekranu), z uwzględnieniem sticky headera
  const scrollToEl = useCallback((el: HTMLElement | null, block: ScrollLogicalPosition = "center") => {
    if (!el) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block, inline: "nearest" });
  }, []);
  const animFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/battle/${id}`, { cache: "no-store" });
      if (!res.ok) {
        setMissing(true);
        return null;
      }
      const data = await res.json();
      setBattle(data.battle);
      return data.battle as DbBattle;
    } catch {
      return null;
    }
  }, [id]);

  // Taśma z wyraźną różnorodnością: unikamy tej samej broni obok siebie
  // i wplatamy rzadkie skiny, żeby animacja wyglądała jak prawdziwa ruletka.
  const buildStrip = useCallback((caseToken: string, roll: RollItem, stripIdx: number): ReelItemData[] => {
    const pr = parseRoundCase(caseToken);
    const caseDef = getCase(pr.id, pr.boost);
    const arr: ReelItemData[] = [];
    if (!caseDef) return arr;
    let prevKey = "";
    for (let i = 0; i < STRIP_LEN; i++) {
      if (i === WIN_AT) {
        arr.push({ slotKey: `w-${stripIdx}-${roll.key}`, weapon: roll.weapon, name: roll.name, rarity: roll.rarity, priceCents: roll.priceCents });
        prevKey = roll.key;
        continue;
      }
      let s = rollItem(caseDef);
      // co ~4. slot pokaż celowo rzadszy skin (tease), reszta wg prawdziwych szans
      if (i % 4 === 2) {
        const rare = caseDef.items.filter((it) => it.rarity !== "milspec");
        s = rare[Math.floor(Math.random() * rare.length)] ?? s;
      }
      let guard = 0;
      while (s.key === prevKey && guard++ < 6) s = rollItem(caseDef);
      prevKey = s.key;
      arr.push({ slotKey: `f-${stripIdx}-${i}-${s.key}`, weapon: s.weapon, name: s.name, rarity: s.rarity, priceCents: toCents(s.price) });
    }
    return arr;
  }, []);

  const runAnimation = useCallback(
    async (b: DbBattle) => {
      if (animFor.current === b.id) return;
      animFor.current = b.id;
      setPhase("animating");
      setRoundStrips([]);
      setSettled(0);
      // odliczanie 3-2-1 zanim wystartuje losowanie — obaj gracze widzą to samo
      if (getSettings().countdown && !getSettings().reducedMotion) {
        for (let c = 3; c >= 1; c--) {
          setCount(c);
          sfx.countdown(c);
          await sleep(1000);
        }
        sfx.countdown(0);
      }
      setCount(null);
      sfx.open();
      for (let i = 0; i < b.rounds; i++) {
        const roundCaseId = b.caseIds && b.caseIds.length > i ? b.caseIds[i] : b.caseId;
        const p1 = buildStrip(roundCaseId, b.p1Rolls[i], i * 2);
        const p2 = buildStrip(roundCaseId, b.p2Rolls?.[i] ?? b.p1Rolls[i], i * 2 + 1);
        setRoundStrips((prev) => [...prev, { p1, p2 }]);
        await sleep(60);
        // auto-scroll do rundy, która właśnie startuje (mobile: nie trzeba scrollować ręcznie)
        scrollToEl(roundRefs.current[i], "center");
        await sleep(160);
        if (b.rounds > 1) sfx.drumroll(Math.min(900, animMs(SPIN_MS)));
        await Promise.all([
          reelRefs.current.get(`${i}-p1`)?.spin(WIN_AT, SPIN_MS),
          reelRefs.current.get(`${i}-p2`)?.spin(WIN_AT, SPIN_MS + 120),
        ]);
        setSettled(i + 1);
        // dźwięk rundy: kto wygrał tę rundę (z perspektywy gracza)
        {
          const me = user?.id;
          const p1v = b.p1Rolls[i]?.priceCents ?? 0;
          const p2v = b.p2Rolls?.[i]?.priceCents ?? 0;
          const meP1 = me === b.p1Id;
          const iPlay = me === b.p1Id || me === b.p2Id;
          if (b.mode === "shared" || !iPlay) sfx.click();
          else {
            const better = b.mode === "joker" ? p1v < p2v : p1v > p2v;
            const iWonRound = p1v === p2v ? null : meP1 ? better : !better;
            if (iWonRound === true) sfx.roundWin();
            else if (iWonRound === false) sfx.roundLose();
            else sfx.click();
          }
        }
        await sleep(animMs(420));
      }
      setPhase("done");
      window.setTimeout(() => scrollToEl(verdictRef.current, "center"), 120);
      const iWon = !!user && b.winnerId === user.id;
      const iPlay = !!user && (b.p1Id === user.id || b.p2Id === user.id);
      if (iWon) {
        sfx.fanfare();
        fx.celebrate(window.innerWidth / 2, window.innerHeight / 2.6, ["#2563eb", "#ffffff", "#22c55e"], true);
        void refresh().then(() => undefined);
      } else if (iPlay) {
        if (b.mode === "shared") {
          sfx.coin();
          fx.burst(window.innerWidth / 2, window.innerHeight / 2.6, ["#34d399", "#ffffff"], 60, 1.1);
        } else if (b.winnerName) {
          sfx.lose();
          fx.shake(1);
        } else {
          sfx.coin();
        }
        void refresh().then(() => undefined);
      }
    },
    [buildStrip, user, fx, refresh, scrollToEl]
  );

  // start
  useEffect(() => {
    void (async () => {
      const b = await load();
      if (!b) return;
      if (b.status === "finished" || b.status === "cancelled") {
        await runAnimation(b);
      } else {
        setPhase("waiting");
      }
    })();
  }, [load, runAnimation]);

  // polling w trakcie oczekiwania
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setInterval(async () => {
      const b = await load();
      if (b && (b.status === "finished" || b.status === "cancelled")) {
        await runAnimation(b);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [phase, load, runAnimation]);

  const cancel = async () => {
    if (!user || cancelling) return;
    setCancelling(true);
    const res = await fetch(`/api/battle/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    if (res.ok) {
      toast("Bitwa anulowana — wpisowe zwrócone", "ok");
      void refresh();
      router.push("/battles");
    } else {
      const d = await res.json();
      toast(d.error ?? "Nie można anulować", "err");
      setCancelling(false);
    }
  };

  const join = async () => {
    if (!user || joining) return;
    setJoining(true);
    const res = await fetch(`/api/battle/${id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "Nie można dołączyć", "err");
      setJoining(false);
      void load();
      return;
    }
    void refresh();
    await runAnimation(data.battle);
  };

  const rematch = async () => {
    if (!user || !battle) return;
    const res = await fetch("/api/battle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        caseIds: battle.caseIds && battle.caseIds.length > 0 ? battle.caseIds : Array.from({ length: battle.rounds }, () => battle.caseId),
        mode: battle.mode,
        vsBot: battle.p2Bot,
        botKey: battle.botKey,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "Nie udało się", "err");
      return;
    }
    setBalance(Math.max(0, (user.balanceCents - data.costCents)));
    animFor.current = null;
    router.push(`/battle/${data.battle.id}`);
    router.refresh?.();
    // przeładuj stan nowej bitwy po nawigacji
    setBattle(null);
    setPhase("idle");
    window.setTimeout(() => void load(), 500);
  };

  if (missing) {
    return (
      <div className="panel mx-auto mt-16 max-w-md p-10 text-center">
        <p className="font-display text-lg font-bold text-white">Nie znaleziono bitwy</p>
        <Link href="/battles" className="btn-gold mt-5 inline-flex">Lista bitew</Link>
      </div>
    );
  }

  if (!battle || phase === "idle") {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-gold" />
      </div>
    );
  }

  const caseDef = CASE_MAP.get(battle.caseId);
  const isJoker = battle.mode === "joker";
  const isShared = battle.mode === "shared";
  const iAmP1 = user?.id === battle.p1Id;
  const iPlay = !!user && (iAmP1 || user.id === battle.p2Id);

  const sum = (rolls: RollItem[] | null | undefined, upto: number) =>
    (rolls ?? []).slice(0, upto).reduce((s, r) => s + r.priceCents, 0);
  const potTotal = sum(battle.p1Rolls, battle.rounds) + sum(battle.p2Rolls, battle.rounds);
  const p1Shown = sum(battle.p1Rolls, settled);
  const p2Shown = sum(battle.p2Rolls, settled);
  const leader: 1 | 2 | 0 =
    isShared || settled === 0 || p1Shown === p2Shown ? 0 : isJoker ? (p1Shown < p2Shown ? 1 : 2) : p1Shown > p2Shown ? 1 : 2;
  const iWon = !!user && battle.winnerId === user.id;
  const tie = phase === "done" && !battle.winnerName;

  // ------------------------------- waiting -------------------------------
  if (phase === "waiting") {
    return (
      <div className="mx-auto max-w-lg">
        <Link href="/battles" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white">
          <ArrowLeft size={14} /> Lista bitew
        </Link>
        <div className="panel relative overflow-hidden p-8 text-center">
          <div className="absolute left-1/2 top-0 h-40 w-64 -translate-x-1/2 rounded-full bg-gold/10 blur-[60px]" />
          <Swords size={40} className="mx-auto animate-pulse text-gold" />
          <h1 className="font-display mt-4 text-xl font-black text-white">CZEKANIE NA PRZECIWNIKA…</h1>
          <p className="mt-2 text-xs leading-relaxed text-white/45">
            {iAmP1
              ? "Bitwa jest na liście otwartych — znajomy może dołączyć z zakładki Bitwy."
              : "Ta bitwa czeka na drugiego gracza."}
          </p>
          <div className="mx-auto mt-5 grid max-w-xs grid-cols-3 items-center gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-gold/15 text-sm font-black text-gold">
                {battle.p1Name.slice(0, 2).toUpperCase()}
              </div>
              <div className="mt-1.5 truncate text-xs font-bold text-white">{battle.p1Name}</div>
            </div>
            <span className="font-display text-lg font-black text-white/20">VS</span>
            <div className="rounded-xl border border-dashed border-white/15 p-3">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-white/5">
                <Hourglass size={16} className="animate-pulse text-white/30" />
              </div>
              <div className="mt-1.5 text-xs font-bold text-white/30">???</div>
            </div>
          </div>
          <div className="mt-4 text-[11px] text-white/40">
            {caseDef?.name} · {battle.rounds} {battle.rounds === 1 ? "runda" : "rundy"} · wpisowe{" "}
            <b className="text-gold">{formatPLN(battle.costCents)}</b> ·{" "}
            {isShared ? <b className="text-emerald-300">SHARED 50/50</b> : isJoker ? <b className="text-purple-300">JOKER</b> : <b className="text-gold">STANDARD</b>}
          </div>
          <div className="mt-6 flex justify-center gap-2.5">
            {iAmP1 ? (
              <button onClick={() => void cancel()} disabled={cancelling} className="btn-ghost text-sm text-red-300">
                <X size={15} /> {cancelling ? "Anulowanie…" : "Anuluj bitwę (zwrot)"}
              </button>
            ) : (
              <button onClick={() => void join()} disabled={joining || (user?.balanceCents ?? 0) < battle.costCents} className="btn-gold text-sm">
                <Swords size={15} /> {joining ? "Dołączanie…" : `Dołącz · ${formatPLN(battle.costCents)}`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------- arena --------------------------------
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/battles" className="inline-flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-white">
          <ArrowLeft size={14} /> Lista bitew
        </Link>
        <div className="flex items-center gap-2">
          {isShared ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
              <Users size={11} /> Shared — pula 50/50
            </span>
          ) : isJoker ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-purple-300">
              <Ghost size={11} /> Joker — najsłabszy wygrywa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gold">
              <Crown size={11} /> Standard — najlepszy wygrywa
            </span>
          )}
        </div>
      </div>

      {/* gracze + sumy */}
      <div className="sticky top-14 z-30 -mx-3 mt-3 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 bg-ink/85 px-3 py-2 backdrop-blur-xl sm:static sm:mx-0 sm:mt-4 sm:gap-4 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {(["p1", "p2"] as const).map((side) => {
          const name = side === "p1" ? battle.p1Name : battle.p2Name ?? "???";
          const val = side === "p1" ? p1Shown : p2Shown;
          const isLead = (side === "p1" && leader === 1) || (side === "p2" && leader === 2);
          const isWinner = phase === "done" && (side === "p1" ? battle.winnerId === battle.p1Id : battle.winnerName === name && !!battle.winnerName && battle.winnerId !== battle.p1Id);
          return (
            <div
              key={side}
              className={`relative rounded-xl border p-2 text-center transition-all duration-300 sm:rounded-2xl sm:p-4 ${
                isWinner
                  ? "border-gold/60 bg-gold/10 shadow-[0_0_50px_-12px_rgba(37,99,235,.5)]"
                  : isLead && phase !== "done"
                    ? "border-white/25 bg-white/[0.05]"
                    : "border-white/8 bg-white/[0.02]"
              }`}
            >
              {isLead && phase !== "done" && settled > 0 && (
                <span className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[9px] font-black text-[#ffffff]">
                  <Crown size={9} /> {isJoker ? "NAJGORSZY" : "PROWADZI"}
                </span>
              )}
              <div
                className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-black sm:h-12 sm:w-12 sm:text-base ${
                  isWinner ? "bg-gold text-[#ffffff]" : "bg-white/8 text-white/70"
                }`}
              >
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div className="mt-1 truncate text-[11px] font-bold text-white sm:mt-2 sm:text-sm">
                {name}
                {(side === "p1") === iAmP1 && iPlay ? <span className="ml-1 text-[10px] font-semibold text-gold/70">(ty)</span> : null}
              </div>
              <div className={`mt-0.5 font-display text-sm font-black tabular-nums sm:mt-1 sm:text-xl ${isWinner ? "text-gold" : "text-white/85"}`}>
                {formatPLN(val)}
              </div>
            </div>
          );
        })}
        <div className="grid place-items-center">
          <span className="font-display text-base font-black text-white/15 sm:text-3xl">VS</span>
        </div>
      </div>

      {/* rundy */}
      <div className="mt-4 space-y-3">
        {roundStrips.map((r, i) => {
          const roundTok = battle.caseIds && battle.caseIds.length > i ? battle.caseIds[i] : battle.caseId;
          const roundPr = parseRoundCase(roundTok);
          const roundCase = getCase(roundPr.id, roundPr.boost) ?? CASE_MAP.get(roundPr.id);
          return (
          <div
            key={i}
            ref={(el) => {
              roundRefs.current[i] = el;
            }}
            className={`panel flip-in overflow-hidden p-2 sm:p-3 transition-shadow duration-300 ${settled === i && phase === "animating" ? "ring-1 ring-gold/50 shadow-[0_0_40px_-12px_rgba(37,99,235,.5)]" : ""}`}
            style={{ scrollMarginTop: "5rem", contentVisibility: "auto", containIntrinsicSize: "0 220px" }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={roundCase?.image} alt="" className="h-5 w-8 rounded border border-white/10 object-cover" />
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">
                  Runda {i + 1} · {roundCase?.name.replace(" ⚡BOOST", "")}
                  {roundPr.boost && <span className="ml-1.5 rounded bg-amber-400 px-1 py-px text-[8px] font-black text-black">⚡BOOST</span>}
                </span>
              </span>
              {settled > i && (
                <span className="text-[10px] font-bold text-white/40">
                  {formatPLN(battle.p1Rolls[i]?.priceCents ?? 0)} : {formatPLN(battle.p2Rolls?.[i]?.priceCents ?? 0)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(["p1", "p2"] as const).map((side) => (
                <div key={side} className="relative rounded-xl border border-white/10 bg-black/35">
                  <span className={`absolute left-2 top-1.5 z-20 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${side === "p1" ? "bg-gold/15 text-gold" : "bg-white/10 text-white/50"}`}>
                    {side === "p1" ? battle.p1Name : battle.p2Name}
                  </span>
                  <SpinReel
                    ref={(h) => {
                      if (h) reelRefs.current.set(`${i}-${side}`, h);
                      else reelRefs.current.delete(`${i}-${side}`);
                    }}
                    items={r[side]}
                    itemW={isMobile ? 122 : 158}
                    cardSize={isMobile ? "sm" : "md"}
                    highlightWin={settled > i ? WIN_AT : null}
                  />
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>

      {/* odliczanie przed losowaniem */}
      {count !== null && (
        <div className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-black/65 backdrop-blur-sm">
          <div className="text-center">
            <div
              key={count}
              className="pop-in font-display text-8xl font-black text-gold drop-shadow-[0_0_50px_rgba(37,99,235,.65)] sm:text-9xl"
            >
              {count}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.35em] text-white/50">
              <Swords size={14} className="text-gold/70" /> Za chwilę losowanie…
            </div>
          </div>
        </div>
      )}

      {/* werdykt */}
      {phase === "done" && (
        <div ref={verdictRef} style={{ scrollMarginTop: "5rem" }} className={`pop-in mt-6 overflow-hidden rounded-2xl border p-5 text-center sm:p-6 ${
          isShared
            ? "border-emerald-500/40 bg-gradient-to-b from-emerald-500/12 to-transparent shadow-[0_0_80px_-16px_rgba(52,211,153,.45)]"
            : tie
              ? "border-white/15 bg-white/[0.03]"
              : iWon
                ? "border-gold/50 bg-gradient-to-b from-[#3b82f6]/20 to-transparent shadow-[0_0_80px_-16px_rgba(37,99,235,.55)]"
                : "border-white/10 bg-white/[0.03]"
        }`}>
          {isShared ? (
            <Users size={36} className="mx-auto text-emerald-400" />
          ) : (
            <Trophy size={36} className={`mx-auto ${tie ? "text-white/30" : iWon ? "text-gold" : "text-white/30"}`} />
          )}
          <h2 className="font-display mt-3 text-2xl font-black tracking-wide text-white sm:text-3xl">
            {isShared ? "DRUŻYNA! PULA PODZIELONA" : tie ? "REMIS!" : iWon ? "WYGRYWASZ PULĘ!" : `${battle.winnerName} WYGRYWA`}
          </h2>
          <p className="mt-1.5 text-sm text-white/50">
            {isShared ? (
              <>
                Łączna pula <b className="text-emerald-300">{formatPLN(potTotal)}</b> dzielona idealnie po równo:
                każdy z graczy dostał <b className="text-emerald-300">{formatPLN(Math.floor(potTotal / 2))}</b> na saldo
                {potTotal % 2 === 1 ? " (drugi +1 gr)" : ""}.
              </>
            ) : tie ? (
              "Identyczne sumy — wpisowe wraca do obu graczy."
            ) : (
              `Cała pula ${formatPLN(potTotal)} trafia do ekwipunku zwycięzcy.`
            )}
          </p>
          {/* cała zdobycz */}
          {(isShared || !tie) && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[...battle.p1Rolls, ...(battle.p2Rolls ?? [])].map((r, i) => (
                <SkinCard key={`${r.key}-${i}`} weapon={r.weapon} name={r.name} rarity={r.rarity} priceCents={r.priceCents} size="xs" dim={!isShared && !iWon && iPlay} />
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {iPlay && (
              <button onClick={() => void rematch()} className="btn-gold text-sm">
                <Swords size={15} /> {isShared ? "Znowu razem" : "Rewanż"} · {formatPLN(battle.costCents)}
              </button>
            )}
            <Link href="/battles" className="btn-ghost text-sm" onClick={() => sfx.click()}>
              Nowe bitwy
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
