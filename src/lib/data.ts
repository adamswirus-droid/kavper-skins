// ---------------------------------------------------------------------------
// Kavper Skins — katalog skrzynek, skinów (nazwy z CS2), boty i logika gry
// RTP ~95%: gracze w większości odrabiają cenę skrzynki, top dropy robią hajs
// ---------------------------------------------------------------------------

export type Rarity = "milspec" | "restricted" | "classified" | "covert" | "knife";

export interface SkinDef {
  key: string;
  weapon: string;
  name: string;
  rarity: Rarity;
  price: number; // zł
  chance: number; // waga / procent
}

export interface CaseDef {
  id: string;
  name: string;
  price: number; // zł (0 = darmowa skrzynka ratunkowa)
  tagline: string;
  image: string;
  accent: string;
  hue?: number; // opcjonalny hue-rotate dla obrazka skrzynki (re-use grafik)
  free?: boolean;
  items: SkinDef[];
}

export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; glow: string; order: number }
> = {
  milspec: { label: "Klasy wojskowej", color: "#4b69ff", glow: "rgba(75,105,255,.45)", order: 0 },
  restricted: { label: "Ograniczona", color: "#8847ff", glow: "rgba(136,71,255,.5)", order: 1 },
  classified: { label: "Tajna", color: "#d32ee6", glow: "rgba(211,46,230,.5)", order: 2 },
  covert: { label: "Ukryta", color: "#eb4b4b", glow: "rgba(235,75,75,.55)", order: 3 },
  knife: { label: "★ Niezwykle rzadki", color: "#ffc832", glow: "rgba(255,200,50,.6)", order: 4 },
};

const slug = (w: string, n: string) =>
  `${w}-${n}`
    .toLowerCase()
    .replace(/★/g, "star")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const I = (weapon: string, name: string, rarity: Rarity, price: number, chance: number): SkinDef => ({
  key: slug(weapon, name),
  weapon,
  name,
  rarity,
  price,
  chance,
});

