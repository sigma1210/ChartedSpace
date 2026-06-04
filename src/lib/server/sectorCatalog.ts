import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SectorDetail, World } from "@/types";

const SECTOR_ABBR_PATTERN = /^[A-Za-z0-9_-]+$/;

export const loadSectorCatalog = async (sectorAbbr: string): Promise<SectorDetail | null> => {
  if (!SECTOR_ABBR_PATTERN.test(sectorAbbr)) return null;

  const filePath = path.join(process.cwd(), "Galaxy", "sectors", `${sectorAbbr}.json`);
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as SectorDetail;
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
};

export const loadSectorCatalogWorld = async (
  sectorAbbr: string,
  hex: string,
): Promise<World | null> => {
  const sector = await loadSectorCatalog(sectorAbbr);
  return sector?.worlds.find((world) => world.hex === hex) ?? null;
};
