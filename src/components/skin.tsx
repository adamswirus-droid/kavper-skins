"use client";

import { RARITY_META, Rarity, formatPLN } from "@/lib/data";

export type WeaponKind = "rifle" | "sniper" | "pistol" | "smg" | "shotgun" | "knife";

export function weaponKind(weapon: string): WeaponKind {
  if (weapon.startsWith("★")) return "knife";
  if (/^(AWP|SSG|G3SG1|SCAR)/.test(weapon)) return "sniper";
  if (/^(AK|M4|FAMAS|Galil|AUG)/.test(weapon)) return "rifle";
  if (/^(MP|P90|UMP|MAC|PP)/.test(weapon)) return "smg";
  if (/^(Nova|MAG|XM|Sawed)/.test(weapon)) return "shotgun";
  return "pistol";
}

// Pozycja komórki w spritesheet /skins/sprite.jpg (1728x1152, siatka 2x3)
const SPRITE_CELL: Record<WeaponKind, [number, number]> = {
  rifle: [0, 0],
  sniper: [1, 0],
  pistol: [0, 1],
  smg: [1, 1],
  shotgun: [0, 2],
  knife: [1, 2],
};

function WeaponSilhouette({ kind, className = "" }: { kind: WeaponKind; className?: string }) {
  return (
    <svg viewBox="0 0 120 64" className={className} aria-hidden fill="currentColor">
      {kind === "pistol" && (
        <g>
          <rect x="30" y="12" width="58" height="13" rx="3.5" />
          <rect x="86" y="15" width="9" height="7" rx="2" opacity="0.85" />
          <path d="M44 25 h22 l-7 27 h-15 z" opacity="0.92" />
          <path d="M66 27 c8 0 12 4 12 9 c0 4 -3 6 -7 6 l-1 -4 c2 0 3 -1 3 -2 c0 -3 -3 -5 -7 -5 z" opacity="0.75" />
        </g>
      )}
      {kind === "rifle" && (
        <g>
          <path d="M22 20 H8 l-5 18 h19 z" opacity="0.9" />
          <rect x="22" y="20" width="64" height="13" rx="3" />
          <rect x="84" y="23" width="30" height="4.5" rx="2" />
          <path d="M48 33 h11 l-4 15 h-9 z" opacity="0.92" />
          <rect x="40" y="14" width="14" height="6" rx="2" opacity="0.7" />
        </g>
      )}
      {kind === "sniper" && (
        <g>
          <path d="M20 22 H6 l-4 16 h18 z" opacity="0.9" />
          <rect x="20" y="22" width="66" height="11" rx="3" />
          <rect x="86" y="25" width="32" height="3.5" rx="1.6" />
          <rect x="36" y="11" width="28" height="8" rx="4" />
          <path d="M46 33 h10 l-3 13 h-8 z" opacity="0.92" />
        </g>
      )}
      {kind === "smg" && (
        <g>
          <rect x="28" y="20" width="52" height="14" rx="4" />
          <rect x="78" y="23" width="16" height="5" rx="2" opacity="0.9" />
          <rect x="50" y="34" width="9" height="21" rx="2.5" opacity="0.92" />
          <path d="M28 22 h-12 l-3 10 h15 z" opacity="0.7" />
        </g>
      )}
      {kind === "shotgun" && (
        <g>
          <path d="M24 18 H8 l-5 18 h21 z" opacity="0.9" />
          <rect x="24" y="18" width="72" height="9" rx="3" />
          <rect x="50" y="27" width="26" height="8" rx="3.5" opacity="0.9" />
        </g>
      )}
      {kind === "knife" && (
        <g>
          <path d="M30 34 C48 20 78 13 108 18 C92 28 62 38 40 42 Z" />
          <rect x="12" y="34" width="24" height="11" rx="5" transform="rotate(-8 12 34)" opacity="0.95" />
        </g>
      )}
    </svg>
  );
}

// Deterministyczny "paint job" ze stringa: każdy skin ma unikalny odcień/wzór
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface PaintJob {
  hue: number;
  hue2: number;
  sat: number;
  pattern: number; // 0..4
  angle: number;
}

export function paintJobFor(weapon: string, name?: string): PaintJob {
  const h = hashStr(`${weapon}|${name ?? ""}`);
  return {
    hue: h % 360,
    hue2: (h >>> 9) % 360,
    sat: 0.9 + ((h >>> 5) % 60) / 100,
    pattern: (h >>> 17) % 5,
    angle: (h >>> 21) % 180,
  };
}