// Skrzynki płatne — bazowe wagi z definicji (5 niebieskich / 3 fioletowe / różowa /
// czerwona / nóż). Faktyczne szanse są wyrównywane w rebalanceCase(): ok. 50%
// otwarć daje profit (drop >= cena skrzynki), reszta zwraca 50–95% ceny.
export const CASES_RAW: CaseDef[] = [
  {
    id: "ratunkowa",
    name: "Skrzynka Ratunkowa",
    price: 0,
    free: true,
    tagline: "Spłukałeś się? Tu zaczynasz odbudowę. Za darmo, co 3 minuty.",
    image: "/cases/ratunkowa.jpg",
    accent: "#3ddc84",
    // Wyważenie: min 40 zł (zawsze starczy na kilka tanich skrzynek lub jedną
    // średnią), średnia ~62 zł, max 500 zł (0,5%). Co 3 min, tylko gdy saldo < 5 zł.
    items: [
      I("MP9", "Storm", "milspec", 40, 14),
      I("P250", "Sand Dune", "milspec", 42, 14),
      I("Nova", "Predator", "milspec", 45, 14),
      I("MAC-10", "Silver", "milspec", 48, 14),
      I("PP-Bizon", "Sand Dashed", "milspec", 52, 14),
      I("FAMAS", "Colony", "restricted", 65, 10),
      I("UMP-45", "Carbon Fiber", "restricted", 80, 10),
      I("M4A4", "Converter", "classified", 120, 7),
      I("AK-47", "Elite Build", "covert", 200, 2.5),
      I("★ Gut Knife", "Safari Mesh", "knife", 500, 0.5),
    ],
  },
  {
    id: "kieszonkowe",
    name: "Kieszonkowe",
    price: 10,
    tagline: "Dyszka w kieszeni? Wystarczy.",
    image: "/cases/kieszonkowe.jpg",
    accent: "#fbbf24",
    items: [
      I("P2000", "Pulse", "milspec", 5.0, 16),
      I("Galil AR", "Tuxedo", "milspec", 5.6, 16),
      I("MAG-7", "Heat", "milspec", 6.2, 16),
      I("UMP-45", "Labyrinth", "milspec", 7.0, 16),
      I("Five-SeveN", "Case Hardened", "milspec", 8.0, 16),
      I("Tec-9", "Red Quartz", "restricted", 13, 5),
      I("P250", "Asiimov", "restricted", 15, 5),
      I("SSG 08", "Blood in the Water", "restricted", 18, 5),
      I("M4A1-S", "Hyper Beast", "classified", 32, 3.2),
      I("AK-47", "Frontside Misty", "covert", 85, 0.64),
      I("★ Navaja Knife", "Slaughter", "knife", 420, 0.16),
    ],
  },
  {
    id: "wieczorna",
    name: "Skrzynka Wieczorna",
    price: 12,
    tagline: "Po robocie, przed snem. Rytuał.",
    image: "/cases/wieczorna.jpg",
    accent: "#a78bfa",
    items: [
      I("Glock-18", "Wasteland Rebel", "milspec", 6.0, 16),
      I("MP7", "Nemesis", "milspec", 6.8, 16),
      I("Nova", "Koi", "milspec", 7.4, 16),
      I("P90", "Trigon", "milspec", 8.5, 16),
      I("MAC-10", "Heat", "milspec", 9.6, 16),
      I("Desert Eagle", "Conspiracy", "restricted", 16, 5),
      I("USP-S", "Guardian", "restricted", 18, 5),
      I("FAMAS", "Valence", "restricted", 21, 5),
      I("AWP", "Phobos", "classified", 38, 3.2),
      I("M4A4", "Dragon King", "covert", 100, 0.64),
      I("★ Gut Knife", "Marble Fade", "knife", 500, 0.16),
    ],
  },
  {
    id: "bani",
    name: "Skrzynka Bani",
    price: 4,
    tagline: "Słodko, żółto i bez bani.",
    image: "/cases/bani.jpg",
    accent: "#ffd93d",
    items: [
      I("Glock-18", "Sand Dune", "milspec", 2.0, 16),
      I("P250", "Metallic DDPAT", "milspec", 2.4, 16),
      I("MP9", "Storm", "milspec", 2.8, 16),
      I("UMP-45", "Plastique", "milspec", 3.0, 16),
      I("MAC-10", "Tatter", "milspec", 3.4, 16),
      I("Five-SeveN", "Monkey Business", "restricted", 5.5, 5),
      I("SSG 08", "Acid Fade", "restricted", 6.2, 5),
      I("Galil AR", "Kami", "restricted", 6.8, 5),
      I("Desert Eagle", "Bronze Deco", "classified", 13, 3.2),
      I("AWP", "Asiimov", "covert", 34, 0.64),
      I("★ Karambit", "Doppler", "knife", 180, 0.16),
    ],
  },
  {
    id: "kaczka",
    name: "Skrzynka Kaczki",
    price: 6,
    tagline: "Kwa kwa! Dziki drop gwarantowany.",
    image: "/cases/kaczka.jpg",
    accent: "#ffb020",
    items: [
      I("Nova", "Predator", "milspec", 3.0, 16),
      I("P2000", "Grassland", "milspec", 3.4, 16),
      I("PP-Bizon", "Sand Dashed", "milspec", 3.8, 16),
      I("MP5-SD", "Dirt Drop", "milspec", 4.5, 16),
      I("MAG-7", "Irradiated Alert", "milspec", 5.0, 16),
      I("USP-S", "Forest Leaves", "restricted", 8.0, 5),
      I("Tec-9", "Bamboo Forest", "restricted", 9.5, 5),
      I("Glock-18", "Catacombs", "restricted", 11, 5),
      I("M4A4", "Griffin", "classified", 19, 3.2),
      I("AK-47", "Aquamarine Revenge", "covert", 51, 0.64),
      I("★ Flip Knife", "Tiger Tooth", "knife", 270, 0.16),
    ],
  },
  {
    id: "startowa",
    name: "Skrzynka Rekruta",
    price: 8,
    tagline: "Bootcamp. Tu każdy zaczynał.",
    image: "/cases/startowa.jpg",
    accent: "#6ee7b7",
    items: [
      I("FAMAS", "Teardown", "milspec", 4.2, 16),
      I("XM1014", "Urban Perforated", "milspec", 4.6, 16),
      I("MP7", "Gunsmoke", "milspec", 5.2, 16),
      I("Glock-18", "Groundwater", "milspec", 5.8, 16),
      I("P250", "Bone Mask", "milspec", 6.6, 16),
      I("Desert Eagle", "Urban Rubble", "restricted", 11, 5),
      I("M4A1-S", "VariCamo", "restricted", 12.5, 5),
      I("USP-S", "Lead Conduit", "restricted", 14.5, 5),
      I("AWP", "Redline", "classified", 26, 3.2),
      I("M4A4", "Asiimov", "covert", 68, 0.64),
      I("★ Gut Knife", "Doppler", "knife", 360, 0.16),
    ],
  },
  {
    id: "szynka",
    name: "Skrzynka Szynki",
    price: 15,
    tagline: "Świeżo wędzona. Pachnie wygraną.",
    image: "/cases/szynka.jpg",
    accent: "#ff7aa8",
    items: [
      I("P90", "Sand Spray", "milspec", 7.5, 16),
      I("MAC-10", "Candy Apple", "milspec", 8.5, 16),
      I("UMP-45", "Bone Pile", "milspec", 9.5, 16),
      I("Tec-9", "Isaac", "milspec", 11, 16),
      I("Five-SeveN", "Fowl Play", "milspec", 13, 16),
      I("Glock-18", "Royal Legion", "restricted", 19, 5),
      I("FAMAS", "Sergeant", "restricted", 22, 5),
      I("M4A1-S", "Blood Tiger", "restricted", 27, 5),
      I("Desert Eagle", "Kumicho Dragon", "classified", 48, 3.2),
      I("M4A4", "Hellfire", "covert", 128, 0.64),
      I("★ M9 Bayonet", "Slaughter", "knife", 680, 0.16),
    ],
  },
  {
    id: "garaz",
    name: "Skrzynka z Garażu",
    price: 18,
    tagline: "Znalezione w kartonie. Śmierdzi olejem i szczęściem.",
    image: "/cases/garaz.jpg",
    accent: "#fb923c",
    items: [
      I("XM1014", "Tranquility", "milspec", 9.0, 16),
      I("SG 553", "Pulse", "milspec", 10, 16),
      I("Sawed-Off", "The Kraken", "milspec", 11.5, 16),
      I("MP9", "Rose Iron", "milspec", 13, 16),
      I("Glock-18", "Twilight Galaxy", "milspec", 15, 16),
      I("AUG", "Chameleon", "restricted", 24, 5),
      I("Galil AR", "Firefight", "restricted", 27, 5),
      I("Desert Eagle", "Crimson Web", "restricted", 32, 5),
      I("AK-47", "Phantom Disruptor", "classified", 58, 3.2),
      I("AWP", "Hyper Beast", "covert", 150, 0.64),
      I("★ Survival Knife", "Blue Steel", "knife", 780, 0.16),
    ],
  },
  {
    id: "impreza",
    name: "Skrzynka Imprezowa",
    price: 19,
    tagline: "Dzwoń po ekipę. Konfetti w cenie.",
    image: "/cases/impreza.jpg",
    accent: "#f472b6",
    items: [
      I("P250", "See Ya Later", "milspec", 9.5, 16),
      I("MP5-SD", "Kitbash", "milspec", 10.5, 16),
      I("Five-SeveN", "Angry Mob", "milspec", 12, 16),
      I("PP-Bizon", "High Roller", "milspec", 14, 16),
      I("Tec-9", "Fuel Injector", "milspec", 16, 16),
      I("USP-S", "Cyrex", "restricted", 26, 5),
      I("Glock-18", "Neo-Noir", "restricted", 29, 5),
      I("FAMAS", "Mecha Industries", "restricted", 33, 5),
      I("AWP", "Wildfire", "classified", 62, 3.2),
      I("AK-47", "Neon Revolution", "covert", 158, 0.64),
      I("★ Flip Knife", "Marble Fade", "knife", 820, 0.16),
    ],
  },
  {
    id: "pixel",
    name: "Pixel Case",
    price: 20,
    tagline: "8-bitowa nostalgia. Wciśnij START.",
    image: "/cases/pixel.jpg",
    accent: "#38e0ff",
    items: [
      I("Glock-18", "Catacombs", "milspec", 10, 16),
      I("P250", "Hive", "milspec", 12, 16),
      I("Nova", "Graphite", "milspec", 13, 16),
      I("MP9", "Dart", "milspec", 15, 16),
      I("PP-Bizon", "Urban Dashed", "milspec", 17, 16),
      I("Desert Eagle", "Cobalt Disruption", "restricted", 25, 5),
      I("MAC-10", "Curse", "restricted", 29, 5),
      I("SSG 08", "Parallax", "restricted", 35, 5),
      I("AK-47", "Slate", "classified", 64, 3.2),
      I("M4A1-S", "Cyrex", "covert", 170, 0.64),
      I("★ Shadow Daggers", "Fade", "knife", 900, 0.16),
    ],
  },
  {
    id: "kavper",
    name: "Skrzynka Kavpera",
    price: 25,
    tagline: "Sygnaturowa skrzynka domu. Mocna jak espresso.",
    image: "/cases/kavper.jpg",
    accent: "#c89b5a",
    items: [
      I("P250", "Franklin", "milspec", 13, 16),
      I("MP9", "Hot Rod", "milspec", 15, 16),
      I("Nova", "Blaze Orange", "milspec", 16, 16),
      I("UMP-45", "Grand Prix", "milspec", 18, 16),
      I("Tec-9", "Brass", "milspec", 21, 16),
      I("FAMAS", "Spitfire", "restricted", 31, 5),
      I("Desert Eagle", "Golden Koi", "restricted", 38, 5),
      I("M4A1-S", "Guardian", "restricted", 44, 5),
      I("AWP", "Graphite", "classified", 80, 3.2),
      I("AK-47", "Cartel", "covert", 212, 0.64),
      I("★ Butterfly Knife", "Tiger Tooth", "knife", 1120, 0.16),
    ],
  },
  {
    id: "hobbiton",
    name: "Hobbiton Case",
    price: 30,
    tagline: "Prosto z Nori. W środku błyskotki.",
    image: "/cases/hobbiton.jpg",
    accent: "#7dd87d",
    items: [
      I("Glock-18", "High Beam", "milspec", 16, 16),
      I("P250", "Ripple", "milspec", 18, 16),
      I("MAG-7", "Sonar", "milspec", 19, 16),
      I("MP5-SD", "Phosphor", "milspec", 22, 16),
      I("Nova", "Green Apple", "milspec", 24, 16),
      I("Galil AR", "Sugar Rush", "restricted", 38, 5),
      I("SSG 08", "Ghost Crusader", "restricted", 46, 5),
      I("M4A4", "Poly Mag", "restricted", 54, 5),
      I("Desert Eagle", "Emerald Jörmungandr", "classified", 96, 3.2),
      I("AWP", "Containment Breach", "covert", 255, 0.64),
      I("★ Huntsman Knife", "Damascus Steel", "knife", 1350, 0.16),
    ],
  },
  {
    id: "morska",
    name: "Skrzynka Morska",
    price: 34,
    tagline: "Wyłowiona z głębin. Sól i skarby.",
    image: "/cases/morska.jpg",
    accent: "#38bdf8",
    items: [
      I("MAG-7", "Cobalt Core", "milspec", 17, 16),
      I("Nova", "Hyper Beast", "milspec", 19, 16),
      I("Glock-18", "Water Elemental", "milspec", 21, 16),
      I("P90", "Emerald Dragon", "milspec", 25, 16),
      I("Desert Eagle", "Ocean Drive", "milspec", 29, 16),
      I("M4A1-S", "Leaded Glass", "restricted", 40, 5),
      I("SSG 08", "Bloodshot", "restricted", 46, 5),
      I("AK-47", "Blue Laminate", "restricted", 58, 5),
      I("AWP", "Sun in Leo", "classified", 108, 3.2),
      I("M4A4", "Poseidon", "covert", 290, 0.64),
      I("★ Karambit", "Bright Water", "knife", 1550, 0.16),
    ],
  },
  {
    id: "jungle",
    name: "Jungle Case",
    price: 35,
    tagline: "Dżungla wzywa. Tygrysie paski i jad.",
    image: "/cases/jungle.jpg",
    accent: "#4ade80",
    items: [
      I("Tec-9", "Bamboo Forest", "milspec", 18, 16),
      I("Nova", "Rising Skull", "milspec", 20, 16),
      I("MAC-10", "Rangeen", "milspec", 22, 16),
      I("Galil AR", "Chatterbox", "milspec", 26, 16),
      I("SSG 08", "Big Iron", "milspec", 30, 16),
      I("Desert Eagle", "Ocean Drive", "restricted", 42, 5),
      I("USP-S", "Monster Mashup", "restricted", 48, 5),
      I("M4A1-S", "Chantico's Fire", "restricted", 60, 5),
      I("AWP", "Chromatic Aberration", "classified", 112, 3.2),
      I("AK-47", "Jaguar", "covert", 298, 0.64),
      I("★ Bowie Knife", "Tiger Tooth", "knife", 1600, 0.16),
    ],
  },
  {
    id: "apex",
    name: "Apex Case",
    price: 40,
    tagline: "Dla tych, co celują na szczyt.",
    image: "/cases/apex.jpg",
    accent: "#ff4d5e",
    items: [
      I("P250", "Steel Disruption", "milspec", 20, 16),
      I("Glock-18", "Night", "milspec", 22, 16),
      I("Nova", "Antique", "milspec", 26, 16),
      I("UMP-45", "Riot", "milspec", 30, 16),
      I("MAC-10", "Red Filigree", "milspec", 34, 16),
      I("USP-S", "Torque", "restricted", 48, 5),
      I("Desert Eagle", "Directive", "restricted", 55, 5),
      I("FAMAS", "Pulse", "restricted", 68, 5),
      I("AWP", "Electric Hive", "classified", 128, 3.2),
      I("AK-47", "Red Laminate", "covert", 340, 0.64),
      I("★ Karambit", "Crimson Web", "knife", 1800, 0.16),
    ],
  },
  {
    id: "arcade",
    name: "Arcade Case",
    price: 45,
    tagline: "Insert coin. Kolorowe piksele, grube dropy.",
    image: "/cases/arcade.jpg",
    accent: "#ff6ec7",
    items: [
      I("P2000", "Fire Elemental", "milspec", 23, 16),
      I("MP7", "Bloodsport", "milspec", 26, 16),
      I("Glock-18", "Weasel", "milspec", 29, 16),
      I("Five-SeveN", "Hyper Beast", "milspec", 33, 16),
      I("MAG-7", "Justice", "milspec", 38, 16),
      I("SSG 08", "Dragonfire", "restricted", 55, 5),
      I("Galil AR", "Chromatic Aberration", "restricted", 62, 5),
      I("Desert Eagle", "Trigger Discipline", "restricted", 74, 5),
      I("M4A4", "Neo-Noir", "classified", 145, 3.2),
      I("AK-47", "Bloodsport", "covert", 380, 0.64),
      I("★ Falchion Knife", "Marble Fade", "knife", 2050, 0.16),
    ],
  },
  {
    id: "neon",
    name: "Neon Rush",
    price: 50,
    tagline: "Cyberpunk po godzinach. Miasto nigdy nie śpi.",
    image: "/cases/neon.jpg",
    accent: "#00f0ff",
    items: [
      I("MP9", "Pandora's Box", "milspec", 25, 16),
      I("Glock-18", "Moonrise", "milspec", 28, 16),
      I("P250", "Splash", "milspec", 32, 16),
      I("Five-SeveN", "Urban Hazard", "milspec", 36, 16),
      I("Tec-9", "Blue Titanium", "milspec", 42, 16),
      I("USP-S", "Stainless", "restricted", 62, 5),
      I("M4A1-S", "Nightmare", "restricted", 75, 5),
      I("Desert Eagle", "Oxide Blaze", "restricted", 88, 5),
      I("AK-47", "Neon Rider", "classified", 160, 3.2),
      I("AWP", "Neo-Noir", "covert", 425, 0.64),
      I("★ Karambit", "Doppler", "knife", 2250, 0.16),
    ],
  },
  {
    id: "toxic",
    name: "Toxic Case",
    price: 60,
    tagline: "Radioaktywnie dobra zawartość.",
    image: "/cases/toxic.jpg",
    accent: "#59ff6e",
    items: [
      I("MAC-10", "Nuclear Garden", "milspec", 30, 16),
      I("MP7", "Impire", "milspec", 34, 16),
      I("P250", "Nuclear Threat", "milspec", 38, 16),
      I("Glock-18", "Bunsen Burner", "milspec", 44, 16),
      I("UMP-45", "Exposure", "milspec", 51, 16),
      I("Tec-9", "Toxic", "restricted", 72, 5),
      I("M4A4", "Radiation Hazard", "restricted", 90, 5),
      I("Desert Eagle", "Fennec Fox", "restricted", 105, 5),
      I("AWP", "Pit Viper", "classified", 192, 3.2),
      I("AK-47", "Uncharted", "covert", 510, 0.64),
      I("★ M9 Bayonet", "Gamma Doppler", "knife", 2700, 0.16),
    ],
  },
  {
    id: "sakura",
    name: "Sakura Case",
    price: 65,
    tagline: "Kwiat wiśni i katany. Piękno, które boli.",
    image: "/cases/sakura.jpg",
    accent: "#f9a8d4",
    items: [
      I("MP9", "Sand Scale", "milspec", 33, 16),
      I("PP-Bizon", "Judgement of Anubis", "milspec", 37, 16),
      I("P250", "Muertos", "milspec", 41, 16),
      I("Tec-9", "Remote Control", "milspec", 47, 16),
      I("MAC-10", "Neon Rider", "milspec", 55, 16),
      I("USP-S", "Cortex", "restricted", 80, 5),
      I("M4A4", "Buzz Kill", "restricted", 92, 5),
      I("Desert Eagle", "Hypnotic", "restricted", 110, 5),
      I("AWP", "Hyper Beast", "classified", 205, 3.2),
      I("AK-47", "The Empress", "covert", 545, 0.64),
      I("★ Ursus Knife", "Doppler", "knife", 2900, 0.16),
    ],
  },
  {
    id: "frost",
    name: "Frostbite Case",
    price: 75,
    tagline: "Zamarznie krew w żyłach. Dosłownie.",
    image: "/cases/frost.jpg",
    accent: "#7dd3fc",
    items: [
      I("P250", "Whiteout", "milspec", 38, 16),
      I("MP9", "Mount Fuji", "milspec", 44, 16),
      I("Glock-18", "Ironwork", "milspec", 50, 16),
      I("XM1014", "Blue Steel", "milspec", 57, 16),
      I("SSG 08", "Abyss", "milspec", 64, 16),
      I("Galil AR", "Cold Fusion", "restricted", 95, 5),
      I("M4A1-S", "Moss Quartz", "restricted", 115, 5),
      I("Desert Eagle", "Heirloom", "restricted", 130, 5),
      I("AK-47", "Ice Coaled", "classified", 240, 3.2),
      I("M4A1-S", "Blue Phosphor", "covert", 640, 0.64),
      I("★ Butterfly Knife", "Damascus Steel", "knife", 3400, 0.16),
    ],
  },
  {
    id: "lawa",
    name: "Skrzynka Lawy",
    price: 76,
    tagline: "Gorąca jak wulkan. Uważaj na palce.",
    image: "/cases/lawa.jpg",
    accent: "#f97316",
    items: [
      I("Galil AR", "Orange DDPAT", "milspec", 38, 16),
      I("UMP-45", "Blaze", "milspec", 43, 16),
      I("P250", "Inferno", "milspec", 49, 16),
      I("MAC-10", "Hot Snakes", "milspec", 56, 16),
      I("Five-SeveN", "Flame Test", "milspec", 64, 16),
      I("Tec-9", "Fuel Injector", "restricted", 96, 5),
      I("M4A4", "Magnesium", "restricted", 110, 5),
      I("AK-47", "Inheritance", "restricted", 130, 5),
      I("Desert Eagle", "Ocean Drive", "classified", 245, 3.2),
      I("AK-47", "Fire Serpent", "covert", 650, 0.64),
      I("★ Karambit", "Autotronic", "knife", 3400, 0.16),
    ],
  },
  {
    id: "glacier",
    name: "Glacier Case",
    price: 85,
    tagline: "Lodowiec pełen zamrożonych skarbów.",
    image: "/cases/glacier.jpg",
    accent: "#67e8f9",
    items: [
      I("Glock-18", "Off World", "milspec", 43, 16),
      I("UMP-45", "Momentum", "milspec", 49, 16),
      I("P90", "Asiimov", "milspec", 55, 16),
      I("MP5-SD", "Oxide Oasis", "milspec", 62, 16),
      I("Nova", "Hyper Beast", "milspec", 72, 16),
      I("Five-SeveN", "Hyper Beast", "restricted", 105, 5),
      I("Galil AR", "Eco", "restricted", 120, 5),
      I("M4A1-S", "Mecha Industries", "restricted", 145, 5),
      I("Desert Eagle", "Printstream", "classified", 270, 3.2),
      I("AWP", "Duality", "covert", 720, 0.64),
      I("★ Paracord Knife", "Fade", "knife", 3800, 0.16),
    ],
  },
  {
    id: "smok",
    name: "Skrzynka Smoka",
    price: 100,
    tagline: "Premium. Tylko dla odważnych. Tu żyją legendy.",
    image: "/cases/smok.jpg",
    accent: "#ff6a00",
    items: [
      I("Nova", "Wild Six", "milspec", 50, 16),
      I("P250", "Valence", "milspec", 55, 16),
      I("MP7", "Skulls", "milspec", 60, 16),
      I("UMP-45", "Primal Saber", "milspec", 70, 16),
      I("Tec-9", "Jambiya", "milspec", 85, 16),
      I("Desert Eagle", "Naga", "restricted", 120, 5),
      I("FAMAS", "Djinn", "restricted", 150, 5),
      I("M4A1-S", "Imminent Danger", "restricted", 180, 5),
      I("Desert Eagle", "Blaze", "classified", 320, 3.2),
      I("AWP", "Dragon Lore", "covert", 850, 0.64),
      I("★ M9 Bayonet", "Marble Fade", "knife", 4500, 0.16),
    ],
  },
  {
    id: "armory",
    name: "Armory Case",
    price: 120,
    tagline: "Arsenał operatora. Pełna gotowość bojowa.",
    image: "/cases/armory.jpg",
    accent: "#c4b5fd",
    items: [
      I("FAMAS", "Roll Cage", "milspec", 60, 16),
      I("XM1014", "Ziggy", "milspec", 68, 16),
      I("AUG", "Chameleon", "milspec", 76, 16),
      I("SG 553", "Integrale", "milspec", 86, 16),
      I("Glock-18", "Water Elemental", "milspec", 100, 16),
      I("M4A4", "Desolate Space", "restricted", 150, 5),
      I("AK-47", "Point Disarray", "restricted", 175, 5),
      I("AWP", "Atheris", "restricted", 210, 5),
      I("M4A1-S", "Hyper Beast", "classified", 380, 3.2),
      I("AK-47", "Asiimov", "covert", 1020, 0.64),
      I("★ Bayonet", "Lore", "knife", 5400, 0.16),
    ],
  },
  {
    id: "sejf",
    name: "Sejf Złota",
    price: 150,
    tagline: "Bankowy poziom ekscytacji. Kody wybrane.",
    image: "/cases/vault.jpg",
    accent: "#ffd700",
    items: [
      I("Glock-18", "Franklin", "milspec", 80, 16),
      I("Tec-9", "Titanium Bit", "milspec", 90, 16),
      I("MAG-7", "Silver", "milspec", 95, 16),
      I("P90", "Chopper", "milspec", 105, 16),
      I("UMP-45", "Minotaur's Labyrinth", "milspec", 115, 16),
      I("Desert Eagle", "Pilot", "restricted", 190, 5),
      I("M4A1-S", "Hot Rod", "restricted", 230, 5),
      I("FAMAS", "Commemoration", "restricted", 265, 5),
      I("AK-47", "Gold Arabesque", "classified", 480, 3.2),
      I("AWP", "Lightning Strike", "covert", 1275, 0.64),
      I("★ Butterfly Knife", "Fade", "knife", 6800, 0.16),
    ],
  },
  {
    id: "royal",
    name: "Skrzynka Korony",
    price: 250,
    tagline: "Królewska pula. Tu dropy płacą w złocie.",
    image: "/cases/royal.jpg",
    accent: "#ffcf5e",
    items: [
      I("P250", "Vino Primo", "milspec", 130, 16),
      I("Nova", "Modern Hunter", "milspec", 140, 16),
      I("MP7", "Nemesis", "milspec", 150, 16),
      I("Glock-18", "Royal Legion", "milspec", 150, 16),
      I("SSG 08", "Death's Head", "milspec", 185, 16),
      I("USP-S", "Ancient Visions", "restricted", 300, 5),
      I("M4A1-S", "Golden Coil", "restricted", 370, 5),
      I("FAMAS", "Meltdown", "restricted", 420, 5),
      I("AK-47", "X-Ray", "classified", 800, 3.2),
      I("M4A4", "Howl", "covert", 2125, 0.64),
      I("★ M9 Bayonet", "Doppler", "knife", 11250, 0.16),
    ],
  },
  {
    id: "diament",
    name: "Diament Case",
    price: 400,
    tagline: "Absolutny top. Biel i błękit czystości.",
    image: "/cases/diament.jpg",
    accent: "#8be9ff",
    items: [
      I("MP5-SD", "Liquidation", "milspec", 210, 16),
      I("UMP-45", "Crime Scene", "milspec", 230, 16),
      I("MAC-10", "Saibā Oni", "milspec", 260, 16),
      I("Tec-9", "Decimator", "milspec", 300, 16),
      I("Five-SeveN", "Boost Protocol", "milspec", 340, 16),
      I("USP-S", "Printstream", "restricted", 480, 5),
      I("Desert Eagle", "Light Rail", "restricted", 580, 5),
      I("AK-47", "Phantom Disruptor", "restricted", 700, 5),
      I("AWP", "Black Nile", "classified", 1280, 3.2),
      I("AK-47", "Vulcan", "covert", 3400, 0.64),
      I("★ Karambit", "Doppler", "knife", 18000, 0.16),
    ],
  },
  {
    id: "midnight",
    name: "Midnight Case",
    price: 500,
    tagline: "Nocny neon i cienie. Skrzynka po zmroku.",
    image: "/cases/midnight.jpg",
    accent: "#8a7cff",
    items: [
      I("MP9", "Starlight Protector", "milspec", 260, 16),
      I("P250", "Cassette", "milspec", 290, 16),
      I("UMP-45", "Moonrise", "milspec", 320, 16),
      I("Tec-9", "Sandstorm", "milspec", 370, 16),
      I("Five-SeveN", "Nightshade", "milspec", 420, 16),
      I("AWP", "Corticera", "restricted", 720, 5),
      I("M4A1-S", "Atomic Alloy", "restricted", 760, 5),
      I("AK-47", "Redline", "restricted", 790, 5),
      I("M4A4", "Daybreak", "classified", 1600, 3.2),
      I("AWP", "Medusa", "covert", 4250, 0.64),
      I("★ Skeleton Knife", "Doppler", "knife", 22500, 0.16),
    ],
  },
  {
    id: "pharaoh",
    name: "Pharaoh Case",
    price: 600,
    tagline: "Skarby pustyni ze złota faraonów.",
    image: "/cases/pharaoh.jpg",
    accent: "#f0b429",
    items: [
      I("Nova", "Antique", "milspec", 310, 16),
      I("Glock-18", "Clear Polymer", "milspec", 340, 16),
      I("P90", "Sand Spray", "milspec", 380, 16),
      I("MP7", "Full Stop", "milspec", 450, 16),
      I("MAC-10", "Malachite", "milspec", 510, 16),
      I("M4A4", "The Emperor", "restricted", 880, 5),
      I("Glock-18", "Bullet Queen", "restricted", 900, 5),
      I("USP-S", "Kill Confirmed", "restricted", 950, 5),
      I("Desert Eagle", "Sunset Storm 壱", "classified", 1920, 3.2),
      I("AK-47", "Wild Lotus", "covert", 5100, 0.64),
      I("★ Talon Knife", "Fade", "knife", 27000, 0.16),
    ],
  },
  {
    id: "void",
    name: "Void Case",
    price: 700,
    tagline: "Fioletowa pustka, z której wracają legendy.",
    image: "/cases/void.jpg",
    accent: "#a855f7",
    items: [
      I("SSG 08", "Sea Calico", "milspec", 360, 16),
      I("UMP-45", "Oscillator", "milspec", 400, 16),
      I("P250", "Cyber Shell", "milspec", 470, 16),
      I("Nova", "Quick Sand", "milspec", 530, 16),
      I("MP5-SD", "Lab Rats", "milspec", 595, 16),
      I("AK-47", "Frontside Misty", "restricted", 1020, 5),
      I("AWP", "Fever Dream", "restricted", 1050, 5),
      I("M4A1-S", "Player Two", "restricted", 1080, 5),
      I("USP-S", "Black Lotus", "classified", 2240, 3.2),
      I("AWP", "Gungnir", "covert", 5950, 0.64),
      I("★ Nomad Knife", "Fade", "knife", 31500, 0.16),
    ],
  },
  {
    id: "crimson",
    name: "Crimson Case",
    price: 800,
    tagline: "Najdroższa skrzynka w domu. Krew, złoto i prestiż.",
    image: "/cases/crimson.jpg",
    accent: "#ff2d55",
    items: [
      I("Glock-18", "Ramese's Reach", "milspec", 410, 16),
      I("Tec-9", "Mummy's Rot", "milspec", 460, 16),
      I("UMP-45", "Wild Child", "milspec", 540, 16),
      I("P90", "Neoqueen", "milspec", 620, 16),
      I("PP-Bizon", "Modern Hunter", "milspec", 680, 16),
      I("M4A4", "Evil Daimyo", "restricted", 1180, 5),
      I("Desert Eagle", "Code Red", "restricted", 1200, 5),
      I("AWP", "Wildfire", "restricted", 1220, 5),
      I("Desert Eagle", "Midnight Storm", "classified", 2560, 3.2),
      I("AWP", "The Prince", "covert", 6800, 0.64),
      I("★ Butterfly Knife", "Doppler", "knife", 36000, 0.16),
    ],
  },
];

