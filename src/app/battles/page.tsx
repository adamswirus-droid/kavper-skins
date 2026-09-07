"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DbBattle, DbBotStats } from "@/db/schema";
import { CASES, CASE_MAP, BOOST_MAP, formatPLN, toCents, MAX_BATTLE_CASES, BOTS, parseRoundCase, roundToken } from "@/lib/data";
import { useApp } from "@/components/app";
import { BotAvatar } from "@/components/bots";
import { sfx } from "@/lib/sound";
import { Bot, Crown, Ghost, Plus, Sword, Swords, Timer, Users, X, Zap } from "lucide-react";
import Link from "next/link";

function ModeBadge({ mode }: { mode: string }) {
  if (mode === "shared")
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
        <Users size={11} /> Shared
      </span>
    );
  return mode === "joker" ? (
    <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-300">
      <Ghost size={11} /> Joker
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold">
      <Crown size={11} /> Standard
    </span>
  );
}

function battleCaseIds(b: DbBattle): string[] {
  return b.caseIds && b.caseIds.length > 0 ? b.caseIds : Array.from({ length: b.rounds }, () => b.caseId);
}
function caseOf(token: string) {
  const { id, boost } = parseRoundCase(token);
  return { def: (boost ? BOOST_MAP.get(id) : CASE_MAP.get(id)) ?? CASE_MAP.get(id), boost };
}

