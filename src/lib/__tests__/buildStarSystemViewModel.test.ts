import { buildStarSystemViewModel } from "../buildStarSystemViewModel";
import { buildSystemData } from "../systemGeneration";
import { orbitToScene } from "../orbitData";
import type { SectorDetail, World } from "../../types";
import type { SystemData } from "../systemTypes";
import spin from "../../../Galaxy/sectors/Spin.json";

const sector = spin as unknown as SectorDetail;
const regina = sector.worlds.find((world) => world.hex === "1910") as World;

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
      habitableZone: {
        orbitId: 3,
        hz: 3,
        innerAU: 0.8,
        outerAU: 1.4,
      },
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
      angle0: 1.5,
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
    {
      orbitId: 6,
      au: 5.2,
      zone: "outer",
      dataSource: "rolled",
      angle0: 2.1,
      body: {
        kind: "gasGiant",
        isMainWorld: false,
        dataSource: "rolled",
        classification: "LGG",
        sizeCode: null,
        diameterMiles: 90000,
        gravity: 2.1,
        hasRings: null,
        moons: [],
      },
    },
  ],
  companionOrbits: [],
  unplaced: [{ kind: "belt", dataSource: "derived" }],
  counts: {
    totalWorldsInSystem: 2,
    gasGiants: 1,
    belts: 1,
    otherRockyWorlds: 0,
  },
  infrastructure: {
    navalBase: true,
    scoutBase: true,
    wayStation: false,
  },
  travelZone: null,
};