// ------------------------------------------------------- balance odds ------
// Wyrównane szanse: w każdej płatnej skrzynce ~50% szansy na profit.
// Itemy poniżej ceny skrzynki dzielą 50%, itemy >= ceny dzielą drugie 50%,
// przy czym wewnątrz grupy "profit" droższe dropy są proporcjonalnie rzadsze
// (waga ~ 1/wartość^0.8), a nóż zostaje najrzadszy.
const PROFIT_SHARE = 38; // % otwarć z dropem >= ceny skrzynki
const KNIFE_FLOOR = 0.1; // % — nóż nigdy rzadszy niż 1/1000
const COVERT_FLOOR = 0.5; // %
function rebalanceCase(c: CaseDef): CaseDef {
  if (c.free || c.price <= 0) return c;
  const priceC = c.price;
  const below = c.items.filter((i) => i.price < priceC);
  const above = c.items.filter((i) => i.price >= priceC && i.rarity !== "knife" && i.rarity !== "covert");
  const knife = c.items.find((i) => i.rarity === "knife");
  const covert = c.items.find((i) => i.rarity === "covert" && i.price >= priceC);
  if (below.length === 0 || above.length === 0) return c;

  const fixed = (knife ? KNIFE_FLOOR : 0) + (covert ? COVERT_FLOOR : 0);
  const profitPool = PROFIT_SHARE - fixed;
  const lossPool = 100 - PROFIT_SHARE;

  // poniżej ceny: łagodnie; powyżej ceny: stromo (1/x^1.6)
  const wb = below.map((i) => 1 / Math.pow(i.price / priceC, 0.8));
  const wa = above.map((i) => 1 / Math.pow(i.price / priceC, 2.4));
  const sb = wb.reduce((s, x) => s + x, 0);
  const sa = wa.reduce((s, x) => s + x, 0);

  const items = c.items.map((it) => {
    if (it === knife) return { ...it, chance: KNIFE_FLOOR };
    if (it === covert) return { ...it, chance: COVERT_FLOOR };
    const idxB = below.indexOf(it);
    const idxA = above.indexOf(it);
    const chance = idxB >= 0 ? (lossPool * wb[idxB]) / sb : (profitPool * wa[idxA]) / sa;
    return { ...it, chance: Math.round(chance * 1000) / 1000 };
  });
  return { ...c, items };
}

