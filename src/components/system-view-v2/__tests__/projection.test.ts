import type { StarSystemViewModel } from "@/lib/starSystemViewModel";
import { projectSystemTopDown } from "../projection";

const starColors = {
  core: "#fff5a0",
  mid: "#fff2d0",
  limb: "#f0dca8",
  glow: "#fff0b4",
};

const model: StarSystemViewModel = {
  source: {
    sectorAbbr: "Spin",
    hex: "1910",
    worldName: "Regina",
    systemId: "Spin:1910",
    dataSource: "canonical",
  },
  sourceSystem: null,
  stars: [
    {
      id: "star:0",
      label: "Primary",
      dataSource: "canonical",
      focusState: "none",
      kind: "star",
      source: {
        index: 0,
        role: "primary",
        spectral: "F7 V",
        dataSource: "canonical",
        stellarClass: "main-sequence",
        color: "#fff2d0",
        radiusScale: 1,
        habitableZone: null,
        orbitId: null,
        au: null,
        proximity: null,
      },
      index: 0,
      role: "primary",
      spectral: "F7 V",
      stellarClass: "main-sequence",
      color: "#fff2d0",
      colors: starColors,
      massSolar: 1,
      physicalRadiusScale: 1,
      sceneRadius: 0.3,
      orbit: {
        orbitId: null,
        au: null,
        sceneRadius: 0,
        angle0: 0,
        angularVelocity: 0,
        center: { x: 0, y: 0, z: 0 },
      },
      habitableZone: null,
    },
  ],
  orbits: [
    {
      id: "orbit:1",
      label: "Orbit 1",
      dataSource: "canonical",
      focusState: "none",
      kind: "orbit",
      orbitKind: "primary",
      orbitId: 1,
      au: 1,
      zone: "habitable",
      sceneRadius: 10,
      angle0: 0,
      parentId: "system:center",
      bodyId: "body:1",
      source: null,
    },
    {
      id: "orbit:1:moon:0",
      label: "Moon Orbit",
      dataSource: "canonical",
      focusState: "none",
      kind: "orbit",
      orbitKind: "satellite",
      orbitId: 1,
      au: null,
      zone: null,
      sceneRadius: 2,
      angle0: Math.PI / 2,
      parentId: "body:1",
      bodyId: "body:1:moon:0",
      source: null,
    },
  ],
  bodies: [
    {
      id: "body:1",
      label: "Regina",
      dataSource: "canonical",
      focusState: "current",
      kind: "world",
      source: {
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
        tradeCodes: [],
        axialTilt: null,
        rotationPeriodH: null,
        canonicalTexture: null,
        moons: [],
        hasRings: null,
      },
      sourceOrbit: null,
      orbitId: 1,
      parentId: "system:center",
      isMainWorld: true,
      tradeCodes: [],
      scene: {
        orbitRadius: 10,
        angle0: 0,
        position: null,
      },
      visuals: {
        sceneRadius: 0.2,
        color: null,
        textureKey: "terran",
        hasAtmosphere: true,
        hasRings: false,
        labelVisible: true,
      },
      sizeCode: "8",
      diameterKm: 12800,
      atmosphereCode: "6",
      hydrographicsCode: "6",
      surfaceType: "terran",
    },
    {
      id: "body:1:moon:0",
      label: "Satellite",
      dataSource: "canonical",
      focusState: "none",
      kind: "world",
      source: {
        kind: "world",
        isMainWorld: false,
        dataSource: "canonical",
        name: "Satellite",
        sizeCode: "2",
        diameterKm: 3200,
        atmosphereCode: "0",
        atmosphereType: "none",
        hydrographicsCode: "0",
        surfaceType: "barren",
        tradeCodes: [],
        axialTilt: null,
        rotationPeriodH: null,
        canonicalTexture: null,
        moons: [],
        hasRings: null,
      },
      sourceOrbit: null,
      orbitId: 1,
      parentId: "body:1",
      isMainWorld: false,
      tradeCodes: [],
      scene: {
        orbitRadius: 2,
        angle0: Math.PI / 2,
        position: null,
      },
      visuals: {
        sceneRadius: 0.12,
        color: null,
        textureKey: "barren",
        hasAtmosphere: false,
        hasRings: false,
        labelVisible: true,
      },
      sizeCode: "2",
      diameterKm: 3200,
      atmosphereCode: "0",
      hydrographicsCode: "0",
      surfaceType: "barren",
    },
  ],
  unplacedBodies: [],
  scene: {
    center: { x: 0, y: 0, z: 0 },
    cameraDistance: 15,
    outermostOrbitRadius: 10,
  },
  counts: {
    stars: 0,
    orbits: 1,
    bodies: 1,
    worlds: 1,
    gasGiants: 0,
    belts: 0,
  },
};