describe("buildStarSystemViewModel", () => {
  it("builds a renderer-neutral system model from system data", () => {
    const model = buildStarSystemViewModel(system, {
      currentBodyId: "body:3",
      targetedBodyId: "body:6",
    });

    expect(model.source).toEqual({
      sectorAbbr: "Spin",
      hex: "1910",
      worldName: "Regina",
      systemId: "Spin:1910",
      dataSource: "canonical",
    });
    expect(model.stars).toHaveLength(1);
    expect(model.orbits).toHaveLength(2);
    expect(model.bodies).toHaveLength(2);
    expect(model.unplacedBodies).toHaveLength(1);
    expect(model.counts).toMatchObject({
      stars: 1,
      orbits: 2,
      bodies: 2,
      worlds: 1,
      gasGiants: 1,
      belts: 0,
    });

    expect(model.bodies[0]).toMatchObject({
      id: "body:3",
      kind: "world",
      label: "Regina",
      focusState: "current",
      orbitId: 3,
      parentId: "star:0",
      tradeCodes: ["Ri"],
      scene: {
        orbitRadius: expect.any(Number),
        angle0: 1.5,
      },
    });
    expect(model.bodies[1]).toMatchObject({
      id: "body:6",
      kind: "gasGiant",
      label: "LGG",
      focusState: "targeted",
    });
    expect(model.unplacedBodies[0]).toMatchObject({
      id: "unplaced:belt:0",
      kind: "belt",
      parentId: "system:unplaced",
    });
  });

  it("expands moons into satellite orbit and body models", () => {
    const model = buildStarSystemViewModel({
      ...system,
      orbits: [
        {
          orbitId: 4,
          au: 2,
          zone: "outer",
          dataSource: "canonical",
          angle0: 0.5,
          body: {
            kind: "gasGiant",
            isMainWorld: false,
            dataSource: "canonical",
            classification: "LGG",
            sizeCode: null,
            diameterMiles: 100000,
            gravity: 2.4,
            hasRings: null,
            moons: [
              {
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
            ],
          },
        },
      ],
    });

    expect(model.orbits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "orbit:4:moon:0",
          orbitKind: "satellite",
          parentId: "body:4",
          bodyId: "body:4:moon:0",
        }),
      ]),
    );
    expect(model.bodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "body:4",
          kind: "gasGiant",
          parentId: "star:0",
        }),
        expect.objectContaining({
          id: "body:4:moon:0",
          kind: "world",
          label: "Regina",
          parentId: "body:4",
          isMainWorld: true,
        }),
      ]),
    );
  });

  it("parents companion orbits to the far companion star", () => {
    const model = buildStarSystemViewModel({
      ...system,
      stars: [
        system.stars[0],
        {
          index: 1,
          role: "far-companion",
          spectral: "M1 V",
          dataSource: "canonical",
          stellarClass: "main-sequence",
          color: "#ffb17a",
          radiusScale: 0.62,
          habitableZone: null,
          orbitId: 9,
          au: 12,
          proximity: "far",
        },
      ],
      companionOrbits: [
        {
          orbitId: 2,
          au: 0.5,
          zone: "inner",
          dataSource: "rolled",
          angle0: 0.25,
          body: {
            kind: "world",
            isMainWorld: false,
            dataSource: "rolled",
            name: "Companion World",
            sizeCode: "4",
            diameterKm: 6400,
            atmosphereCode: "1",
            atmosphereType: "trace",
            hydrographicsCode: "0",
            surfaceType: "barren",
            tradeCodes: [],
            axialTilt: null,
            rotationPeriodH: null,
            canonicalTexture: null,
            moons: [],
            hasRings: null,
          },
        },
      ],
    });

    expect(model.stars).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "star:1",
          role: "far-companion",
        }),
      ]),
    );
    expect(model.orbits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "companion-orbit:2",
          orbitKind: "companion",
          parentId: "star:1",
          bodyId: "companion-body:2",
        }),
      ]),
    );
    expect(model.bodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "companion-body:2",
          label: "Companion World",
          parentId: "star:1",
        }),
      ]),
    );
  });

  it("parents primary orbits to the primary star in binary systems", () => {
    const model = buildStarSystemViewModel({
      ...system,
      stars: [
        system.stars[0],
        {
          index: 1,
          role: "far-companion",
          spectral: "M3 V",
          dataSource: "canonical",
          stellarClass: "main-sequence",
          color: "#ff6030",
          radiusScale: 0.35,
          habitableZone: null,
          orbitId: null,
          au: null,
          proximity: "far",
        },
      ],
    });

    expect(model.orbits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "orbit:3",
          orbitKind: "primary",
          parentId: "star:0",
        }),
      ]),
    );
    expect(model.bodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "body:3",
          parentId: "star:0",
        }),
      ]),
    );
  });

  it("keeps companion-local orbits compact around the companion star", () => {
    const model = buildStarSystemViewModel({
      ...system,
      stars: [
        system.stars[0],
        {
          index: 1,
          role: "far-companion",
          spectral: "M3 V",
          dataSource: "canonical",
          stellarClass: "main-sequence",
          color: "#ff6030",
          radiusScale: 0.35,
          habitableZone: null,
          orbitId: null,
          au: null,
          proximity: "far",
        },
      ],
      companionOrbits: [
        {
          orbitId: 7,
          au: 10,
          zone: "outer",
          dataSource: "derived",
          angle0: 0,
          body: {
            kind: "world",
            isMainWorld: false,
            dataSource: "derived",
            sizeCode: null,
            diameterKm: null,
            atmosphereCode: null,
            atmosphereType: null,
            hydrographicsCode: null,
            surfaceType: null,
            tradeCodes: [],
            axialTilt: null,
            rotationPeriodH: null,
            canonicalTexture: null,
            moons: [],
            hasRings: null,
          },
        },
      ],
    });

    const companionOrbit = model.orbits.find((orbit) => orbit.id === "companion-orbit:7");
    const companionBody = model.bodies.find((body) => body.id === "companion-body:7");

    expect(companionOrbit).toMatchObject({
      orbitKind: "companion",
      parentId: "star:1",
    });
    expect(companionOrbit?.sceneRadius).toBeLessThan(orbitToScene(7));
    expect(companionBody?.scene.orbitRadius).toBe(companionOrbit?.sceneRadius);
  });

  it("keeps primary and companion orbit ids unique when orbit numbers overlap", () => {
    const model = buildStarSystemViewModel({
      ...system,
      stars: [
        system.stars[0],
        {
          index: 1,
          role: "far-companion",
          spectral: "M3 V",
          dataSource: "canonical",
          stellarClass: "main-sequence",
          color: "#ff6030",
          radiusScale: 0.35,
          habitableZone: null,
          orbitId: null,
          au: null,
          proximity: "far",
        },
      ],
      orbits: [
        {
          ...system.orbits[0],
          orbitId: 1,
        },
      ],
      companionOrbits: [
        {
          orbitId: 1,
          au: 0.4,
          zone: "inner",
          dataSource: "derived",
          angle0: 0,
          body: {
            kind: "belt",
            isMainWorld: false,
            dataSource: "derived",
          },
        },
      ],
    });

    expect(model.orbits.map((orbit) => orbit.id)).toEqual(
      expect.arrayContaining(["orbit:1", "companion-orbit:1"]),
    );
    expect(new Set(model.orbits.map((orbit) => orbit.id)).size).toBe(model.orbits.length);
    expect(model.bodies.map((body) => body.id)).toEqual(
      expect.arrayContaining(["body:1", "companion-body:1"]),
    );
    expect(new Set(model.bodies.map((body) => body.id)).size).toBe(model.bodies.length);
  });

  it("models Regina with a main world moon and far companion subsystem", () => {
    const systemData = buildSystemData(regina, {
      sectorAbbr: "Spin",
      currentTurn: 1,
    });
    const model = buildStarSystemViewModel(systemData);
    const farCompanion = model.stars.find((star) => star.role === "far-companion");
    const companionBodies = model.bodies.filter((body) => body.parentId === farCompanion?.id);

    expect(model.stars.map((star) => star.spectral)).toEqual(["F7 V", "BD", "M3 V"]);
    expect(model.bodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "body:4",
          kind: "gasGiant",
          classification: "LGG",
          parentId: "star:0",
        }),
        expect.objectContaining({
          id: "body:4:moon:0",
          kind: "world",
          label: "Regina",
          isMainWorld: true,
          parentId: "body:4",
        }),
      ]),
    );
    expect(farCompanion).toMatchObject({
      id: "star:2",
      role: "far-companion",
    });
    expect(companionBodies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "companion-body:0",
          kind: "gasGiant",
          classification: "LGG",
        }),
        expect.objectContaining({ id: "companion-body:6", kind: "world" }),
        expect.objectContaining({ id: "companion-body:7", kind: "world" }),
      ]),
    );
    expect(companionBodies).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ parentId: "system:center" }),
      ]),
    );
  });
});
