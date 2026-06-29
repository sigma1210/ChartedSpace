import type { RootState } from "../../index";
import { selectCurrentStarSystemViewModel } from "../system.selectors";
import type { SystemData } from "../../../lib/systemTypes";

const system: SystemData = {
  id: "Spin:1910",
  sector: "Spin",
  hex: "1910",
  name: "Regina",
  dataSource: "canonical",
  stars: [
    {
      index: 0,
      role: "primary",
      spectral: "F7 V",
      dataSource: "canonical",
      stellarClass: "main-sequence",
      color: "#fff2d0",
      radiusScale: 1.2,
      habitableZone: null,
      orbitId: null,
      au: null,
      proximity: null,
    },
  ],
  orbits: [
    {
      orbitId: 3,
      au: 1,
      zone: "habitable",
      dataSource: "canonical",
      angle0: 1,
      body: {
        kind: "world",
        isMainWorld: true,
        dataSource: "canonical",
        name: "Regina",
        sizeCode: "8",
        diameterKm: 12800,
        atmosphereCode: "6",
        atmosphereType: "standard",
        hydrographicsCode: "6",
        surfaceType: "terran",
        tradeCodes: ["Ri"],
        axialTilt: null,
        rotationPeriodH: null,
        canonicalTexture: null,
        moons: [],
        hasRings: null,
      },
    },
  ],
  companionOrbits: [],
  unplaced: [],
  counts: {
    totalWorldsInSystem: 1,
    gasGiants: 0,
    belts: 0,
    otherRockyWorlds: 0,
  },
  infrastructure: {
    navalBase: true,
    scoutBase: true,
    wayStation: false,
  },
  travelZone: null,
};

describe("system selectors", () => {
  it("builds the current star system view model from renderable location", () => {
    const state = {
      systemScene: {
        renderableLocation: { sectorAbbr: "Spin", hex: "1910" },
      },
      system: {
        records: {
          "Spin:1910": system,
        },
      },
    } as unknown as RootState;

    const model = selectCurrentStarSystemViewModel(state);

    expect(model?.source).toMatchObject({
      sectorAbbr: "Spin",
      hex: "1910",
      worldName: "Regina",
    });
    expect(model?.bodies[0]).toMatchObject({
      id: "body:3",
      label: "Regina",
      kind: "world",
    });
  });

  it("returns null when no renderable system data is loaded", () => {
    const state = {
      systemScene: {
        renderableLocation: { sectorAbbr: "Spin", hex: "1910" },
      },
      system: {
        records: {},
      },
    } as unknown as RootState;

    expect(selectCurrentStarSystemViewModel(state)).toBeNull();
  });
});
