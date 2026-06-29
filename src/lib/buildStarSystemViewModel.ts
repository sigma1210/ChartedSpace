import { orbitToScene } from "./orbitData";
import { buildLayoutFromSystemData, deriveMass } from "./stellarSystem";
import { parseStar } from "./stellar";
import type {
  OrbitBody,
  SystemData,
  SystemOrbit,
  SystemStar,
  UnplacedBody,
} from "./systemTypes";
import type {
  StarSystemBeltModel,
  StarSystemBodyVisuals,
  StarSystemFocusState,
  StarSystemGasGiantModel,
  StarSystemOrbitKind,
  StarSystemOrbitModel,
  StarSystemRenderableBody,
  StarSystemSceneVector,
  StarSystemStarModel,
  StarSystemViewModel,
  StarSystemViewSource,
  StarSystemWorldModel,
} from "./starSystemViewModel";

export interface BuildStarSystemViewModelContext {
  currentBodyId?: string | null;
  selectedBodyId?: string | null;
  targetedBodyId?: string | null;
  focusedBodyId?: string | null;
}

const origin: StarSystemSceneVector = { x: 0, y: 0, z: 0 };

const focusStateForId = (
  id: string,
  context: BuildStarSystemViewModelContext,
): StarSystemFocusState => {
  if (context.focusedBodyId === id) return "focused";
  if (context.selectedBodyId === id) return "selected";
  if (context.targetedBodyId === id) return "targeted";
  if (context.currentBodyId === id) return "current";
  return "none";
};

const bodyLabel = (body: OrbitBody | UnplacedBody, fallback: string) => {
  if ("name" in body && typeof body.name === "string" && body.name.trim()) return body.name;
  if (body.kind === "gasGiant") return body.classification ?? "Gas Giant";
  if (body.kind === "belt") return "Belt";
  return fallback;
};

const bodyTradeCodes = (body: OrbitBody | UnplacedBody) =>
  "tradeCodes" in body && Array.isArray(body.tradeCodes) ? body.tradeCodes : [];

const bodyVisuals = (body: OrbitBody | UnplacedBody): StarSystemBodyVisuals => {
  if (body.kind === "gasGiant") {
    return {
      sceneRadius: body.classification === "LGG" ? 0.42 : 0.32,
      color: "#b7c7d8",
      textureKey: body.classification,
      hasAtmosphere: true,
      hasRings: false,
      labelVisible: true,
    };
  }

  if (body.kind === "belt") {
    return {
      sceneRadius: 0.16,
      color: "#9ca3af",
      textureKey: "belt",
      hasAtmosphere: false,
      hasRings: false,
      labelVisible: true,
    };
  }

  const diameterScale = body.diameterKm ? Math.max(0.12, Math.min(0.34, body.diameterKm / 38000)) : 0.18;
  return {
    sceneRadius: diameterScale,
    color: null,
    textureKey: body.surfaceType,
    hasAtmosphere: body.atmosphereType !== null && body.atmosphereType !== "none",
    hasRings: false,
    labelVisible: true,
  };
};

const companionOrbitSceneScale = 0.35;

const orbitSceneRadiusForKind = (orbitId: number, orbitKind: StarSystemOrbitKind) => {
  const radius = orbitToScene(orbitId);
  return orbitKind === "companion" ? radius * companionOrbitSceneScale : radius;
};

const cameraDistanceForSystem = (
  layout: ReturnType<typeof buildLayoutFromSystemData>,
  outermostOrbitRadius: number,
) => {
  const starBase = layout.type === "single"
    ? 10
    : layout.type === "binary"
      ? 16
      : Math.max(22, layout.companionRadius * 2.8);
  return Math.max(starBase, outermostOrbitRadius * 1.5);
};

