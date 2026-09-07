"use client";

import { useState } from "react";
import { useApp } from "./app";
import { CASES, RARITY_META } from "@/lib/data";
import { WeaponArt } from "./skin";
import { Play, Package, Eye, EyeOff, Lock } from "lucide-react";
import { sfx } from "@/lib/sound";

const FLOAT_SKINS = [
  { weapon: "★ Karambit", rarity: "knife" },
  { weapon: "AK-47", rarity: "covert" },
  { weapon: "AWP", rarity: "classified" },
  { weapon: "Desert Eagle", rarity: "classified" },
  { weapon: "★ Butterfly Knife", rarity: "knife" },
  { weapon: "M4A4", rarity: "restricted" },
  { weapon: "USP-S", rarity: "milspec" },
  { weapon: "★ M9 Bayonet", rarity: "knife" },
] as const;

export default function StartScreen() {
  const { login } = useApp();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    sfx.click();
    const e = await login(name.trim(), password);
    if (e) {
      setErr(e);
      sfx.lose();
    }
    setBusy(false);
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4">
      {/* tło */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[#3b82f6]/25 blur-[120px]" />
        <div className="absolute bottom-[-30%] left-[-10%] h-[50vh] w-[50vw] rounded-full bg-[#4b69ff]/10 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[50vh] w-[50vw] rounded-full bg-[#d32ee6]/10 blur-[100px]" />
        {FLOAT_SKINS.map((s, i) => {
          const meta = RARITY_META[s.rarity as keyof typeof RARITY_META];
          return (
            <div
              key={i}
              className="float-slow absolute opacity-[0.16]"
              style={{
                left: `${(i * 17 + 6) % 92}%`,
                top: `${(i * 29 + 8) % 85}%`,
                color: meta.color,
                animationDelay: `${i * 0.9}s`,
              }}
            >
              <WeaponArt weapon={s.weapon} className="h-14 w-24 md:h-20 md:w-36" />
            </div>
          );
        })}
      </div>

      <div className="pop-in relative flex w-full max-w-md flex-col items-center text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#6fb1ff] to-[#2563eb] text-[#ffffff] shadow-[0_10px_40px_-8px_rgba(37,99,235,.55)]">
          <Package size={32} strokeWidth={2.2} />
        </span>
        <h1 className="font-display mt-6 text-4xl font-black tracking-tight text-white sm:text-5xl">
          KAVPER<span className="bg-gradient-to-r from-[#8ec0ff] to-[#dbeafe] bg-clip-text text-transparent">SKINS</span>
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">
          Otwieraj skrzynki, stawiaj bitwy ze znajomymi i ulepszaj dropy.{" "}
          <span className="text-gold/90">Start: 250 zł</span> wirtualnej kasy.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {CASES.slice(0, 6).map((c) => (
            <span
              key={c.id}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/50"
            >
              {c.name}
            </span>
          ))}
        </div>

        <div className="mt-8 w-full rounded-2xl border border-white/10 bg-panel/85 p-5 shadow-2xl backdrop-blur-md">
          <label className="block text-left text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            Twój nick
          </label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr(null);
            }}
            maxLength={18}
            placeholder="np. KavperPL"
            autoFocus
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg font-semibold text-white outline-none transition-colors placeholder:text-white/25 focus:border-gold/60"
          />

          <label className="mt-4 block text-left text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            Hasło
          </label>
          <div className="relative mt-2">
            <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErr(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && void go()}
              type={showPw ? "text" : "password"}
              placeholder="min. 4 znaki"
              className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-10 pr-11 text-base font-semibold text-white outline-none transition-colors placeholder:text-white/25 focus:border-gold/60"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-white/40 transition-colors hover:text-white"
              aria-label={showPw ? "Ukryj hasło" : "Pokaż hasło"}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="mt-2 text-left text-[10px] leading-snug text-white/30">
            Nowy nick = zakładasz konto i ustawiasz hasło. Masz już konto? Wpisz ten sam nick i swoje hasło.
          </p>

          {err && <p className="mt-2 text-left text-xs font-semibold text-red-400">{err}</p>}
          <button onClick={() => void go()} disabled={busy || name.trim().length < 2 || password.length < 4} className="btn-gold mt-4 w-full text-base">
            <Play size={18} className="mr-1 inline" />
            {busy ? "Wchodzenie…" : "Graj za darmo"}
          </button>
          <p className="mt-3 text-[11px] text-white/30">
            Gra demonstracyjna ze znajomymi — waluta jest wirtualna, bez prawdziwych pieniędzy.
          </p>
        </div>
      </div>
    </div>
  );
}
