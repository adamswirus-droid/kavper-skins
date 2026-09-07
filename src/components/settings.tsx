"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, getSettings, setSettings, subscribeSettings, type Settings } from "@/lib/settings";
import { sfx } from "@/lib/sound";
import { Gauge, RotateCcw, Settings as SettingsIcon, Volume2, X } from "lucide-react";

export function useSettings(): Settings {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setS(getSettings());
    return subscribeSettings(setS);
  }, []);
  return s;
}

function Toggle({ on, onChange, label, desc }: { on: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <button
      onClick={() => {
        onChange(!on);
        sfx.click();
      }}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5 text-left transition-colors hover:border-white/15"
    >
      <span>
        <span className="block text-sm font-bold text-white/90">{label}</span>
        {desc && <span className="block text-[11px] text-white/40">{desc}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-gold" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  const speedLabel = s.spinSpeed <= 0.6 ? "Bardzo wolno" : s.spinSpeed < 1 ? "Wolno" : s.spinSpeed === 1 ? "Normalnie" : s.spinSpeed < 1.6 ? "Szybko" : "Turbo";
  return (
    <div className="fixed inset-0 z-[115] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="pop-in w-full max-w-md rounded-2xl border border-white/12 bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-base font-black tracking-wide text-white">
            <SettingsIcon size={17} className="text-gold" /> USTAWIENIA
          </h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white" aria-label="Zamknij">
            <X size={16} />
          </button>
        </div>

        {/* prędkość animacji */}
        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold text-white/90"><Gauge size={15} className="text-gold" /> Prędkość losowania</span>
            <span className="text-xs font-black text-gold">{speedLabel} · {s.spinSpeed.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={s.spinSpeed}
            onChange={(e) => setSettings({ spinSpeed: Number(e.target.value) })}
            className="upg-range mt-3 w-full"
            style={{ "--p": `${((s.spinSpeed - 0.5) / 1.5) * 100}%` } as React.CSSProperties}
          />
          <div className="mt-1 flex justify-between text-[10px] font-semibold text-white/30">
            <span>wolno (dłuższe napięcie)</span>
            <span>turbo</span>
          </div>
        </div>

        {/* głośność */}
        <div className="mt-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-bold text-white/90"><Volume2 size={15} className="text-gold" /> Głośność</span>
            <span className="text-xs font-black text-gold">{s.muted ? "wyciszone" : `${Math.round(s.volume * 100)}%`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.volume}
            onChange={(e) => setSettings({ volume: Number(e.target.value), muted: false })}
            onMouseUp={() => sfx.coin()}
            onTouchEnd={() => sfx.coin()}
            className="upg-range mt-3 w-full"
            style={{ "--p": `${s.volume * 100}%` } as React.CSSProperties}
          />
        </div>

        <div className="mt-2.5 space-y-2">
          <Toggle on={!s.muted} onChange={(v) => setSettings({ muted: !v })} label="Dźwięki" desc="Tykanie ruletki, fanfary, odliczanie" />
          <Toggle on={s.shake} onChange={(v) => setSettings({ shake: v })} label="Screen shake" desc="Trzęsienie ekranu przy rzadkich dropach" />
          <Toggle on={s.particles} onChange={(v) => setSettings({ particles: v })} label="Konfetti / cząsteczki" />
          <Toggle on={s.countdown} onChange={(v) => setSettings({ countdown: v })} label="Odliczanie 3-2-1 przed bitwą" />
          <Toggle on={s.reducedMotion} onChange={(v) => setSettings({ reducedMotion: v })} label="Tryb błyskawiczny" desc="Skraca wszystkie animacje do 0,5 s (na słabsze telefony)" />
        </div>

        <button
          onClick={() => {
            setSettings({ ...DEFAULT_SETTINGS });
            sfx.click();
          }}
          className="btn-ghost mt-4 w-full text-xs"
        >
          <RotateCcw size={13} /> Przywróć domyślne
        </button>
      </div>
    </div>
  );
}