// Podnosimy niebieskie dropy do ~50–95% ceny skrzynki, żeby przegrana nie bolała.
function liftFloor(c: CaseDef): CaseDef {
  if (c.free || c.price <= 0) return c;
  const below = c.items.filter((i) => i.price < c.price).sort((a, b) => a.price - b.price);
  if (below.length === 0) return c;
  const floors = below.map((_, i) => 0.4 + (0.45 * i) / Math.max(1, below.length - 1));
  const items = c.items.map((it) => {
    const idx = below.indexOf(it);
    if (idx < 0) return it;
    const target = Math.round(c.price * floors[idx] * 100) / 100;
    return { ...it, price: Math.max(it.price, target) };
  });
  return { ...c, items };
}

export const CASES: CaseDef[] = CASES_RAW.map((c) => rebalanceCase(liftFloor(c)));

export const CASE_MAP = new Map(CASES.map((c) => [c.id, c]));
export const ALL_SKINS: SkinDef[] = CASES.flatMap((c) => c.items);

// ------------------------------------------------------------- BOOST -------
// Tryb BOOST: każdy skin w skrzynce ma IDENTYCZNĄ szansę (1/N), także nóż.
// Cena boostu = średnia wartość dropu × (1 / RTP), zaokrąglona w górę,
// więc dom ma tę samą marżę co w normalnej skrzynce, ale za grube pieniądze
// masz np. 9% na nóż zamiast 0,1%.
export const BOOST_RTP = 0.9;