const uniqueModelId = (baseId: string, usedIds: Set<string>) => {
  if (!usedIds.has(baseId)) {
    usedIds.add(baseId);
    return baseId;
  }

  let suffix = 2;
  let candidate = `${baseId}:${suffix}`;
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}:${suffix}`;
  }
  usedIds.add(candidate);
  return candidate;
};

const bodyModelFromBody = ({
  body,
  id,
  sourceOrbit,
  parentId,
  orbitRadius,
  angle0,
  context,
}: {
  body: OrbitBody | UnplacedBody;
  id: string;
  sourceOrbit: SystemOrbit | null;
  parentId: string;
  orbitRadius: number;
  angle0: number;
  context: BuildStarSystemViewModelContext;
}): StarSystemRenderableBody => {
  const shared = {
    id,
    label: bodyLabel(body, id),
    dataSource: body.dataSource,
    sourceOrbit,
    orbitId: sourceOrbit?.orbitId ?? null,
    parentId,
    isMainWorld: "isMainWorld" in body ? body.isMainWorld : false,
    tradeCodes: bodyTradeCodes(body),
    focusState: focusStateForId(id, context),
    scene: {
      orbitRadius,
      angle0,
      position: sourceOrbit ? null : origin,
    },
    visuals: bodyVisuals(body),
  };

  if (body.kind === "gasGiant") {
    return {
      ...shared,
      kind: "gasGiant",
      source: body,
      classification: body.classification,
      diameterMiles: "diameterMiles" in body ? body.diameterMiles : null,
      gravity: "gravity" in body ? body.gravity : null,
    } satisfies StarSystemGasGiantModel;
  }

  if (body.kind === "belt") {
    return {
      ...shared,
      kind: "belt",
      source: body,
    } satisfies StarSystemBeltModel;
  }

  return {
    ...shared,
    kind: "world",
    source: body,
    sizeCode: body.sizeCode,
    diameterKm: body.diameterKm,
    atmosphereCode: body.atmosphereCode,
    hydrographicsCode: body.hydrographicsCode,
    surfaceType: body.surfaceType,
  } satisfies StarSystemWorldModel;
};

const starModelFromSystemStar = ({
  star,
  index,
  sceneRadius,
  orbitRadius,
  angle0,
  angularVelocity,
  context,
}: {
  star: SystemStar;
  index: number;
  sceneRadius: number;
  orbitRadius: number;
  angle0: number;
  angularVelocity: number;
  context: BuildStarSystemViewModelContext;
}): StarSystemStarModel => {
  const id = `star:${star.index}`;
  const parsed = parseStar(star.spectral);
  const legacyStar = parsed ?? parseStar("G2 V")!;
  return {
    id,
    label: star.role === "primary" ? "Primary" : star.role === "close-companion" ? "Close Companion" : "Far Companion",
    dataSource: star.dataSource,
    focusState: focusStateForId(id, context),
    kind: "star",
    source: star,
    index,
    role: star.role,
    spectral: star.spectral,
    stellarClass: star.stellarClass,
    color: legacyStar.colors.mid,
    colors: legacyStar.colors,
    massSolar: deriveMass(legacyStar),
    physicalRadiusScale: star.radiusScale,
    sceneRadius,
    orbit: {
      orbitId: star.orbitId,
      au: star.au,
      sceneRadius: orbitRadius,
      angle0,
      angularVelocity,
      center: origin,
    },
    habitableZone: star.habitableZone,
  };
};

export const buildStarSystemViewModel = (
  system: SystemData,
  context: BuildStarSystemViewModelContext = {},
): StarSystemViewModel => {
  const layout = buildLayoutFromSystemData(system.stars);
  const allOrbits: Array<{ orbit: SystemOrbit; orbitKind: StarSystemOrbitKind }> = [
    ...system.orbits.map((orbit) => ({ orbit, orbitKind: "primary" as const })),
    ...system.companionOrbits.map((orbit) => ({ orbit, orbitKind: "companion" as const })),
  ];
  const bodies: StarSystemRenderableBody[] = [];

  const stars = system.stars.map((star, index) => {
    const slot = layout.slots[index];
    return starModelFromSystemStar({
      star,
      index,
      sceneRadius: slot?.visualRadius ?? 0.24,
      orbitRadius: slot?.orbitRadius ?? 0,
      angle0: index === 0 ? 0 : (Math.PI * 2 * index) / Math.max(2, system.stars.length),
      angularVelocity: star.role === "close-companion" ? layout.innerAngularVelocity : layout.outerAngularVelocity,
      context,
    });
  });
  const primaryStar = stars.find((star) => star.role === "primary") ?? stars[0];
  const farCompanionStar = stars.find((star) => star.role === "far-companion");
  const primaryOrbitParentId = primaryStar?.id ?? "system:center";
  const companionOrbitParentId = farCompanionStar?.id ?? "system:center";

  const orbits: StarSystemOrbitModel[] = [];
  const usedOrbitIds = new Set<string>();
  const usedBodyIds = new Set<string>();

  for (const { orbit, orbitKind } of allOrbits) {
    const orbitIdPrefix = orbitKind === "companion" ? "companion-orbit" : "orbit";
    const bodyIdPrefix = orbitKind === "companion" ? "companion-body" : "body";
    const id = uniqueModelId(`${orbitIdPrefix}:${orbit.orbitId}`, usedOrbitIds);
    const bodyId = uniqueModelId(`${bodyIdPrefix}:${orbit.orbitId}`, usedBodyIds);
    const sceneRadius = orbitSceneRadiusForKind(orbit.orbitId, orbitKind);
    const parentId = orbitKind === "companion" ? companionOrbitParentId : primaryOrbitParentId;
    bodies.push(bodyModelFromBody({
      body: orbit.body,
      id: bodyId,
      sourceOrbit: orbit,
      parentId,
      orbitRadius: sceneRadius,
      angle0: orbit.angle0,
      context,
    }));

    const moonCount = "moons" in orbit.body ? orbit.body.moons.length : 0;
    if (orbit.body.kind !== "belt") {
      orbit.body.moons.forEach((moon, moonIndex) => {
      const satelliteId = `${bodyId}:moon:${moonIndex}`;
      const satelliteOrbitId = `${id}:moon:${moonIndex}`;
      const satelliteRadius = 0.42 + moonIndex * 0.16;
      const satelliteAngle = (Math.PI * 2 * moonIndex) / Math.max(1, moonCount);
      bodies.push(bodyModelFromBody({
        body: moon,
        id: satelliteId,
        sourceOrbit: null,
        parentId: bodyId,
        orbitRadius: satelliteRadius,
        angle0: satelliteAngle,
        context,
      }));
      orbits.push({
        id: satelliteOrbitId,
        label: `${bodyLabel(orbit.body, bodyId)} Satellite ${moonIndex + 1}`,
        dataSource: moon.dataSource,
        focusState: focusStateForId(satelliteOrbitId, context),
        kind: "orbit",
        orbitKind: "satellite",
        orbitId: moonIndex + 1,
        au: null,
        zone: null,
        sceneRadius: satelliteRadius,
        angle0: satelliteAngle,
        parentId: bodyId,
        bodyId: satelliteId,
        source: null,
      });
      });
    }

    orbits.push({
      id,
      label: `Orbit ${orbit.orbitId}`,
      dataSource: orbit.dataSource,
      focusState: focusStateForId(id, context),
      kind: "orbit",
      orbitKind,
      orbitId: orbit.orbitId,
      au: orbit.au,
      zone: orbit.zone,
      sceneRadius,
      angle0: orbit.angle0,
      parentId,
      bodyId,
      source: orbit,
    });
  }

  const unplacedBodies = system.unplaced.map((body, index) =>
    bodyModelFromBody({
      body,
      id: `unplaced:${body.kind}:${index}`,
      sourceOrbit: null,
      parentId: "system:unplaced",
      orbitRadius: 0,
      angle0: 0,
      context,
    }),
  );

  const outermostOrbitRadius = orbits.reduce(
    (max, orbit) => Math.max(max, orbit.sceneRadius),
    0,
  );
  const source: StarSystemViewSource = {
    sectorAbbr: system.sector,
    hex: system.hex,
    worldName: system.name,
    systemId: system.id,
    dataSource: system.dataSource,
  };

  return {
    source,
    sourceSystem: system,
    stars,
    orbits,
    bodies,
    unplacedBodies,
    scene: {
      center: origin,
      cameraDistance: cameraDistanceForSystem(layout, outermostOrbitRadius),
      outermostOrbitRadius,
    },
    counts: {
      stars: stars.length,
      orbits: orbits.length,
      bodies: bodies.length,
      worlds: bodies.filter((body) => body.kind === "world").length,
      gasGiants: bodies.filter((body) => body.kind === "gasGiant").length,
      belts: bodies.filter((body) => body.kind === "belt").length,
    },
  };
};