// Render broni ze sprite'a; czarne tło znika dzięki mix-blend-screen.
// Kolor sprite'a jest przekręcany per skin (hue-rotate), a na wierzch nakładany
// jest wzór (paski/kropki/skos) w drugim kolorze — każdy skin wygląda inaczej.
export function WeaponArt({ weapon, name, className = "" }: { weapon: string; name?: string; className?: string }) {
  const kind = weaponKind(weapon);
  const [col, row] = SPRITE_CELL[kind];
  const pj = paintJobFor(weapon, name);
  const c1 = `hsl(${pj.hue2} 95% 62%)`;
  const patternBg =
    pj.pattern === 0
      ? `repeating-linear-gradient(${pj.angle}deg, ${c1} 0 6px, transparent 6px 16px)`
      : pj.pattern === 1
        ? `radial-gradient(circle, ${c1} 0 3px, transparent 3.5px)`
        : pj.pattern === 2
          ? `linear-gradient(${pj.angle}deg, ${c1} 0 45%, transparent 45% 55%, ${c1} 55% 100%)`
          : pj.pattern === 3
            ? `repeating-linear-gradient(${pj.angle + 90}deg, ${c1} 0 2px, transparent 2px 9px)`
            : `conic-gradient(from ${pj.angle}deg, ${c1}, transparent 30%, ${c1} 60%, transparent 90%)`;
  const spriteStyle: React.CSSProperties = {
    aspectRatio: "2.25 / 1",
    backgroundImage: "url(/skins/sprite.jpg)",
    backgroundSize: "200% 300%",
    backgroundPosition: `${col * 100}% ${row * 50}%`,
    backgroundRepeat: "no-repeat",
  };
  return (
    <div className={`relative ${className}`}>
      <WeaponSilhouette kind={kind} className="absolute inset-0 h-full w-full opacity-20" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative h-full max-w-full" style={{ aspectRatio: "2.25 / 1" }}>
          {/* bazowy render z przekręconym odcieniem */}
          <div
            className="absolute inset-0 mix-blend-screen"
            style={{ ...spriteStyle, filter: `hue-rotate(${pj.hue}deg) saturate(${pj.sat})` }}
            role="img"
            aria-label={`${weapon} ${name ?? ""}`.trim()}
          />
          {/* wzór maskowany kształtem broni */}
          <div
            className="absolute inset-0 opacity-70 mix-blend-color-dodge"
            style={{
              backgroundImage: patternBg,
              backgroundSize: pj.pattern === 1 ? "10px 10px" : undefined,
              WebkitMaskImage: "url(/skins/sprite.jpg)",
              maskImage: "url(/skins/sprite.jpg)",
              WebkitMaskSize: "200% 300%",
              maskSize: "200% 300%",
              WebkitMaskPosition: `${col * 100}% ${row * 50}%`,
              maskPosition: `${col * 100}% ${row * 50}%`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              maskMode: "luminance",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function SkinCard({
  weapon,
  name,
  rarity,
  priceCents,
  size = "md",
  selected = false,
  dim = false,
}: {
  weapon: string;
  name: string;
  rarity: Rarity | string;
  priceCents: number;
  size?: "xs" | "sm" | "md" | "lg";
  selected?: boolean;
  dim?: boolean;
}) {
  const meta = RARITY_META[(rarity as Rarity)] ?? RARITY_META.milspec;
  const sizes = {
    xs: "w-[104px]",
    sm: "w-[132px]",
    md: "w-[150px]",
    lg: "w-[190px]",
  }[size];
  const artH = size === "lg" ? "h-24" : size === "md" ? "h-16" : size === "sm" ? "h-14" : "h-12";
  return (
    <div
      className={`skin-card group relative flex ${sizes} shrink-0 flex-col overflow-hidden rounded-xl border transition-transform duration-200 ${dim ? "opacity-45 saturate-50" : ""}`}
      style={
        {
          borderColor: selected ? meta.color : `${meta.color}44`,
          background: `linear-gradient(160deg, ${meta.color}30 0%, rgba(13,22,44,.95) 55%)`,
          boxShadow: selected ? `0 0 0 1.5px ${meta.color}, 0 10px 40px -10px ${meta.glow}` : undefined,
          "--rar": meta.color,
          contain: "layout paint style",
        } as React.CSSProperties
      }
    >
      <div className="h-[3px] w-full" style={{ background: meta.color }} />
      {rarity === "knife" && <div className="shine" />}
      <div className={`relative flex ${artH} items-center justify-center px-2 pt-3`} style={{ color: meta.color }}>
        <div
          className="absolute inset-x-4 top-3 bottom-0 rounded-full opacity-70 sm:blur-2xl"
          style={{ background: `radial-gradient(ellipse at center, ${meta.glow} 0%, transparent 70%)` }}
        />
        <WeaponArt
          weapon={weapon}
          name={name}
          className="relative h-full w-full transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-2.5 pb-2.5 pt-1.5">
        <div className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {weapon}
        </div>
        <div className={`leading-tight font-semibold text-white ${size === "xs" ? "text-[11px]" : "text-xs"}`} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {name}
        </div>
        <div className="mt-auto pt-1">
          <span
            className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-bold tabular-nums ${size === "xs" ? "text-[10px]" : "text-[11px]"}`}
            style={{ background: `${meta.color}22`, color: meta.color }}
          >
            {formatPLN(priceCents)}
          </span>
        </div>
      </div>
    </div>
  );
}
