"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { DbUser, DbInventoryItem } from "@/db/schema";
import { FxProvider } from "./fx";
import { TopBar, MobileNav } from "./topbar";
import StartScreen from "./start";
import Ticker from "./ticker";
import { sfx } from "@/lib/sound";
import { formatPLN } from "@/lib/data";
import { CheckCircle2, Skull, TriangleAlert, Trophy } from "lucide-react";

interface Toast {
  id: number;
  text: string;
  kind: "ok" | "err" | "win";
}

interface AppCtx {
  user: DbUser | null;
  inventory: DbInventoryItem[];
  loading: boolean;
  login: (name: string, password: string) => Promise<string | null>;
  logout: () => void;
  refresh: () => Promise<void>;
  setBalance: (c: number) => void;
  setInventory: (inv: DbInventoryItem[]) => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
  toasts: Toast[];
  broke: boolean;
}

const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp poza providerem");
  return c;
};

const KEY = "kavper_uid";

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(null);
  const [inventory, setInventory] = useState<DbInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((text: string, kind: Toast["kind"] = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const apply = useCallback((u: DbUser, inv: DbInventoryItem[]) => {
    setUser(u);
    setInventory(inv);
  }, []);

  const refresh = useCallback(async () => {
    const id = localStorage.getItem(KEY);
    if (!id) return;
    try {
      const res = await fetch(`/api/user?id=${id}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) localStorage.removeItem(KEY);
        return;
      }
      const data = await res.json();
      apply(data.user, data.inventory);
    } catch {
      /* offline */
    }
  }, [apply]);

  useEffect(() => {
    (async () => {
      const id = localStorage.getItem(KEY);
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/user?id=${id}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          apply(data.user, data.inventory);
        } else {
          localStorage.removeItem(KEY);
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [apply]);

  const login = useCallback(
    async (name: string, password: string) => {
      try {
        const res = await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, password }),
        });
        const data = await res.json();
        if (!res.ok) return data.error ?? "Błąd logowania";
        localStorage.setItem(KEY, data.user.id);
        apply(data.user, data.inventory);
        sfx.coin();
        return null;
      } catch {
        return "Brak połączenia z serwerem";
      }
    },
    [apply]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setUser(null);
    setInventory([]);
  }, []);

  const setBalance = useCallback((c: number) => {
    setUser((u) => (u ? { ...u, balanceCents: c } : u));
  }, []);

  const broke = !!user && user.balanceCents < 1500 && inventory.length === 0;

  const value: AppCtx = {
    user,
    inventory,
    loading,
    login,
    logout,
    refresh,
    setBalance,
    setInventory,
    toast,
    toasts,
    broke,
  };

  return (
    <Ctx.Provider value={value}>
      <FxProvider>{children}</FxProvider>
    </Ctx.Provider>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, toasts, broke } = useApp();
  const [brokeDismissed, setBrokeDismissed] = useState(false);

  // gdy gracz znów ma kasę — modal może pojawić się ponownie przy kolejnym bankructwie
  useEffect(() => {
    if (!broke) setBrokeDismissed(false);
  }, [broke]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-gold" />
          <div className="font-display text-xs tracking-[0.3em] text-white/40">ŁADOWANIE…</div>
        </div>
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-dvh">
      {!user ? (
        <StartScreen />
      ) : (
        <>
          <TopBar />
          <Ticker />
          <main className="mx-auto w-full max-w-7xl px-3 pb-28 pt-5 sm:px-6 md:pb-16">{children}</main>
          <MobileNav />
          {broke && !brokeDismissed && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
              <div className="pop-in w-full max-w-sm rounded-2xl border border-red-500/40 bg-panel p-8 text-center shadow-[0_20px_80px_-20px_rgba(235,75,75,.4)]">
                <Skull className="mx-auto h-12 w-12 text-red-500" />
                <h2 className="font-display mt-4 text-2xl font-black tracking-wide text-white">SPŁUKANY!</h2>
                <p className="mt-2 text-sm text-white/50">
                  Saldo spadło poniżej 15 zł, a ekwipunek jest pusty. Żadnych darmowych pieniędzy — ale masz{" "}
                  <b className="text-green-400">darmową Skrzynkę Ratunkową</b> co 3 minuty. Odrób się dropami!
                </p>
                <a
                  href="/case/ratunkowa"
                  onClick={() => setBrokeDismissed(true)}
                  className="btn-gold mt-6 w-full"
                >
                  Otwórz Skrzynkę Ratunkową
                </a>
                <button onClick={() => setBrokeDismissed(true)} className="btn-ghost mt-2.5 w-full text-sm">
                  Zamknij
                </button>
              </div>
            </div>
          )}
        </>
      )}
      <div className="pointer-events-none fixed right-3 top-16 z-[130] flex w-[calc(100%-1.5rem)] max-w-xs flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium shadow-xl backdrop-blur-md ${
              t.kind === "win"
                ? "border-gold/40 bg-[#0f2a5c]/95 text-gold"
                : t.kind === "err"
                  ? "border-red-500/40 bg-[#2a0e12]/90 text-red-300"
                  : "border-white/10 bg-panel2/95 text-white/85"
            }`}
          >
            {t.kind === "win" ? (
              <Trophy size={16} className="shrink-0" />
            ) : t.kind === "err" ? (
              <TriangleAlert size={16} className="shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
