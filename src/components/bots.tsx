"use client";

import { BOTS, type BotProfile } from "@/lib/data";
import { Cannabis, Cloud, Footprints, Rat, Trophy, Zap, type LucideIcon } from "lucide-react";

const ICONS: Record<BotProfile["icon"], LucideIcon> = {
  rat: Rat,
  boot: Footprints,
  leaf: Cannabis,
  smoke: Cloud,
  zap: Zap,
  trophy: Trophy,
};

export function BotAvatar({ bot, size = 44 }: { bot: BotProfile; size?: number }) {
  const Icon = ICONS[bot.icon];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: bot.color,
        background: `radial-gradient(circle at 30% 25%, ${bot.color}55, ${bot.color}18)`,
        color: bot.color,
      }}
      title={bot.name}
    >
      <Icon size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}

export function getBotByKey(key?: string | null): BotProfile {
  return BOTS.find((b) => b.key === key) ?? BOTS[2];
}
