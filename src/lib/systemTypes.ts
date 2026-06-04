export type DataSource = "derived" | "rolled" | "canonical";

export type StellarClass =
  | "main-sequence"
  | "subgiant"
  | "giant"
  | "bright-giant"
  | "supergiant"
  | "white-dwarf"
  | "brown-dwarf";

export type AtmosphereType =
  | "none"
  | "trace"
  | "very-thin"
  | "thin"
  | "standard"
  | "dense"
  | "exotic"
  | "corrosive"
  | "insidious";

export type SurfaceType =
  | "barren"
  | "desert"
  | "arid"
  | "terran"
  | "ocean"
  | "ice"
  | "exotic"
  | "hellworld";

export type BodyZone = "inner" | "habitable" | "outer";
export type GasGiantType = "SGG" | "LGG" | "IG";

export interface WorldBody {
  kind: "world";
  isMainWorld: boolean;
  isParent?: true;
  dataSource: DataSource;
  name?: string;
  sizeCode: string | null;
  diameterKm: number | null;
  atmosphereCode: string | null;
  atmosphereType: AtmosphereType | null;
  hydrographicsCode: string | null;
  surfaceType: SurfaceType | null;
  tradeCodes: string[];
  axialTilt: null;
  rotationPeriodH: null;
  canonicalTexture: null;
  moons: OrbitBody[];
  hasRings: null;
}

export interface GasGiantBody {
  kind: "gasGiant";
  isMainWorld: false;
  dataSource: DataSource;
  classification: GasGiantType | null;
  sizeCode: string | null;
  diameterMiles: number | null;
  gravity: number | null;
  hasRings: null;
  moons: OrbitBody[];
}

export interface BeltBody {
  kind: "belt";
  isMainWorld: boolean;
  dataSource: DataSource;
  name?: string;
  tradeCodes?: string[];
}

export type OrbitBody = WorldBody | GasGiantBody | BeltBody;

export interface SystemOrbit {
  orbitId: number;
  au: number;
  zone: BodyZone;
  dataSource: DataSource;
  body: OrbitBody;
  angle0: number;
}

export type UnplacedBody =
  | {
      kind: "gasGiant";
      dataSource: DataSource;
      classification: GasGiantType | null;
      hasRings: null;
      moons: [];
    }
  | { kind: "belt"; dataSource: DataSource }
  | {
      kind: "world";
      dataSource: DataSource;
      sizeCode: null;
      diameterKm: null;
      atmosphereCode: null;
      atmosphereType: null;
      hydrographicsCode: null;
      surfaceType: null;
      tradeCodes: [];
      axialTilt: null;
      rotationPeriodH: null;
      canonicalTexture: null;
      moons: [];
      hasRings: null;
    };

export interface SystemStar {
  index: number;
  role: "primary" | "close-companion" | "far-companion";
  spectral: string;
  dataSource: DataSource;
  stellarClass: StellarClass;
  color: string;
  radiusScale: number;
  habitableZone: {
    orbitId: number;
    hz: number;
    innerAU: number;
    outerAU: number;
  } | null;
  orbitId: number | null;
  au: number | null;
  proximity: "close" | "far" | null;
}

export interface SystemData {
  id: string;
  sector: string;
  hex: string;
  name: string;
  dataSource: DataSource;
  stars: SystemStar[];
  orbits: SystemOrbit[];
  companionOrbits: SystemOrbit[];
  unplaced: UnplacedBody[];
  counts: {
    totalWorldsInSystem: number;
    gasGiants: number;
    belts: number;
    otherRockyWorlds: number;
  };
  infrastructure: {
    navalBase: boolean;
    scoutBase: boolean;
    wayStation: boolean;
  };
  travelZone: string | null;
}
