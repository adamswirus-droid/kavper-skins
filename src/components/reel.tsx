"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { SkinCard } from "./skin";
import { sfx } from "@/lib/sound";
import { animMs } from "@/lib/settings";
import { RARITY_META, type Rarity } from "@/lib/data";

export interface ReelItemData {
  slotKey: string;
  weapon: string;
  name: string;
  rarity: string;
  priceCents: number;
}

export interface SpinHandle {
  spin: (winIndex: number, durationMs: number) => Promise<void>;
  skip: () => void;
  setPaused: (p: boolean) => void;
}

interface Props {
  items: ReelItemData[];
  itemW?: number;
  cardSize?: "xs" | "sm" | "md" | "lg";
  pointer?: boolean;
  highlightWin?: number | null;
  onTick?: () => void;
  onFinish?: () => void;
}

interface SpinState {
  raf: number;
  resolve: (() => void) | null;
  paused: boolean;
  elapsed: number;
  duration: number;
  target: number;
  lastTick: number;
  lastX: number;
  lastT: number;
}

const SETTLE_MS = 320;

export const SpinReel = forwardRef<SpinHandle, Props>(function SpinReel(
  { items, itemW = 158, cardSize = "md", pointer = true, highlightWin = null, onTick, onFinish },
  ref
) {
  const trackRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const s = useRef<SpinState>({
    raf: 0,
    resolve: null,
    paused: false,
    elapsed: 0,
    duration: 1,
    target: 0,
    lastTick: -1,
    lastX: 0,
    lastT: 0,
  });

  const applyX = useCallback((x: number) => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-x}px,0,0)`;
    }
  }, []);

  const cheapRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px), (pointer: coarse)");
    const apply = () => {
      cheapRef.current = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const applyBlur = useCallback((px: number) => {
    if (!trackRef.current) return;
    if (cheapRef.current) {
      // mobile: bez filtra (drogi), lekkie ściemnienie zamiast bluru
      trackRef.current.style.opacity = px > 2 ? "0.85" : "1";
      return;
    }
    trackRef.current.style.filter = px > 0.4 ? `blur(${Math.min(px, 3.5).toFixed(2)}px) saturate(1.3)` : "";
  }, []);

  const spin = useCallback(
    (winIndex: number, durationMs: number) =>
      new Promise<void>((resolve) => {
        const st = s.current;
        cancelAnimationFrame(st.raf);
        const vw = viewportRef.current?.clientWidth ?? 600;
        const jitter = (Math.random() - 0.5) * itemW * 0.55;
        const target = Math.max(0, winIndex * itemW + itemW / 2 - vw / 2 + jitter);
        st.target = target;
        st.duration = Math.max(300, animMs(durationMs));
        st.elapsed = 0;
        sfx.spinStart();
        st.paused = false;
        st.lastTick = -1;
        st.lastX = 0;
        st.lastT = performance.now();
        st.resolve = resolve;
        applyX(0);
        applyBlur(0);

        let last = performance.now();
        let settleStart = -1;

        const step = (now: number) => {
          const dt = Math.min(64, now - last);
          last = now;
          if (!st.paused) st.elapsed += dt;
          const t = Math.min(1, st.elapsed / st.duration);

          if (t < 1) {
            const e = 1 - Math.pow(1 - t, 4.2);
            const x = st.target * e;
            applyX(x);
            // motion blur proporcjonalny do prędkości
            const vx = Math.abs(x - st.lastX) / Math.max(1, now - st.lastT);
            applyBlur(Math.min(5.5, vx * 5));
            st.lastX = x;
            st.lastT = now;
            const tickIdx = Math.floor((x + vw / 2) / itemW);
            if (tickIdx !== st.lastTick) {
              st.lastTick = tickIdx;
              if (t < 0.985) {
                sfx.tick();
                onTick?.();
              }
            }
          } else {
            // amortyzowane lądowanie (lekki overshoot + wygaszenie)
            applyBlur(0);
            if (settleStart < 0) {
              settleStart = now;
              const w = items[winIndex];
              sfx.land(w ? (RARITY_META[w.rarity as Rarity]?.order ?? 0) : 0);
            }
            const st2 = Math.min(1, (now - settleStart) / SETTLE_MS);
            const overshoot = Math.sin(st2 * Math.PI * 2.2) * (1 - st2) * 7;
            applyX(Math.max(0, st.target + overshoot));
            if (st2 >= 1) {
              applyX(st.target);
              const r = st.resolve;
              st.resolve = null;
              onFinish?.();
              r?.();
              return;
            }
          }
          st.raf = requestAnimationFrame(step);
        };
        st.raf = requestAnimationFrame(step);
      }),
    [applyX, applyBlur, itemW, onTick, onFinish, items]
  );

  const skip = useCallback(() => {
    s.current.elapsed = s.current.duration;
  }, []);

  const setPaused = useCallback((p: boolean) => {
    s.current.paused = p;
  }, []);

  useImperativeHandle(ref, () => ({ spin, skip, setPaused }), [spin, skip, setPaused]);

  useEffect(() => {
    const st = s.current;
    return () => {
      cancelAnimationFrame(st.raf);
      st.resolve?.();
      st.resolve = null;
    };
  }, []);

  return (
    <div ref={viewportRef} className="relative w-full overflow-hidden">
      <div className="reel-fade-l" />
      <div className="reel-fade-r" />
      {pointer && <div className="reel-pointer" />}
      <div
        ref={trackRef}
        className="flex w-max items-stretch will-change-transform"
        style={{ transform: "translate3d(0,0,0)", backfaceVisibility: "hidden", contain: "layout paint" }}
      >
        {items.map((it, i) => (
          <div key={it.slotKey} style={{ width: itemW }} className="flex shrink-0 justify-center py-1">
            <SkinCard
              weapon={it.weapon}
              name={it.name}
              rarity={it.rarity}
              priceCents={it.priceCents}
              size={cardSize}
              dim={highlightWin !== null && i !== highlightWin}
              selected={highlightWin !== null && i === highlightWin}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
