"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "./app";
import { formatPLN } from "@/lib/data";
import { sfx } from "@/lib/sound";
import SettingsPanel, { useSettings } from "./settings";
import { setSettings } from "@/lib/settings";
import {
  Backpack,
  CircleUserRound,
  LayoutGrid,
  LogOut,
  Package,
  Settings as SettingsIcon,
  ShoppingBag,
  Sword,
  TrendingUp,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Lobby", icon: LayoutGrid },
  { href: "/inventory", label: "Ekwipunek", icon: Backpack },
  { href: "/battles", label: "Bitwy", icon: Sword },
  { href: "/upgrader", label: "Upgrader", icon: TrendingUp },
  { href: "/shop", label: "Sklep", icon: ShoppingBag },
  { href: "/leaderboard", label: "Ranking", icon: Trophy },
  { href: "/profile", label: "Profil", icon: CircleUserRound },
];

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5" onClick={() => sfx.click()}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#6fb1ff] to-[#2563eb] text-[#ffffff] shadow-[0_4px_20px_-4px_rgba(37,99,235,.5)] transition-transform duration-300 group-hover:rotate-6">
        <Package size={19} strokeWidth={2.4} />
      </span>
      <span className="font-display text-[15px] font-black leading-none tracking-wide text-white">
        KAVPER<span className="text-gold">SKINS</span>
      </span>
    </Link>
  );
}

export function TopBar() {
  const { user, logout } = useApp();
  const path = usePathname();
  const settings = useSettings();
  const [open, setOpen] = useState(false);
  const muted = settings.muted;
  const toggleMute = () => setSettings({ muted: !settings.muted });
  if (!user) return null;
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-3 sm:px-6">
        <Logo />
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => sfx.click()}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  active ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <div className="flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_2px_rgba(37,99,235,.5)]" />
            <span className="text-sm font-bold tabular-nums text-gold">{formatPLN(user.balanceCents)}</span>
          </div>
          <button
            onClick={() => {
              toggleMute();
              sfx.click();
            }}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white"
            aria-label={muted ? "Włącz dźwięk" : "Wycisz"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={() => {
              setOpen(true);
              sfx.click();
            }}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white"
            aria-label="Ustawienia"
          >
            <SettingsIcon size={16} />
          </button>
          {open && <SettingsPanel onClose={() => setOpen(false)} />}
          <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-1.5 pl-3 pr-1.5 sm:flex">
            <span className="max-w-24 truncate text-[13px] font-semibold text-white/80">{user.name}</span>
            <button
              onClick={() => {
                sfx.click();
                logout();
              }}
              className="grid h-6 w-6 place-items-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Wyloguj"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const { user } = useApp();
  const path = usePathname();
  if (!user) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-7">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[9px] font-semibold transition-colors ${
                active ? "text-gold" : "text-white/40"
              }`}
            >
              <Icon size={18} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
