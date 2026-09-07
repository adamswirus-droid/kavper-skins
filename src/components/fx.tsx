"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { getSettings } from "@/lib/settings";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  life: number;
  maxLife: number;
  shape: number;
}

interface FxCtx {
  burst: (x: number, y: number, colors: string[], count?: number, power?: number) => void;
  shake: (strength?: number) => void;
  celebrate: (x: number, y: number, colors: string[], big?: boolean) => void;
}

const Ctx = createContext<FxCtx>({ burst: () => {}, shake: () => {}, celebrate: () => {} });
export const useFx = () => useContext(Ctx);

export function FxProvider({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const dpr = Math.min(window.matchMedia("(max-width: 768px)").matches ? 1.5 : 2, window.devicePixelRatio || 1);
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      g.clearRect(0, 0, canvas.width, canvas.height);
      const ps = particles.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life -= dt;
        if (p.life <= 0) {
          ps.splice(i, 1);
          continue;
        }
        p.vy += 1600 * dt;
        p.vx *= 0.985;
        p.vy *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const a = Math.min(1, (p.life / p.maxLife) * 2);
        g.save();
        g.translate(p.x * dpr, p.y * dpr);
        g.rotate(p.rot);
        g.globalAlpha = a;
        g.fillStyle = p.color;
        if (p.shape === 0) g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        else {
          g.beginPath();
          g.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
      }
      if (ps.length > 0) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        runningRef.current = false;
        g.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const ensureLoop = useCallback(() => {
    if (!runningRef.current) {
      runningRef.current = true;
      loop();
    }
  }, [loop]);

  const burst = useCallback(
    (x: number, y: number, colors: string[], count = 50, power = 1) => {
      const canvas = canvasRef.current;
      if (!canvas || !getSettings().particles) return;
      // mobile: połowa cząstek
      const mobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
      const n = mobile ? Math.ceil(count * 0.5) : count;
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
        const sp = (300 + Math.random() * 700) * power;
        particles.current.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 14,
          w: 4 + Math.random() * 7,
          h: 3 + Math.random() * 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 0.9 + Math.random() * 0.9,
          maxLife: 1.4,
          shape: Math.random() < 0.7 ? 0 : 1,
        });
      }
      const cap = window.matchMedia("(max-width: 768px)").matches ? 350 : 900;
      if (particles.current.length > cap) particles.current.splice(0, particles.current.length - cap);
      ensureLoop();
    },
    [ensureLoop]
  );

  const shake = useCallback((strength = 1) => {
    const el = document.getElementById("app-root");
    if (!el || !getSettings().shake) return;
    el.style.setProperty("--shake", String(8 * strength));
    el.classList.remove("screen-shake");
    // restart animacji
    void el.offsetWidth;
    el.classList.add("screen-shake");
    window.setTimeout(() => el.classList.remove("screen-shake"), 500);
  }, []);

  const celebrate = useCallback(
    (x: number, y: number, colors: string[], big = false) => {
      burst(x, y, colors, big ? 120 : 55, big ? 1.5 : 1);
      shake(big ? 1.2 : 0.4);
    },
    [burst, shake]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.matchMedia("(max-width: 768px)").matches ? 1.5 : 2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <Ctx.Provider value={{ burst, shake, celebrate }}>
      {children}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[120] h-full w-full"
        aria-hidden
      />
    </Ctx.Provider>
  );
}
