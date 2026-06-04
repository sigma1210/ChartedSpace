import { buildSystemData } from "../systemGeneration";
import type { SystemOrbit } from "../systemTypes";
import type { SectorDetail, World } from "../../types";
import spin from "../../../Galaxy/sectors/Spin.json";

const sector = spin as unknown as SectorDetail;
const regina = sector.worlds.find((world) => world.hex === "1910") as World;

const containsMainWorld = (orbits: SystemOrbit[]): boolean =>
  orbits.some((orbit) => {
    const body = orbit.body;
    if (body.isMainWorld) return true;
    if ("moons" in body) return body.moons.some((moon) => moon.isMainWorld);
    return false;
  });

describe("buildSystemData", () => {
  it("builds stable system data for Spin 1910", () => {
    const system = buildSystemData(regina, {
      sectorAbbr: "Spin",
      currentTurn: 1,
    });

    expect(system.id).toBe("Spin/1910");
    expect(system.sector).toBe("Spin");
    expect(system.hex).toBe("1910");
    expect(system.name).toBe("Regina");
    expect(system.stars.map((star) => star.spectral)).toEqual([
      "F7 V",
      "BD",
      "M3 V",
    ]);
    expect(system.counts).toEqual({
      totalWorldsInSystem: 9,
      gasGiants: 3,
      belts: 0,
      otherRockyWorlds: 5,
    });
    expect(system.infrastructure).toEqual({
      navalBase: true,
      scoutBase: true,
      wayStation: false,
    });
    expect(containsMainWorld(system.orbits)).toBe(true);
  });

  it("is deterministic for the same world, sector, and turn", () => {
    const first = buildSystemData(regina, {
      sectorAbbr: "Spin",
      currentTurn: 1,
    });
    const second = buildSystemData(regina, {
      sectorAbbr: "Spin",
      currentTurn: 1,
    });

    expect(second).toEqual(first);
  });
});