export function boostCase(c: CaseDef): CaseDef {
  const n = c.items.length;
  const equal = Math.round((100 / n) * 1000) / 1000;
  const avg = c.items.reduce((s, i) => s + i.price, 0) / n;
  const price = Math.ceil(avg / BOOST_RTP);
  return {
    ...c,
    id: `${c.id}`,
    name: `${c.name} ⚡BOOST`,
    price,
    items: c.items.map((it) => ({ ...it, chance: equal })),
  };
}

export const BOOST_MAP = new Map(CASES.filter((c) => !c.free).map((c) => [c.id, boostCase(c)]));

// Zwraca definicję skrzynki w odpowiednim trybie
export function getCase(id: string, boost = false): CaseDef | undefined {
  return boost ? BOOST_MAP.get(id) : CASE_MAP.get(id);
}

// Bitwy: id rundy może mieć sufiks ":b" oznaczający boost
export function parseRoundCase(token: string): { id: string; boost: boolean } {
  const boost = token.endsWith(":b");
  return { id: boost ? token.slice(0, -2) : token, boost };
}
export function roundToken(id: string, boost: boolean) {
  return boost ? `${id}:b` : id;
}

// unikalne skiny do sklepu (dedupe po key, najniższa cena)
export const SHOP_SKINS: SkinDef[] = (() => {
  const m = new Map<string, SkinDef>();
  for (const s of ALL_SKINS) {
    const prev = m.get(s.key);
    if (!prev || s.price < prev.price) m.set(s.key, s);
  }
  return [...m.values()].sort((a, b) => a.price - b.price);
})();
export const SHOP_MARKUP = 1.1; // sklep sprzedaje 10% drożej niż wartość skina

