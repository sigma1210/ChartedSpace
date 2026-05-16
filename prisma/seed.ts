import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface SectorEntry {
  X: number;
  Y: number;
  Milieu: string;
  Abbreviation: string;
  Names: { Text: string; Lang?: string }[];
}

interface WorldJson {
  hex: string;
  hexX: number;
  hexY: number;
  name: string;
  uwp: {
    raw: string;
    starport: string;
    size: string;
    atmosphere: string;
    hydrographics: string;
    population: string;
    government: string;
    lawLevel: string;
    techLevel: string;
  };
  remarks: string[];
  travelZone: string | null;
  pbg: {
    belts: number | string;
    gasGiants: number | string;
  };
  worldsInSystem: number;
  allegiance: string | null;
  stellar: string[];
}

interface SectorFileJson {
  sector: string;
  abbreviation: string;
  milieu: string;
  worlds: WorldJson[];
}

function subsectorLetter(hexX: number, hexY: number): string {
  const col = Math.ceil(hexX / 8) - 1;
  const row = Math.ceil(hexY / 10) - 1;
  return String.fromCharCode(65 + row * 4 + col);
}

async function main() {
  const galaxyDir = path.resolve(__dirname, "../Galaxy");
  const sectorsIndexPath = path.join(galaxyDir, "sectors.json");
  const sectorsDir = path.join(galaxyDir, "sectors");

  const { Sectors } = JSON.parse(
    fs.readFileSync(sectorsIndexPath, "utf-8"),
  ) as { Sectors: SectorEntry[] };

  console.log(`Seeding ${Sectors.length} sectors…`);

  for (const entry of Sectors) {
    const filePath = path.join(sectorsDir, `${entry.Abbreviation}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ No file for sector ${entry.Abbreviation} — skipping`);
      continue;
    }

    const sectorFile = JSON.parse(
      fs.readFileSync(filePath, "utf-8"),
    ) as SectorFileJson;

    const sector = await prisma.sector.upsert({
      where: { abbreviation: entry.Abbreviation },
      update: {
        name: sectorFile.sector,
        gridX: entry.X,
        gridY: entry.Y,
        milieu: entry.Milieu,
      },
      create: {
        abbreviation: entry.Abbreviation,
        name: sectorFile.sector,
        gridX: entry.X,
        gridY: entry.Y,
        milieu: entry.Milieu,
      },
    });

    for (const world of sectorFile.worlds) {
      const subsector = subsectorLetter(world.hexX, world.hexY);

      await prisma.world.upsert({
        where: { sectorId_hex: { sectorId: sector.id, hex: world.hex } },
        update: {
          hexX: world.hexX,
          hexY: world.hexY,
          name: world.name,
          subsector,
          starport: world.uwp.starport,
          size: world.uwp.size,
          atmosphere: world.uwp.atmosphere,
          hydrographics: world.uwp.hydrographics,
          population: world.uwp.population,
          government: world.uwp.government,
          lawLevel: world.uwp.lawLevel,
          techLevel: world.uwp.techLevel,
          uwpRaw: world.uwp.raw,
          remarks: world.remarks,
          travelZone: world.travelZone,
          allegiance: world.allegiance,
          stellar: world.stellar,
          gasGiants: parseInt(String(world.pbg?.gasGiants ?? 0), 10) || 0,
          belts: parseInt(String(world.pbg?.belts ?? 0), 10) || 0,
          worldsInSystem: world.worldsInSystem ?? 0,
        },
        create: {
          sectorId: sector.id,
          hex: world.hex,
          hexX: world.hexX,
          hexY: world.hexY,
          name: world.name,
          subsector,
          starport: world.uwp.starport,
          size: world.uwp.size,
          atmosphere: world.uwp.atmosphere,
          hydrographics: world.uwp.hydrographics,
          population: world.uwp.population,
          government: world.uwp.government,
          lawLevel: world.uwp.lawLevel,
          techLevel: world.uwp.techLevel,
          uwpRaw: world.uwp.raw,
          remarks: world.remarks,
          travelZone: world.travelZone,
          allegiance: world.allegiance,
          stellar: world.stellar,
          gasGiants: parseInt(String(world.pbg?.gasGiants ?? 0), 10) || 0,
          belts: parseInt(String(world.pbg?.belts ?? 0), 10) || 0,
          worldsInSystem: world.worldsInSystem ?? 0,
        },
      });
    }

    console.log(
      `  ✓ ${entry.Abbreviation} (${sectorFile.sector}) — ${sectorFile.worlds.length} worlds`,
    );
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
