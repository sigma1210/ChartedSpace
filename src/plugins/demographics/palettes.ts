import { parsePrimaryStar } from "@/lib/stellar";
import type { World } from "@/types";

export interface LegendItem {
  key: string;
  label: string;
  color: string;
}

export const defaultWorldDotColor = "white";
export const missingDemographicColor = "#64748b";

const stellarClassColors: Record<string, string> = {
  O: "#8aa4ff",
  B: "#abc6ff",
  A: "#d6e0ff",
  F: "#fff1bf",
  G: "#ffd15c",
  K: "#ff9f38",
  M: "#d94d14",
  D: "#b8ccff",
  BD: "#6b2a00",
};

export const stellarLegendItems: LegendItem[] = [
  { key: "O", label: "O", color: stellarClassColors.O },
  { key: "B", label: "B", color: stellarClassColors.B },
  { key: "A", label: "A", color: stellarClassColors.A },
  { key: "F", label: "F", color: stellarClassColors.F },
  { key: "G", label: "G", color: stellarClassColors.G },
  { key: "K", label: "K", color: stellarClassColors.K },
  { key: "M", label: "M", color: stellarClassColors.M },
  { key: "D", label: "D", color: stellarClassColors.D },
  { key: "BD", label: "BD", color: stellarClassColors.BD },
];

export const getPrimaryStellarColor = (world: World | null): string => {
  if (!world) return defaultWorldDotColor;
  const primary = parsePrimaryStar(world.stellar);
  if (!primary) return missingDemographicColor;
  return primary.colors.mid;
};

const allegianceExactColors: Record<string, string> = {
  "--": "#64748b",
  ImDc: "#2563eb",
  ImDd: "#1d4ed8",
  ImDg: "#3b82f6",
  ImDi: "#60a5fa",
  ImDs: "#0ea5e9",
  ImDv: "#38bdf8",
  ZhIN: "#a855f7",
  ZhCa: "#c084fc",
  VaEx: "#16a34a",
  Va: "#22c55e",
  AsSc: "#f97316",
  AsT0: "#fb923c",
  SoCf: "#06b6d4",
  HvFd: "#eab308",
};

const allegiancePrefixColors: Record<string, string> = {
  Im: "#2f80ed",
  Zh: "#b15cff",
  As: "#f97316",
  Va: "#22c55e",
  So: "#06b6d4",
  Hv: "#eab308",
  Cs: "#94a3b8",
  Na: "#ef4444",
  Kk: "#dc2626",
  Dr: "#14b8a6",
  Da: "#38bdf8",
  Fl: "#84cc16",
  Ga: "#f59e0b",
  Gl: "#facc15",
  Ju: "#ec4899",
  Vi: "#8b5cf6",
};

const hashColor = (key: string) => {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue} 72% 58%)`;
};

export const getAllegianceColor = (allegiance: string | null | undefined): string => {
  const key = allegiance?.trim();
  if (!key) return missingDemographicColor;
  if (allegianceExactColors[key]) return allegianceExactColors[key];
  const prefix = Object.keys(allegiancePrefixColors).find((candidate) =>
    key.startsWith(candidate),
  );
  return prefix ? allegiancePrefixColors[prefix] : hashColor(key);
};