function CaseStack({ ids, size = "h-10 w-10" }: { ids: string[]; size?: string }) {
  const shown = ids.slice(0, 3);
  return (
    <div className="flex shrink-0 items-center">
      {shown.map((tok, i) => {
        const { def: c, boost } = caseOf(tok);
        return (
          <span key={i} className={`relative ${i > 0 ? "-ml-3" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c?.image} alt={c?.name ?? ""} className={`${size} rounded-lg border object-cover ${boost ? "border-amber-400" : "border-white/15"}`} title={c?.name} />
            {boost && <Zap size={9} className="absolute -right-0.5 -top-0.5 rounded-full bg-amber-400 p-[1px] text-black" />}
          </span>
        );
      })}
      {ids.length > 3 && (
        <span className="-ml-3 grid h-10 w-10 place-items-center rounded-lg border border-white/15 bg-panel2 text-[10px] font-black text-white/60">
          +{ids.length - 3}
        </span>
      )}
    </div>
  );
}

export default function BattlesPage() {
  const router = useRouter();
  const { user, toast, refresh } = useApp();
  const [open, setOpen] = useState<DbBattle[]>([]);
  const [finished, setFinished] = useState<DbBattle[]>([]);
  const [botStats, setBotStats] = useState<DbBotStats[]>([]);
  const [selected, setSelected] = useState<string[]>([]); // tokeny: "id" lub "id:b"
  const [boostPick, setBoostPick] = useState(false);
  const [mode, setMode] = useState<"standard" | "joker" | "shared">("standard");
  const [vsBot, setVsBot] = useState(true);
  const [botKey, setBotKey] = useState("hobbiton");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const paidCases = useMemo(() => CASES.filter((c) => !c.free), []);
  const cost = useMemo(
    () => selected.reduce((s, tok) => s + toCents(caseOf(tok).def?.price ?? 0), 0),
    [selected]
  );
  const canAfford = !!user && user.balanceCents >= cost && selected.length > 0;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/battle?userId=${user?.id ?? ""}`, { cache: "no-store" });
      const data = await res.json();
      setOpen(data.open ?? []);
      setFinished(data.finished ?? []);
      setBotStats(data.botStats ?? []);
    } catch {
      /* noop */
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const addCase = (id: string) => {
    sfx.click();
    const tok = roundToken(id, boostPick);
    setSelected((prev) => (prev.length >= MAX_BATTLE_CASES ? prev : [...prev, tok]));
  };
  const removeCase = (idx: number) => {
    sfx.click();
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  };

  const create = async () => {
    if (!user || creating || selected.length === 0) return;
    if (!canAfford) {
      toast("Za mało środków na wpisowe", "err");
      return;
    }
    setCreating(true);
    sfx.open();
    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, caseIds: selected, mode, vsBot, botKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Błąd tworzenia bitwy", "err");
        setCreating(false);
        return;
      }
      setSelected([]);
      router.push(`/battle/${data.battle.id}`);
    } catch {
      toast("Brak połączenia", "err");
      setCreating(false);
    }
  };

  const join = async (battleId: string) => {
    if (!user || joining) return;
    setJoining(battleId);
    sfx.click();
    try {
      const res = await fetch(`/api/battle/${battleId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Nie można dołączyć", "err");
        setJoining(null);
        void load();
        return;
      }
      void refresh();
      router.push(`/battle/${battleId}`);
    } catch {
      toast("Brak połączenia", "err");
      setJoining(null);
    }
  };

  const pot = useCallback((b: DbBattle) => {
    const a = (b.p1Rolls ?? []).reduce((s, r) => s + r.priceCents, 0);
    const c = (b.p2Rolls ?? []).reduce((s, r) => s + r.priceCents, 0);
    return a + c;
  }, []);

  return (
    <div>
      <h1 className="font-display text-xl font-black tracking-wide text-white sm:text-2xl">BITWY NA SKINY</h1>
      <p className="mt-1 text-xs text-white/40">
        Wybierz do {MAX_BATTLE_CASES} skrzynek (mogą się powtarzać). <b className="text-gold">Standard:</b> lepsza suma zgarnia
        wszystko. <b className="text-purple-300">Joker:</b> wygrywa najgorsza suma!
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[400px_1fr]">
        {/* Tworzenie */}
        <div className="panel h-fit p-5">
          <h2 className="font-display flex items-center gap-2 text-sm font-black tracking-wide text-white">
            <Sword size={15} className="text-gold" /> NOWA BITWA
          </h2>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-white/35">Skrzynki ({selected.length}/{MAX_BATTLE_CASES})</div>
              {selected.length > 0 && (
                <button onClick={() => setSelected([])} className="text-[10px] font-bold text-red-400/80 hover:text-red-300">
                  wyczyść
                </button>
              )}
            </div>

            {/* wybrane rundy */}
            <div className={`mt-2 min-h-[52px] rounded-xl border border-dashed p-1.5 ${selected.length ? "border-gold/30 bg-gold/[0.04]" : "border-white/12"}`}>
              {selected.length === 0 ? (
                <span className="block px-2 py-2 text-[11px] font-semibold text-white/30">kliknij skrzynki poniżej, żeby dodać rundy…</span>
              ) : (
                <div className="space-y-1">
                  {selected.map((tok, i) => {
                    const { def: c, boost } = caseOf(tok);
                    return (
                      <button
                        key={`${tok}-${i}`}
                        onClick={() => removeCase(i)}
                        title="Kliknij, aby usunąć rundę"
                        className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-red-500/10"
                      >
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold text-[9px] font-black text-[#ffffff]">{i + 1}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c?.image} alt={c?.name} className="h-8 w-8 shrink-0 rounded-md border object-cover" style={{ borderColor: `${c?.accent}66` }} />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-white/85">
                          {c?.name.replace(" ⚡BOOST", "")}
                          {boost && <span className="ml-1 rounded bg-amber-400 px-1 py-px text-[8px] font-black text-black">⚡BOOST</span>}
                        </span>
                        <span className="text-[11px] font-black tabular-nums" style={{ color: c?.accent }}>{formatPLN(toCents(c?.price ?? 0))}</span>
                        <X size={13} className="shrink-0 text-white/20 group-hover:text-red-400" />
                      </button>
                    );
                  })}
                  <div className="flex items-center justify-between border-t border-white/8 px-1.5 pt-1.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Wpisowe razem</span>
                    <span className="text-sm font-black tabular-nums text-gold">{formatPLN(cost)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* przełącznik: zwykłe / boost */}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button className="chip-toggle flex items-center justify-center gap-1" data-on={!boostPick} onClick={() => { setBoostPick(false); sfx.click(); }}>
                Zwykłe skrzynki
              </button>
              <button
                className="chip-toggle flex items-center justify-center gap-1"
                data-on={boostPick}
                onClick={() => { setBoostPick(true); sfx.click(); }}
                style={boostPick ? { borderColor: "rgba(251,191,36,.6)", background: "rgba(251,191,36,.12)", color: "#fbbf24" } : undefined}
              >
                <Zap size={13} /> BOOST (równe szanse)
              </button>
            </div>
            {boostPick && (
              <p className="mt-1.5 text-[10px] leading-snug text-amber-300/80">
                Boost: każdy skin w skrzynce ma tę samą szansę (również nóż). Droższe wpisowe, ogromne pule.
              </p>
            )}

            {/* dostępne skrzynki z cenami */}
            <div className="mt-2 grid max-h-[300px] grid-cols-3 gap-1.5 overflow-y-auto pr-0.5">
              {paidCases.map((base) => {
                const c = boostPick ? BOOST_MAP.get(base.id) ?? base : base;
                const tok = roundToken(base.id, boostPick);
                const count = selected.filter((s) => s === tok).length;
                const full = selected.length >= MAX_BATTLE_CASES;
                return (
                  <button
                    key={c.id}
                    onClick={() => addCase(c.id)}
                    disabled={full}
                    title={`${c.name} · ${formatPLN(toCents(c.price))}`}
                    className="group relative overflow-hidden rounded-xl border bg-black/30 text-left transition-all hover:-translate-y-0.5 disabled:opacity-40"
                    style={{ borderColor: count > 0 ? (boostPick ? "#fbbf24" : c.accent) : boostPick ? "rgba(251,191,36,.25)" : "rgba(255,255,255,.1)" }}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image} alt={c.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      <span className="absolute inset-0 hidden place-items-center bg-black/50 group-hover:grid">
                        <Plus size={18} className="text-gold" />
                      </span>
                      {count > 0 && (
                        <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-black text-black" style={{ background: c.accent }}>
                          ×{count}
                        </span>
                      )}
                    </div>
                    <div className="px-1.5 py-1">
                      <div className="truncate text-[10px] font-bold text-white/80">{base.name}</div>
                      <div className="text-[11px] font-black tabular-nums" style={{ color: boostPick ? "#fbbf24" : c.accent }}>
                        {boostPick && <Zap size={9} className="mr-0.5 inline" />}{formatPLN(toCents(c.price))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/35">Tryb</div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              <button
                onClick={() => { setMode("standard"); sfx.click(); }}
                className={`rounded-xl border p-2.5 text-left transition-all ${mode === "standard" ? "border-gold/60 bg-gold/10" : "border-white/10 bg-white/[0.03]"}`}
              >
                <Crown size={16} className="text-gold" />
                <div className="mt-1.5 text-[11px] font-black text-white">STANDARD</div>
                <div className="mt-0.5 text-[9px] leading-snug text-white/40">Lepszy drop zgarnia całą pulę</div>
              </button>
              <button
                onClick={() => { setMode("joker"); sfx.click(); }}
                className={`rounded-xl border p-2.5 text-left transition-all ${mode === "joker" ? "border-purple-400/60 bg-purple-500/10" : "border-white/10 bg-white/[0.03]"}`}
              >
                <Ghost size={16} className="text-purple-300" />
                <div className="mt-1.5 text-[11px] font-black text-white">JOKER</div>
                <div className="mt-0.5 text-[9px] leading-snug text-white/40">Najsłabszy drop zgarnia wszystko!</div>
              </button>
              <button
                onClick={() => { setMode("shared"); sfx.click(); }}
                className={`rounded-xl border p-2.5 text-left transition-all ${mode === "shared" ? "border-emerald-400/60 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"}`}
              >
                <Users size={16} className="text-emerald-400" />
                <div className="mt-1.5 text-[11px] font-black text-white">SHARED</div>
                <div className="mt-0.5 text-[9px] leading-snug text-white/40">Drużyna: pula dzielona 50/50</div>
              </button>
            </div>
            {mode === "shared" && (
              <p className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-[10px] leading-snug text-emerald-300/80">
                Gramy razem! Oboje otwieracie skrzynki, dropy idą do wspólnej puli, a jej wartość dzielona jest idealnie
                po równo na salda obu graczy. Np. pula 300 zł → każdy dostaje dokładnie 150 zł.
              </p>
            )}
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/35">Przeciwnik</div>
            <div className="mt-2 flex gap-1.5">
              <button className="chip-toggle flex flex-1 items-center justify-center gap-1" data-on={vsBot} onClick={() => { setVsBot(true); sfx.click(); }}>
                <Bot size={13} /> Bot (od razu)
              </button>
              <button className="chip-toggle flex flex-1 items-center justify-center gap-1" data-on={!vsBot} onClick={() => { setVsBot(false); sfx.click(); }}>
                <Users size={13} /> Znajomy
              </button>
            </div>

            {vsBot && (
              <>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {BOTS.map((b) => {
                    const on = botKey === b.key;
                    const st = botStats.find((s) => s.botKey === b.key);
                    const played = st?.played ?? 0;
                    const wr = played > 0 ? Math.round(((st?.won ?? 0) / played) * 100) : 0;
                    return (
                      <button
                        key={b.key}
                        onClick={() => {
                          setBotKey(b.key);
                          sfx.click();
                        }}
                        className={`rounded-xl border p-2 text-center transition-all ${
                          on ? "border-transparent bg-white/[0.07]" : "border-white/8 bg-white/[0.02] hover:border-white/20"
                        }`}
                        style={on ? { borderColor: b.color, boxShadow: `0 0 18px -6px ${b.color}` } : undefined}
                      >
                        <span className="mx-auto w-fit">
                          <BotAvatar bot={b} size={on ? 42 : 36} />
                        </span>
                        <div className="mt-1 truncate text-[11px] font-black text-white">{b.name}</div>
                        <div className="mt-0.5 line-clamp-1 text-[9px] text-white/35">{b.tagline}</div>
                        <div className="mt-1.5">
                          <div className="text-[10px] font-black tabular-nums" style={{ color: b.color }}>
                            WR {wr}%
                          </div>
                          <div className="odds-bar mt-1">
                            <div style={{ width: `${wr}%`, background: b.color }} />
                          </div>
                          <div className="mt-1 text-[8px] font-semibold text-white/25">
                            {st?.won ?? 0}W / {played} bitew
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-center text-[9px] leading-snug text-white/25">
                  Boty losują uczciwie (te same szanse co ty). Win rate liczony z prawdziwych wyników na tym serwerze.
                </p>
              </>
            )}
          </div>

          <button onClick={() => void create()} disabled={creating || !canAfford} className="btn-gold mt-5 w-full">
            <Swords size={16} />
            {creating
              ? "Tworzenie…"
              : selected.length === 0
                ? "Wybierz skrzynki"
                : `Stwórz bitwę · ${selected.length} ${selected.length === 1 ? "runda" : "rundy"} · ${formatPLN(cost)}`}
          </button>
          {selected.length > 0 && !canAfford && (
            <p className="mt-2 text-center text-[11px] font-semibold text-red-400">Za mało środków na wpisowe</p>
          )}
        </div>

        {/* Listy */}
        <div className="space-y-5">
          <div className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Otwarte bitwy ({open.length})</h3>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/30">
                <Timer size={11} /> odświeżanie co 4 s
              </span>
            </div>
            {open.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/30">
                Brak otwartych bitew. Stwórz własną i powiedz znajomemu, żeby dołączył z tej listy!
              </p>
            ) : (
              <div className="space-y-2">
                {open.map((b) => {
                  const ids = battleCaseIds(b);
                  const own = b.p1Id === user?.id;
                  return (
                    <div key={b.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                      <CaseStack ids={ids} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-bold text-white">{b.p1Name}</span>
                          <ModeBadge mode={b.mode} />
                          <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-bold text-white/50">
                            {b.rounds} {b.rounds === 1 ? "runda" : "rundy"}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-white/40">
                          {ids.map((t) => caseOf(t).def?.name ?? t).join(" + ")} · wpisowe {formatPLN(b.costCents)}
                        </div>
                      </div>
                      {own ? (
                        <Link href={`/battle/${b.id}`} className="btn-ghost px-3 py-2 text-xs" onClick={() => sfx.click()}>
                          Twoja bitwa
                        </Link>
                      ) : (
                        <button onClick={() => void join(b.id)} disabled={joining === b.id || (user?.balanceCents ?? 0) < b.costCents} className="btn-gold px-3.5 py-2 text-xs">
                          {joining === b.id ? "…" : "Dołącz"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="panel p-4">
            <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.25em] text-white/40">Ostatnie rozstrzygnięcia</h3>
            {finished.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/30">Jeszcze żadna bitwa się nie skończyła.</p>
            ) : (
              <div className="space-y-2">
                {finished.map((b) => {
                  const tie = !b.winnerName;
                  return (
                    <Link
                      key={b.id}
                      href={`/battle/${b.id}`}
                      onClick={() => sfx.click()}
                      className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] p-3 transition-colors hover:border-white/15"
                    >
                      <CaseStack ids={battleCaseIds(b)} size="h-9 w-9" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs font-bold">
                          <span className={b.winnerId === b.p1Id && !tie ? "text-gold" : "text-white/70"}>{b.p1Name}</span>
                          <span className="text-white/25">vs</span>
                          <span className={b.winnerId && b.winnerId !== b.p1Id ? "text-gold" : "text-white/70"}>{b.p2Name ?? "?"}</span>
                          <ModeBadge mode={b.mode} />
                        </div>
                        <div className="mt-0.5 text-[10px] text-white/35">
                          {b.rounds}r · pula {formatPLN(pot(b))}
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-right text-[10px] font-bold text-white/40">
                        {b.mode === "shared" ? (
                          <span className="text-emerald-400">PODZIAŁ 50/50</span>
                        ) : tie ? (
                          "REMIS"
                        ) : (
                          <>
                            <Crown size={11} className="text-gold" /> {b.winnerName}
                          </>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