// ------------------------------------------------------- free case rules ---
export const FREE_CASE_ID = "ratunkowa";
export const FREE_MAX_BALANCE_CENTS = 1500; // gdy masz < 15 zł
export const FREE_COOLDOWN_MS = 3 * 60 * 1000; // co 3 minuty

// ------------------------------------------------------------ daily chest --
export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const DAILY_REWARDS: { cents: number; weight: number; label: string }[] = [
  { cents: 2000, weight: 40, label: "20 zł" },
  { cents: 3500, weight: 28, label: "35 zł" },
  { cents: 5000, weight: 18, label: "50 zł" },
  { cents: 10000, weight: 10, label: "100 zł" },
  { cents: 25000, weight: 3.5, label: "250 zł" },
  { cents: 50000, weight: 0.5, label: "500 zł" },
];
export function rollDaily(rand = Math.random()) {
  const tot = DAILY_REWARDS.reduce((s, r) => s + r.weight, 0);
  let r = rand * tot;
  for (const rw of DAILY_REWARDS) {
    r -= rw.weight;
    if (r <= 0) return rw;
  }
  return DAILY_REWARDS[0];
}

// ---------------------------------------------------------------- money ----
export const toCents = (zl: number) => Math.round(zl * 100);

export function formatPLN(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const int = Math.floor(abs / 100);
  const dec = String(abs % 100).padStart(2, "0");
  const grouped = String(int).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped},${dec} zł`;
}

// ---------------------------------------------------------------- rolls ----
export function rollItem(caseDef: CaseDef, rand = Math.random()): SkinDef {
  const total = caseDef.items.reduce((s, i) => s + i.chance, 0);
  let r = rand * total;
  for (const it of caseDef.items) {
    r -= it.chance;
    if (r <= 0) return it;
  }
  return caseDef.items[caseDef.items.length - 1];
}

export function chancePct(caseDef: CaseDef, item: SkinDef): number {
  const total = caseDef.items.reduce((s, i) => s + i.chance, 0);
  return (item.chance / total) * 100;
}

// ------------------------------------------------------------- upgrader ----
// Gracz wybiera SZANSĘ (5–90%). Cel = najdroższy skin, jaki da się osiągnąć
// z tą szansą. Uczciwy wzór: szansa = wartość_itemu / wartość_celu × 0.95
// (5% przewagi domu), czyli cel_max = wartość_itemu × 0.95 / szansa.
export const UPGRADE_HOUSE_EDGE = 0.95;
export const UPGRADE_MIN_PCT = 5;
export const UPGRADE_MAX_PCT = 90;
export const UPGRADE_PRESETS = [10, 25, 50, 75, 90] as const;

export function clampPct(pct: number): number {
  if (!Number.isFinite(pct)) return 50;
  return Math.min(UPGRADE_MAX_PCT, Math.max(UPGRADE_MIN_PCT, Math.round(pct)));
}

export function findUpgradeTargetByChance(fromCents: number, pct: number) {
  const p = clampPct(pct) / 100;
  const maxTarget = Math.floor((fromCents * UPGRADE_HOUSE_EDGE) / p);
  // najdroższy skin, który jest droższy od itemu i mieści się w limicie
  const candidates = ALL_SKINS.map((s) => ({ s, c: toCents(s.price) }))
    .filter((x) => x.c > fromCents && x.c <= maxTarget)
    .sort((a, b) => b.c - a.c);
  const found = candidates[0];
  if (!found) return null;
  // realna szansa liczona od faktycznego celu (>= wybranej, bo cel może być tańszy niż limit)
  const chance = Math.min(UPGRADE_MAX_PCT / 100, (fromCents / found.c) * UPGRADE_HOUSE_EDGE);
  return { skin: found.s, priceCents: found.c, chance, requestedPct: clampPct(pct) };
}

// ----------------------------------------------------------------- bots ----
// Boty losują UCZCIWIE (te same szanse co gracze). Ich win rate liczy się
// z prawdziwych wyników na serwerze (tabela bot_stats), nie z zadeklarowanego numeru.
export interface BotProfile {
  key: string;
  name: string;
  tagline: string;
  color: string;
  icon: "rat" | "boot" | "leaf" | "smoke" | "zap" | "trophy";
}

export const BOTS: BotProfile[] = [
  { key: "chomik", name: "Bot Chomik", tagline: "Śpi przez połowę rundy", color: "#f0b429", icon: "rat" },
  { key: "kalosz", name: "Bot Kalosz", tagline: "Trafia, ale przypadkiem", color: "#5e98d9", icon: "boot" },
  { key: "hobbiton", name: "Zjarany Hobbiton", tagline: "Leci totalnie na czuja", color: "#7dd87d", icon: "leaf" },
  { key: "smoqu", name: "Smoqu", tagline: "Smokuje twoje skiny", color: "#b7c4d8", icon: "smoke" },
  { key: "izak", name: "Izak", tagline: "Legenda polskiej sceny", color: "#d32ee6", icon: "zap" },
  { key: "szeliga", name: "Szeliga", tagline: "Boss finałowy. Powodzenia", color: "#eb4b4b", icon: "trophy" },
];

export const MAX_BATTLE_CASES = 5;

export function battleWinner(
  p1TotalCents: number,
  p2TotalCents: number,
  mode: string
): "p1" | "p2" | "tie" {
  if (p1TotalCents === p2TotalCents) return "tie";
  if (mode === "joker") return p1TotalCents < p2TotalCents ? "p1" : "p2";
  return p1TotalCents > p2TotalCents ? "p1" : "p2";
}
