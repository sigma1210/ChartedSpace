import type { EquipmentCatalogItem } from "./catalog";

export interface AvailabilityWorld {
  lawLevel: number;
  techLevel: number;
  population: number;
  starport: string;
  tradeCodes: readonly string[];
}

export interface ModifierLine {
  label: string;
  value: number;
}

const POSITIVE_TRADE_CODES = new Set(["HI", "HT", "IN", "RI"]);
const NEGATIVE_TRADE_CODES = new Set(["LT", "NA", "NI", "PO"]);

export const isEquipmentLegal = (
  item: EquipmentCatalogItem,
  world: AvailabilityWorld,
) => world.population > 0 && world.lawLevel < item.bannedAtLawLevel;

export const priceForMultiplier = (item: EquipmentCatalogItem, multiplier: 1 | 2 | 3) =>
  item.price * multiplier;

export const monthForTurn = (turn: number) => Math.floor((Math.max(1, turn) - 1) / 4);

export const characteristicModifier = (score: number) => {
  if (score <= 2) return -2;
  if (score <= 5) return -1;
  if (score <= 8) return 0;
  if (score <= 11) return 1;
  if (score <= 14) return 2;
  return 3;
};

export const requiresAvailabilityCheck = (
  item: EquipmentCatalogItem,
  world: AvailabilityWorld,
) => Boolean(item.specialised || item.military || item.techLevel > world.techLevel);

export const availabilityModifiers = ({
  item,
  world,
  skillLevel,
  characteristicDM,
  priceMultiplier,
  priorAttemptsThisMonth,
}: {
  item: EquipmentCatalogItem;
  world: AvailabilityWorld;
  skillLevel: number;
  characteristicDM: number;
  priceMultiplier: 1 | 2 | 3;
  priorAttemptsThisMonth: number;
}): ModifierLine[] => {
  const lines: ModifierLine[] = [
    { label: "Broker/Streetwise", value: skillLevel },
    { label: "Intelligence", value: characteristicDM },
  ];
  if (item.specialised) lines.push({ label: "Specialised item", value: -1 });
  if (item.military) lines.push({ label: "Military item", value: -2 });

  const techDifference = item.techLevel - world.techLevel;
  if (techDifference > 0) {
    lines.push({ label: "Above world TL", value: -1 });
    if (techDifference >= 10) lines.push({ label: "TL difference 10+", value: -4 });
    else if (techDifference >= 5) lines.push({ label: "TL difference 5–9", value: -2 });
    else if (techDifference >= 3) lines.push({ label: "TL difference 3–4", value: -1 });
  }

  if (priceMultiplier > 1) {
    lines.push({ label: `${priceMultiplier}× listed price`, value: priceMultiplier - 1 });
  }

  const starport = world.starport.toUpperCase();
  if (starport === "A" || starport === "B") lines.push({ label: `Starport ${starport}`, value: 1 });
  if (starport === "X") lines.push({ label: "Starport X", value: -4 });

  const codes = new Set(world.tradeCodes.map((code) => code.toUpperCase()));
  if ([...POSITIVE_TRADE_CODES].some((code) => codes.has(code))) {
    lines.push({ label: "Favourable trade classification", value: 2 });
  }
  if ([...NEGATIVE_TRADE_CODES].some((code) => codes.has(code))) {
    lines.push({ label: "Unfavourable trade classification", value: -2 });
  }

  if (world.population <= 2) lines.push({ label: `Population ${world.population}`, value: -2 });
  else if (world.population <= 5) lines.push({ label: `Population ${world.population}`, value: -1 });
  else if (world.population === 9) lines.push({ label: "Population 9", value: 1 });
  else if (world.population >= 10) lines.push({ label: `Population ${world.population}`, value: 2 });

  if (priorAttemptsThisMonth > 0) {
    lines.push({ label: "Prior attempts this month", value: -priorAttemptsThisMonth });
  }
  return lines;
};

export const totalAvailabilityModifier = (lines: readonly ModifierLine[]) =>
  lines.reduce((total, line) => total + line.value, 0);
