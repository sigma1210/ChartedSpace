import type {
  BodyZone,
  DataSource,
  GasGiantType,
  OrbitBody,
  StellarClass,
  SystemData,
  SystemOrbit,
  SystemStar,
  UnplacedBody,
} from "./systemTypes";
import type { StarColors } from "./stellar";

export type StarSystemBodyKind = "world" | "gasGiant" | "belt";
export type StarSystemOrbitKind = "primary" | "companion" | "satellite";
export type StarSystemFocusState = "none" | "current" | "selected" | "targeted" | "focused";

export interface StarSystemViewSource {
  sectorAbbr: string | null;
  hex: string;
  worldName: string;
  systemId: string | null;
  dataSource: DataSource;
}

export interface StarSystemSceneVector {
  x: number;
  y: number;
  z: number;
}

export interface StarSystemRenderableBase {
  id: string;
  label: string | null;
  dataSource: DataSource;
  focusState: StarSystemFocusState;
}

export interface StarSystemStarModel extends StarSystemRenderableBase {
  kind: "star";
  source: SystemStar;
  index: number;
  role: SystemStar["role"];
  spectral: string;
  stellarClass: StellarClass;
  color: string;
  colors: StarColors;
  massSolar: number | null;
  physicalRadiusScale: number;
  sceneRadius: number;
  orbit: {
    orbitId: number | null;
    au: number | null;
    sceneRadius: number;
    angle0: number;
    angularVelocity: number;
    center: StarSystemSceneVector;
  };
  habitableZone: SystemStar["habitableZone"];
}

export interface StarSystemOrbitModel extends StarSystemRenderableBase {
  kind: "orbit";
  orbitKind: StarSystemOrbitKind;
  orbitId: number;
  au: number | null;
  zone: BodyZone | null;
  sceneRadius: number;
  angle0: number;
  parentId: string;
  bodyId: string | null;
  source: SystemOrbit | null;
}

export interface StarSystemBodyVisuals {
  sceneRadius: number;
  color: string | null;
  textureKey: string | null;
  hasAtmosphere: boolean;
  hasRings: boolean;
  labelVisible: boolean;
}

export interface StarSystemBodyModel extends StarSystemRenderableBase {
  kind: StarSystemBodyKind;
  source: OrbitBody | UnplacedBody;
  sourceOrbit: SystemOrbit | null;
  orbitId: number | null;
  parentId: string;
  isMainWorld: boolean;
  tradeCodes: string[];
  scene: {
    orbitRadius: number;
    angle0: number;
    position: StarSystemSceneVector | null;
  };
  visuals: StarSystemBodyVisuals;
}

export interface StarSystemWorldModel extends StarSystemBodyModel {
  kind: "world";
  sizeCode: string | null;
  diameterKm: number | null;
  atmosphereCode: string | null;
  hydrographicsCode: string | null;
  surfaceType: string | null;
}

export interface StarSystemGasGiantModel extends StarSystemBodyModel {
  kind: "gasGiant";
  classification: GasGiantType | null;
  diameterMiles: number | null;
  gravity: number | null;
}

export interface StarSystemBeltModel extends StarSystemBodyModel {
  kind: "belt";
}

export type StarSystemRenderableBody =
  | StarSystemWorldModel
  | StarSystemGasGiantModel
  | StarSystemBeltModel;

export interface StarSystemViewModel {
  source: StarSystemViewSource;
  sourceSystem: SystemData | null;
  stars: StarSystemStarModel[];
  orbits: StarSystemOrbitModel[];
  bodies: StarSystemRenderableBody[];
  unplacedBodies: StarSystemRenderableBody[];
  scene: {
    center: StarSystemSceneVector;
    cameraDistance: number;
    outermostOrbitRadius: number;
  };
  counts: {
    stars: number;
    orbits: number;
    bodies: number;
    worlds: number;
    gasGiants: number;
    belts: number;
  };
}