describe("projectSystemTopDown", () => {
  it("projects orbit radii and body positions into SVG space", () => {
    const projection = projectSystemTopDown(model, {
      width: 200,
      height: 100,
      padding: 10,
    });

    expect(projection.center).toEqual({ x: 100, y: 50 });
    expect(projection.scale).toBeCloseTo(10 / 3);
    expect(projection.orbitRadii.get("orbit:1")).toBeCloseTo(100 / 3);
    expect(projection.orbitRadii.get("orbit:1:moon:0")).toBeCloseTo(20 / 3);
    expect(projection.orbitCenters.get("orbit:1")).toEqual({ x: 100, y: 50 });
    expect(projection.orbitCenters.get("orbit:1:moon:0")).toEqual({
      x: 100 + 100 / 3,
      y: 50,
    });
    expect(projection.stars[0]).toMatchObject({
      x: 100,
      y: 50,
    });
    expect(projection.bodies[0]).toMatchObject({
      x: 100 + 100 / 3,
      y: 50,
      radius: 5,
    });
    expect(projection.bodies[1]).toMatchObject({
      x: 100 + 100 / 3,
      y: 50 + 20 / 3,
      radius: 4,
    });
  });

  it("centers companion orbits around their companion star", () => {
    const companionModel: StarSystemViewModel = {
      ...model,
      stars: [
        model.stars[0],
        {
          ...model.stars[0],
          id: "star:2",
          label: "Far Companion",
          index: 2,
          role: "far-companion",
          orbit: {
            ...model.stars[0].orbit,
            sceneRadius: 8,
            angle0: 0,
          },
        },
      ],
      orbits: [
        {
          ...model.orbits[0],
          id: "orbit:0",
          orbitKind: "companion",
          orbitId: 0,
          sceneRadius: 2,
          parentId: "star:2",
          bodyId: "body:0",
        },
      ],
      bodies: [
        {
          ...model.bodies[0],
          id: "body:0",
          label: "Companion LGG",
          kind: "gasGiant",
          parentId: "star:2",
          scene: {
            ...model.bodies[0].scene,
            orbitRadius: 2,
            angle0: Math.PI,
          },
          classification: "LGG",
          diameterMiles: 220000,
          gravity: 2.2,
        },
      ],
      scene: {
        ...model.scene,
        outermostOrbitRadius: 10,
      },
    };
    const projection = projectSystemTopDown(companionModel, {
      width: 200,
      height: 100,
      padding: 10,
    });

    const companionStar = projection.stars.find((star) => star.star.id === "star:2");
    expect(companionStar).toBeDefined();
    expect(projection.orbitCenters.get("orbit:0")).toEqual({
      x: companionStar?.x,
      y: companionStar?.y,
    });
    expect(projection.bodies[0].x).toBeLessThan(companionStar?.x ?? 0);
  });

  it("centers primary orbits around an offset primary star", () => {
    const binaryModel: StarSystemViewModel = {
      ...model,
      stars: [
        {
          ...model.stars[0],
          orbit: {
            ...model.stars[0].orbit,
            sceneRadius: 4,
            angle0: 0,
          },
        },
        {
          ...model.stars[0],
          id: "star:1",
          label: "Far Companion",
          index: 1,
          role: "far-companion",
          orbit: {
            ...model.stars[0].orbit,
            sceneRadius: 6,
            angle0: Math.PI,
          },
        },
      ],
      orbits: [
        {
          ...model.orbits[0],
          parentId: "star:0",
        },
      ],
      bodies: [
        {
          ...model.bodies[0],
          parentId: "star:0",
        },
      ],
      scene: {
        ...model.scene,
        outermostOrbitRadius: 14,
      },
    };

    const projection = projectSystemTopDown(binaryModel, {
      width: 200,
      height: 100,
      padding: 10,
    });
    const primary = projection.stars.find((star) => star.star.id === "star:0");

    expect(primary).toBeDefined();
    expect(projection.orbitCenters.get("orbit:1")).toEqual({
      x: primary?.x,
      y: primary?.y,
    });
  });
});
