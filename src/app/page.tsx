"use client";

import Link from "next/link";
import { CASES, BOOST_MAP, formatPLN, toCents } from "@/lib/data";
import { sfx } from "@/lib/sound";
import { Flame, Gift, Lock, MousePointerClick, Package, Sparkles, Sword, TrendingUp, Trophy } from "lucide-react";
import { useApp } from "@/components/app";
import DailyChest from "@/components/daily";


export default function Lobby() {
  const { user } = useApp();
  const featured = CASES.find((c) => c.id === "kavper") ?? CASES[0];
  return (
    <div className="fade-root">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-panel">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/4 h-72 w-72 rounded-full bg-[#3b82f6]/25 blur-[90px]" />
          <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-[#6366f1]/20 blur-[90px]" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "linear-gradient(rgba(238,244,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(238,244,255,.4) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>
        <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.25em] text-gold">
              <Sparkles size={12} /> Case opening · Bitwy · Upgrader
            </div>
            <h1 className="font-display mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              OTWIERAJ.
              <br />
              <span className="bg-gradient-to-r from-[#8ec0ff] via-[#dbeafe] to-[#5aa2ff] bg-clip-text text-transparent">WALCZ.</span> ULEPSZAJ.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base">
              {CASES.length} skrzynek od <b className="text-white/85">4 zł</b> do <b className="text-white/85">800 zł</b> +{" "}
              <b className="text-green-400">darmowa ratunkowa</b> gdy spłukasz się do zera. Bitwy ze znajomymi w trybach{" "}
              <b className="text-gold">Standard</b> i <b className="text-gold">Joker</b>, multi-open ×5 i upgrader.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#skrzynki" onClick={() => sfx.click()} className="btn-gold">
                <Package size={17} /> Otwieraj skrzynki
              </a>
              <Link href="/battles" onClick={() => sfx.click()} className="btn-ghost">
                <Sword size={16} /> Bitwy ze znajomymi
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold text-white/35">
              <span className="flex items-center gap-1.5"><MousePointerClick size={13} className="text-gold/70" /> Spacja = otwórz · F = fast spin</span>
              <span className="flex items-center gap-1.5"><Flame size={13} className="text-gold/70" /> Szanse dropu podane przy każdej skrzynce</span>
            </div>
          </div>
          <Link href={`/case/${featured.id}`} className="group relative mx-auto block w-full max-w-sm">
            <div className="absolute inset-0 scale-90 rounded-full bg-[#3b82f6]/25 blur-[70px] transition-all duration-500 group-hover:scale-110 group-hover:bg-[#3b82f6]/40" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featured.image}
              alt={featured.name}
              className="float-slow relative w-full rounded-2xl border border-gold/20 shadow-2xl transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-gold/30 bg-black/70 px-4 py-1.5 text-xs font-bold text-gold backdrop-blur-md">
              {featured.name} · {formatPLN(toCents(featured.price))}
            </div>
          </Link>
        </div>
      </section>

      <div className="mt-4">
        <DailyChest />
      </div>

      {/* FEATURES */}
      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          {
            href: "/battles",
            icon: Sword,
            title: "Bitwy na skiny",
            desc: "Standard: lepszy drop zgarnia wszystko. Joker: wygrywa najsłabszy drop!",
            color: "#eb4b4b",
          },
          {
            href: "/upgrader",
            icon: TrendingUp,
            title: "Upgrader",
            desc: "Sam wpisujesz szansę (5–90%), a system dobiera najlepszy cel do zdobycia.",
            color: "#2563eb",
          },
          {
            href: "/leaderboard",
            icon: Trophy,
            title: "Ranking",
            desc: "Najbogatsi gracze i największe wygrane na serwerze.",
            color: "#4b69ff",
          },
        ].map((f) => (
          <Link
            key={f.href}
            href={f.href}
            onClick={() => sfx.click()}
            className="panel group flex items-start gap-4 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-white/20"
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110"
              style={{ background: `${f.color}1e`, color: f.color }}
            >
              <f.icon size={20} />
            </span>
            <span>
              <span className="font-display block text-[13px] font-bold tracking-wide text-white">{f.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-white/45">{f.desc}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* CASES GRID */}
      <section id="skrzynki" className="mt-10 scroll-mt-20">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-black tracking-wide text-white sm:text-2xl">SKRZYNKI</h2>
            <p className="mt-1 text-xs text-white/40">Kliknij, zobacz szanse dropu i odpal spin — normalny albo fast.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/50">
            {CASES.length} skrzynek
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
          {CASES.map((c) => (
            <Link
              key={c.id}
              href={`/case/${c.id}`}
              onClick={() => sfx.click()}
              className="case-tile group"
              style={{ "--accent": `${c.accent}88`, "--accent-glow": `${c.accent}55` } as React.CSSProperties}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  style={c.hue ? { filter: `hue-rotate(${c.hue}deg) saturate(1.15)` } : undefined}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#101f3d] via-transparent to-transparent" />
                {c.free ? (
                  user && user.balanceCents < 1500 ? (
                    <span className="absolute left-2.5 top-2.5 flex animate-pulse items-center gap-1 rounded-lg bg-green-500 px-2 py-1 text-[10px] font-black text-[#ffffff]">
                      <Gift size={11} /> DARMOWA · TERAZ
                    </span>
                  ) : (
                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-black text-white/60 backdrop-blur-sm">
                      <Lock size={10} /> DARMOWA · &lt;15 zł
                    </span>
                  )
                ) : (
                  <div
                    className="absolute left-2.5 top-2.5 rounded-lg px-2 py-1 text-[11px] font-black tabular-nums backdrop-blur-sm"
                    style={{ background: "rgba(5,10,26,.65)", color: c.accent }}
                  >
                    {formatPLN(toCents(c.price))}
                  </div>
                )}
              </div>
              <div className="p-3.5">
                <div className="font-display text-[13px] font-bold tracking-wide text-white">{c.name}</div>
                <div className="mt-0.5 line-clamp-1 text-[11px] text-white/40">{c.tagline}</div>
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-white/30">
                    {c.items.length} skinów
                    {BOOST_MAP.get(c.id) && (
                      <span className="ml-1.5 text-amber-300/80">· ⚡ {formatPLN(toCents(BOOST_MAP.get(c.id)!.price))}</span>
                    )}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.accent }}>
                    Otwórz →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-12 border-t border-white/8 py-6 text-center text-[11px] leading-relaxed text-white/30">
        KavperSkins — projekt demo dla znajomych. Waluta w grze jest wirtualna i nie ma wartości pieniężnej.
        <br />
        Skin przedmioty są fikcyjne, inspirowane klimatem openingów.
      </footer>
    </div>
  );
}
