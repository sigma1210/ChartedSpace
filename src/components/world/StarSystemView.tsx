"use client";

import { useMemo, useRef, useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useStore } from "react-redux";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Coins, Globe2, Grid3X3, Map, Navigation, Radar, User } from "lucide-react";
import * as THREE from "three";
import type { World } from "../../types";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { buildSystemLayout, buildLayoutFromSystemData, type SystemLayout, type StarSlot } from "../../lib/stellarSystem";
import { buildWorldPlacements, orbitToScene, seededRng, type WorldPlacement } from "../../lib/orbitData";
import { spectralMass, epochAngle, elapsedDaysAtTurn } from "../../lib/orbitalMechanics";
import {
  buildCloudTextureFromKey,
  AtmosphereGlowMesh,
  CloudShadowMesh,
  WorldGlobeVisual,
  atmosphereGlowConfig,
  cloudConfig,
  PLANET_SPEED,
} from "./PlanetGlobe";
import { isAsteroid, uwpVal } from "../../lib/worldMap";
import { selectSystemDataByKey, selectSystemGeneratedTurnByKey, selectSystemStatusByKey } from "../../store/selectors/system.selectors";
import { getSystemData } from "../../store/slices/systemSlice";
import type { GasGiantType as SystemGasGiantType, SystemData, WorldBody as SystemWorldBody, SystemOrbit } from "../../lib/systemTypes";
import { HudHeader, HudIconButton, HudPanel } from "./HudPrimitives";
import StoreBridge from "../StoreBridge";
import type { AppStore } from "../../store";
import { openSelectedWorldSystemDetail } from "../../store/slices/uiSlice";
import { setHudOffset, setHudPinned, setHudVisible } from "../../store/slices/hudSlice";
import { selectHudLayout, selectHudVisible } from "../../store/selectors/hud.selectors";
import {
  resolveFailedJump,
  runWarpExitSequence,
} from "../../store/slices/jumpNavigationSlice";
import { selectHasStoredJumpDestination } from "../../store/selectors/jumpNavigation.selectors";
import {
  selectActiveWorld,
  selectShipSectorLoadStatus,
} from "../../store/selectors/galaxy.selectors";
import { selectShip, selectShipStatus } from "../../store/selectors/ship.selectors";
import {
  selectShowWarpLayer,
  selectSystemSceneMode,
  selectSystemSceneRenderableLocation,
  selectWarpExitBlankActive,
  selectWarpLayerActive,
  selectWarpLayerOpacity,
} from "../../store/selectors/systemScene.selectors";
import { NavigationHudContent } from "./NavigationHud";
import { CharacterProfileHudContent } from "./CharacterProfileHud";
import { MainWorldHud } from "./MainWorldHud";
import { TradeSystemHudContent } from "./TradeSystemHud";
import { SubsectorMiniMapHudContent } from "../map/SubsectorMiniMap";
import { SectorMiniMapHudContent } from "../map/SectorMiniMap";
import { GalaxyMiniMapHudContent } from "../map/GalaxyMiniMap";

// ─── Shared glow texture ──────────────────────────────────────────────────────

let _glowTex: THREE.CanvasTexture | null = null;
const glowTex = (): THREE.CanvasTexture => {
  if (_glowTex) return _glowTex;
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.3, "rgba(255,255,255,0.30)");
  g.addColorStop(0.7, "rgba(255,255,255,0.05)");
  g.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
};

// ─── Background starfield ─────────────────────────────────────────────────────

const buildStarLayer = ({
  count,
  seed,
  minRadius,
  maxRadius,
  size,
  opacity,
  palette,
}: {
  count: number;
  seed: string;
  minRadius: number;
  maxRadius: number;
  size: number;
  opacity: number;
  palette: string[];
}) => {
  const rng = seededRng(seed);
  const pos = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const r = minRadius + rng() * (maxRadius - minRadius);
    const color = new THREE.Color(palette[Math.floor(rng() * palette.length)]);
    const intensity = 0.55 + rng() * 0.45;

    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    colors[i * 3] = color.r * intensity;
    colors[i * 3 + 1] = color.g * intensity;
    colors[i * 3 + 2] = color.b * intensity;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size,
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
  });

  return new THREE.Points(geo, mat);
};

const buildSpaceHaze = () => {
  const geo = new THREE.SphereGeometry(96, 48, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: "#0e7490",
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
};

const buildBackgroundGlowStars = () => {
  const rng = seededRng("system-starfield-glow-stars");
  const group = new THREE.Group();
  const tex = glowTex();
  const palette = ["#ffffff", "#7ddcff", "#d9f7ff", "#ffd8a8", "#b8c8ff"];

  for (let i = 0; i < 34; i++) {
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const r = 66 + rng() * 34;
    const scale = 0.55 + rng() * 1.25;
    const color = new THREE.Color(palette[Math.floor(rng() * palette.length)]);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      color,
      transparent: true,
      opacity: 0.2 + rng() * 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }));

    sprite.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    );
    sprite.scale.set(scale, scale, 1);
    group.add(sprite);
  }

  return group;
};

const Starfield = () => {
  const obj = useMemo(() => {
    const group = new THREE.Group();
    group.add(buildSpaceHaze());
    group.add(buildBackgroundGlowStars());
    group.add(buildStarLayer({
      count: 4200,
      seed: "system-starfield-dim",
      minRadius: 50,
      maxRadius: 104,
      size: 0.055,
      opacity: 0.72,
      palette: ["#d8f7ff", "#b9d6ff", "#ffffff", "#b8e8ff"],
    }));
    group.add(buildStarLayer({
      count: 1300,
      seed: "system-starfield-mid",
      minRadius: 48,
      maxRadius: 98,
      size: 0.11,
      opacity: 0.9,
      palette: ["#ffffff", "#dff9ff", "#7ddcff", "#ffe3b0"],
    }));
    group.add(buildStarLayer({
      count: 220,
      seed: "system-starfield-bright",
      minRadius: 46,
      maxRadius: 92,
      size: 0.24,
      opacity: 1,
      palette: ["#ffffff", "#67e8f9", "#d7f7ff", "#ffd18a"],
    }));
    return group;
  }, []);

  useEffect(() => () => {
    obj.traverse((child) => {
      if (child instanceof THREE.Points || child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Sprite) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      } else {
        return;
      }
    });
  }, [obj]);

  return <primitive object={obj} />;
};

const sceneLabelClassName =
  "select-none whitespace-nowrap font-mono text-[8px] uppercase leading-none tracking-wider text-(--hud-accent)";
const sceneSecondaryLabelClassName =
  "select-none whitespace-nowrap font-mono text-[8px] uppercase leading-none tracking-wider text-(--hud-text-dim)";
const sceneHoverTagClassName =
  "select-none whitespace-nowrap border border-(--hud-accent)/60 bg-(--hud-bg)/88 px-1.5 py-0.5 font-mono text-[8px] uppercase leading-none tracking-wider text-(--hud-accent) shadow-[0_0_12px_rgba(34,211,238,0.14)] backdrop-blur-sm";
type FocusBodyHandler = (id: string) => void;

// ─── Orbital ring ─────────────────────────────────────────────────────────────

const OrbitalRing = ({ radius, color = "#155e75", opacity = 0.35 }: { radius: number; color?: string; opacity?: number }) => {
  const obj = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.Line(geo, mat);
  }, [radius, color, opacity]);
  return <primitive object={obj} />;
};

const orbitPlaneRotation = (seed: string, orbitNum: number, subtle = false): [number, number, number] => {
  const rng = seededRng(`${seed}:orbit-plane:${orbitNum}`);
  const maxInclination = subtle ? 0.055 : 0.14;
  const inclination = (rng() * 2 - 1) * maxInclination;
  const node = rng() * Math.PI * 2;
  return [inclination, node, 0];
};

const OrbitPlane = ({
  children,
  seed,
  orbitNum,
  subtle = false,
}: {
  children: ReactNode;
  seed: string;
  orbitNum: number;
  subtle?: boolean;
}) => {
  const rotation = useMemo(
    () => orbitPlaneRotation(seed, orbitNum, subtle),
    [orbitNum, seed, subtle],
  );
  return <group rotation={rotation}>{children}</group>;
};

// ─── Pivot smoother ───────────────────────────────────────────────────────────
// Each frame, lerps OrbitControls.target toward the clicked body's world position.

interface ControlsHandle { target: THREE.Vector3; update: () => void }

type PivotSmootherProps = {
  target: THREE.Vector3;
  controlsRef: React.RefObject<ControlsHandle | null>;
};

const PivotSmoother = ({ target, controlsRef }: PivotSmootherProps) => {
  useFrame(() => {
    const ctrl = controlsRef.current;
    if (!ctrl) return;
    ctrl.target.lerp(target, 0.1);
    ctrl.update();
  });
  return null;
};

// ─── Star sphere ──────────────────────────────────────────────────────────────

type StarSphereProps = {
  slot: StarSlot;
  position: [number, number, number];
  onPivot: (pos: THREE.Vector3) => void;
};

const StarSphere = ({ slot, position, onPivot }: StarSphereProps) => {
  const tex   = useMemo(() => glowTex(), []);
  const color = useMemo(() => new THREE.Color(slot.star.colors.glow), [slot.star.colors.glow]);
  const gr    = slot.visualRadius * 4.5;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onPivot(pos);
  };

  return (
    <group position={position}>
      <sprite scale={[gr * 2.4, gr * 2.4, 1]}>
        <spriteMaterial map={tex} color={color} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.35} />
      </sprite>
      <sprite scale={[gr * 1.3, gr * 1.3, 1]}>
        <spriteMaterial map={tex} color={color} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.65} />
      </sprite>
      <mesh onClick={handleClick}>
        <sphereGeometry args={[slot.visualRadius, 32, 32]} />
        <meshBasicMaterial color={slot.star.colors.mid} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ─── Star scenes ─────────────────────────────────────────────────────────────

type SceneProps = {
  layout: SystemLayout;
  onPivot: (pos: THREE.Vector3) => void;
  companionChildren?: React.ReactNode;
  epochAngles?: { inner: number; outer: number };
};

const SingleScene = ({ layout, onPivot }: SceneProps) => (
  <StarSphere slot={layout.slots[0]} position={[0, 0, 0]} onPivot={onPivot} />
);

const BinaryScene = ({ layout, onPivot, companionChildren, epochAngles }: SceneProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [sA, sB] = layout.slots;
  useEffect(() => { if (groupRef.current) groupRef.current.rotation.y = epochAngles?.outer ?? 0; }, []);
  return (
    <>
      <OrbitalRing radius={sA.orbitRadius} />
      <OrbitalRing radius={sB.orbitRadius} />
      <group ref={groupRef}>
        <StarSphere slot={sA} position={[ sA.orbitRadius, 0, 0]} onPivot={onPivot} />
        <StarSphere slot={sB} position={[-sB.orbitRadius, 0, 0]} onPivot={onPivot} />
        {companionChildren && (
          <group position={[-sB.orbitRadius, 0, 0]}>
            {companionChildren}
          </group>
        )}
      </group>
    </>
  );
};

const TrinaryScene = ({ layout, onPivot, companionChildren, epochAngles }: SceneProps) => {
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const [sA, sB, sC] = layout.slots;
  useEffect(() => {
    if (outerRef.current) outerRef.current.rotation.y = epochAngles?.outer ?? 0;
    if (innerRef.current) innerRef.current.rotation.y = epochAngles?.inner ?? 0;
  }, []);
  return (
    <>
      <OrbitalRing radius={layout.innerBinaryRadius} />
      <OrbitalRing radius={layout.companionRadius} />
      <group ref={outerRef}>
        <group position={[layout.innerBinaryRadius, 0, 0]}>
          <group ref={innerRef}>
            <StarSphere slot={sA} position={[ sA.orbitRadius, 0, 0]} onPivot={onPivot} />
            <StarSphere slot={sB} position={[-sB.orbitRadius, 0, 0]} onPivot={onPivot} />
          </group>
        </group>
        <StarSphere slot={sC} position={[-layout.companionRadius, 0, 0]} onPivot={onPivot} />
        {companionChildren && (
          <group position={[-layout.companionRadius, 0, 0]}>
            {companionChildren}
          </group>
        )}
      </group>
    </>
  );
};

const SystemScene = ({ layout, onPivot, companionChildren, epochAngles }: SceneProps) => {
  if (layout.type === "single")  return <SingleScene  layout={layout} onPivot={onPivot} />;
  if (layout.type === "binary")  return <BinaryScene  layout={layout} onPivot={onPivot} companionChildren={companionChildren} epochAngles={epochAngles} />;
  return                                <TrinaryScene layout={layout} onPivot={onPivot} companionChildren={companionChildren} epochAngles={epochAngles} />;
};

// ─── World body (orbiting planet) ────────────────────────────────────────────

const WORLD_R = 0.1;
const WORLD_SEGMENTS: [number, number] = [64, 32];

type WorldBodyProps = {
  placement: WorldPlacement;
  world: World;
  onPivot: (pos: THREE.Vector3) => void;
  bodyId?: string;
  focusedBodyId?: string | null;
  onFocusBody?: FocusBodyHandler;
};

const WorldBody = ({ placement, world, onPivot, bodyId = `main-${placement.orbitNum}-${world.hex}`, focusedBodyId = null, onFocusBody }: WorldBodyProps) => {
  const orbitRef = useRef<THREE.Group>(null);
  const r        = placement.sceneRadius;

  useEffect(() => { if (orbitRef.current) orbitRef.current.rotation.y = placement.angle0; }, []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onFocusBody?.(bodyId);
    onPivot(pos);
  };

  return (
    <OrbitPlane seed={`world:${world.hex}:${bodyId}`} orbitNum={placement.orbitNum} subtle={placement.type === "mainWorld"}>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.5} />
      <group ref={orbitRef}>
        <group position={[r, 0, 0]}>
          <WorldGlobeVisual
            world={world}
            radius={WORLD_R}
            segments={WORLD_SEGMENTS}
            onSurfaceClick={handleClick}
          />
          {focusedBodyId === bodyId && (
            <Html position={[WORLD_R + 0.1, WORLD_R + 0.12, 0]} style={{ pointerEvents: "none" }}>
              <span className={sceneHoverTagClassName}>Main World</span>
            </Html>
          )}
        </group>
        <Html position={[r + 0.15, 0.15, 0]} style={{ pointerEvents: "none" }}>
          <span className={sceneLabelClassName}>
            {placement.label}
          </span>
        </Html>
      </group>
    </OrbitPlane>
  );
};

// ─── Placed world body (non-main world from SystemData) ──────────────────────
// Renders a placed non-main world using surface type for colour. No World object
// available so no Voronoi texture — a flat material is honest about what we know.

const SURFACE_COLOR: Record<string, string> = {
  barren: "#78716c", vacuum: "#4b5563", desert: "#a16207",
  arid: "#8b6f56",   terran: "#256f5a", ocean: "#1d4ed8",
  ice: "#bfdbfe",    exotic: "#6d5aa8", corrosive: "#8a6a2f",
  insidious: "#7f1d1d", hellworld: "#991b1b",
};

const worldRadiusFromSizeCode = (sizeCode: string | null | undefined, fallback = WORLD_R) => {
  const size = sizeCode ? uwpVal(sizeCode) : 5;
  return THREE.MathUtils.clamp(fallback * (0.72 + size * 0.065), fallback * 0.68, fallback * 1.32);
};

const PlacedWorldBody = ({
  orbit,
  onPivot,
  bodyId,
  focusedBodyId = null,
  onFocusBody,
}: {
  orbit: SystemOrbit;
  onPivot: (p: THREE.Vector3) => void;
  bodyId: string;
  focusedBodyId?: string | null;
  onFocusBody?: FocusBodyHandler;
}) => {
  const body = orbit.body as SystemWorldBody;
  const orbitRef = useRef<THREE.Group>(null);
  const cloudRefs = useRef<Array<THREE.Mesh | null>>([]);
  const [hovered, setHovered] = useState(false);
  const r     = orbitToScene(orbit.orbitId);
  const color = SURFACE_COLOR[body.surfaceType ?? "barren"] ?? "#6b7280";
  const radius = worldRadiusFromSizeCode(body.sizeCode);
  const atmoVal = uwpVal(body.atmosphereCode ?? "0");
  const hydroVal = uwpVal(body.hydrographicsCode ?? "0");
  const clouds = useMemo(() => cloudConfig(atmoVal, hydroVal), [atmoVal, hydroVal]);
  const atmosphereGlow = useMemo(() => atmosphereGlowConfig(atmoVal), [atmoVal]);
  const cloudTextures = useMemo(
    () => clouds
      ? clouds.layers.map((layer) => buildCloudTextureFromKey(
        `${orbit.orbitId}:${body.name ?? "world"}:${body.sizeCode ?? "x"}:${body.atmosphereCode ?? "0"}:${body.hydrographicsCode ?? "0"}`,
        clouds,
        layer,
      ))
      : [],
    [body.atmosphereCode, body.hydrographicsCode, body.name, body.sizeCode, clouds, orbit.orbitId],
  );
  useEffect(
    () => () => cloudTextures.forEach((cloudTexture) => cloudTexture.dispose()),
    [cloudTextures],
  );

  useEffect(() => { if (orbitRef.current) orbitRef.current.rotation.y = orbit.angle0; }, []);

  useFrame((_, dt) => {
    if (clouds) {
      clouds.layers.forEach((layer, index) => {
        const cloudRef = cloudRefs.current[index];
        if (cloudRef) cloudRef.rotation.y += dt * PLANET_SPEED * layer.speedMult;
      });
    }
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onFocusBody?.(bodyId);
    onPivot(pos);
  };

  return (
    <OrbitPlane seed={`placed-world:${bodyId}`} orbitNum={orbit.orbitId}>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.5} />
      <group ref={orbitRef}>
        <group position={[r, 0, 0]}>
          <mesh onClick={handleClick}>
            <sphereGeometry args={[radius, 24, 16]} />
            <meshStandardMaterial
              color={color}
              roughness={0.84}
              emissive={body.surfaceType === "hellworld" || body.surfaceType === "exotic" ? color : "#000000"}
              emissiveIntensity={body.surfaceType === "hellworld" ? 0.18 : body.surfaceType === "exotic" ? 0.1 : 0}
            />
          </mesh>
          {clouds && cloudTextures[0] && (
            <CloudShadowMesh
              radius={radius}
              layer={clouds.layers[0]}
              texture={cloudTextures[0]}
              opacity={clouds.shadowOpacity}
            />
          )}
          {clouds && (
            <>
              {clouds.layers.map((layer, index) => (
                <mesh
                  key={`${layer.radiusMult}-${index}`}
                  ref={(node) => { cloudRefs.current[index] = node; }}
                >
                  <sphereGeometry args={[radius * layer.radiusMult, 24, 16]} />
                  <meshStandardMaterial
                    alphaMap={cloudTextures[index]}
                    color={layer.color}
                    transparent
                    opacity={layer.opacity}
                    depthWrite={false}
                    alphaTest={0.015}
                  />
                </mesh>
              ))}
            </>
          )}
          {atmosphereGlow && <AtmosphereGlowMesh radius={radius} config={atmosphereGlow} />}
          {hovered && (
            <Html position={[radius + 0.08, radius + 0.08, 0]} style={{ pointerEvents: "none" }}>
              <span className={sceneHoverTagClassName}>
                {body.surfaceType ?? "world"}
              </span>
            </Html>
          )}
          {focusedBodyId === bodyId && (
            <Html position={[radius + 0.1, radius + 0.16, 0]} style={{ pointerEvents: "none" }}>
              <span className={sceneHoverTagClassName}>
                {body.name ?? body.surfaceType ?? "World"}
              </span>
            </Html>
          )}
        </group>
        <mesh
          position={[r, 0, 0]}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            setHovered(false);
          }}
          onClick={handleClick}
        >
          <sphereGeometry args={[Math.max(radius * 1.8, 0.18), 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {body.name && (
          <Html position={[r + 0.15, 0.15, 0]} style={{ pointerEvents: "none" }}>
            <span className={sceneLabelClassName}>{body.name}</span>
          </Html>
        )}
      </group>
    </OrbitPlane>
  );
};

// ─── Rocky parent body (bigworld hosting main world as a moon) ───────────────

const RockyParentBody = ({
  orbit, world, onPivot,
}: {
  orbit: SystemOrbit;
  world: World;
  onPivot: (p: THREE.Vector3) => void;
}) => {
  const orbitRef = useRef<THREE.Group>(null);
  const r = orbitToScene(orbit.orbitId);
  const moonPlacement = useMemo((): WorldPlacement => ({
    type: "mainWorld", orbitNum: 1, sceneRadius: 0.45, angle0: 0, label: world.name,
  }), [world.name]);

  useEffect(() => { if (orbitRef.current) orbitRef.current.rotation.y = orbit.angle0; }, []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onPivot(pos);
  };

  return (
    <OrbitPlane seed={`rocky-parent:${world.hex}:${orbit.orbitId}`} orbitNum={orbit.orbitId}>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.5} />
      <group ref={orbitRef}>
        <group position={[r, 0, 0]}>
          <mesh onClick={handleClick}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
          <WorldBody placement={moonPlacement} world={world} onPivot={onPivot} />
        </group>
      </group>
    </OrbitPlane>
  );
};

// ─── Gas giant classification ─────────────────────────────────────────────────

type GasGiantVisualType = 'hot' | 'jovian' | 'saturn' | 'ice';

const ggType = (orbitNum: number): GasGiantVisualType => {
  if (orbitNum <= 3) return 'hot';
  if (orbitNum <= 7) return 'jovian';
  return 'ice';
};

const visualGasGiantType = (
  orbitNum: number,
  classification?: SystemGasGiantType | null,
): GasGiantVisualType => {
  if (classification === "IG") return "ice";
  if (classification === "SGG") return "saturn";
  if (classification === "LGG") return orbitNum <= 3 ? "hot" : "jovian";
  return ggType(orbitNum);
};

// ─── Procedural banded texture (hot Jupiters / ice giants) ───────────────────

const HOT_BANDS  = ['#7c2d12', '#b45309', '#d97706', '#1e3a8a', '#0f172a', '#f59e0b'];
const JOVIAN_BANDS = ['#8a5b35', '#d8b384', '#6f4a2e', '#ead4aa', '#a66b39', '#f2dfc1'];
const SATURN_BANDS = ['#8b7350', '#d8c298', '#6f6044', '#efe1bd', '#b69a6a', '#f5e9cd'];
const ICE_BANDS  = ['#0f3b4a', '#155e75', '#0891b2', '#67e8f9', '#164e63', '#a5f3fc'];
const JOVIAN_RING_BANDS = ['#2f2419', '#8a7356', '#d7c19a', '#f1e2c3', '#9d825d', '#443322'];
const ICE_RING_BANDS = ['#071b24', '#1f6f86', '#8de8f7', '#d6fbff', '#2d91a8', '#092f3d'];

const colorToRgb = (color: string) => new THREE.Color(color);

const mixBandColor = (colors: string[], value: number) => {
  const scaled = THREE.MathUtils.clamp(value, 0, 0.999) * (colors.length - 1);
  const index = Math.floor(scaled);
  const mix = scaled - index;
  const a = colorToRgb(colors[index]);
  const b = colorToRgb(colors[Math.min(colors.length - 1, index + 1)]);
  return a.lerp(b, mix);
};

const buildGasGiantTex = (colors: string[], seed: number): THREE.CanvasTexture => {
  const W = 768, H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(W, H);
  const data = image.data;
  const seedA = seed * 1.73 + 0.31;
  const seedB = seed * 2.41 + 1.19;

  for (let y = 0; y < H; y++) {
    const lat = y / (H - 1);
    const band =
      Math.sin(lat * Math.PI * 18 + seedA) * 0.18 +
      Math.sin(lat * Math.PI * 7 + seedB) * 0.16 +
      Math.sin(lat * Math.PI * 35 + seed * 0.77) * 0.06;

    for (let x = 0; x < W; x++) {
      const lon = x / W;
      const shear = Math.sin(lat * Math.PI * 12 + seed) * 0.035;
      const turbulence =
        Math.sin((lon + shear) * Math.PI * 20 + lat * Math.PI * 5 + seedA) * 0.055 +
        Math.sin((lon - shear) * Math.PI * 43 - lat * Math.PI * 9 + seedB) * 0.035 +
        Math.sin((lon + lat * 0.35) * Math.PI * 82 + seed * 4.1) * 0.015;
      const storm =
        Math.sin((lon * 2.4 + seed * 0.17) * Math.PI * 2) *
        Math.exp(-Math.pow((lat - (0.38 + Math.sin(seed) * 0.08)) * 16, 2)) * 0.07;
      const value = THREE.MathUtils.clamp(0.5 + band + turbulence + storm, 0, 1);
      const shade = 0.9 + Math.sin(lat * Math.PI * 46 + turbulence * 12) * 0.045;
      const color = mixBandColor(colors, value);
      const i = (y * W + x) * 4;

      data[i] = Math.round(color.r * 255 * shade);
      data[i + 1] = Math.round(color.g * 255 * shade);
      data[i + 2] = Math.round(color.b * 255 * shade);
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
};

const buildGasGiantRingTex = (colors: string[], seed: number): THREE.CanvasTexture => {
  const W = 768, H = 96;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(W, H);
  const data = image.data;

  for (let x = 0; x < W; x++) {
    const radial = x / (W - 1);
    const band =
      Math.sin(radial * Math.PI * 18 + seed * 1.7) * 0.2 +
      Math.sin(radial * Math.PI * 51 + seed * 0.6) * 0.08 +
      Math.sin(radial * Math.PI * 127 + seed * 2.2) * 0.035;
    const gapA = Math.exp(-Math.pow((radial - (0.36 + Math.sin(seed) * 0.06)) * 48, 2));
    const gapB = Math.exp(-Math.pow((radial - (0.67 + Math.cos(seed) * 0.04)) * 70, 2));
    const edgeFade = Math.sin(Math.PI * radial);
    const alpha = THREE.MathUtils.clamp((0.42 + band) * edgeFade - gapA * 0.34 - gapB * 0.22, 0, 0.72);
    const color = mixBandColor(colors, THREE.MathUtils.clamp(0.52 + band * 1.8, 0, 1));

    for (let y = 0; y < H; y++) {
      const grain = 0.93 + Math.sin((x * 13.1 + y * 7.7 + seed * 31) * 0.08) * 0.035;
      const i = (y * W + x) * 4;
      data[i] = Math.round(color.r * 255 * grain);
      data[i + 1] = Math.round(color.g * 255 * grain);
      data[i + 2] = Math.round(color.b * 255 * grain);
      data[i + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
};

// ─── Saturn ring geometry with correct UVs ────────────────────────────────────
// RingGeometry UVs are angular by default; remap them radially so the ring
// texture maps from inner edge (u=0) to outer edge (u=1).

const buildRingGeo = (inner: number, outer: number): THREE.BufferGeometry => {
  const geo = new THREE.RingGeometry(inner, outer, 128);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv  = geo.attributes.uv as THREE.BufferAttribute;
  const v   = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 1);
  }
  uv.needsUpdate = true;
  return geo;
};

// ─── Gas giant body ───────────────────────────────────────────────────────────

type GasGiantBodyProps = {
  placement: WorldPlacement;
  idx: number;
  onPivot: (pos: THREE.Vector3) => void;
  world?: World;
  classification?: SystemGasGiantType | null;
  bodyId?: string;
  focusedBodyId?: string | null;
  onFocusBody?: FocusBodyHandler;
};

const GasGiantBody = ({ placement, idx, onPivot, world, classification = null, bodyId = `gas-${placement.orbitNum}-${idx}`, focusedBodyId = null, onFocusBody }: GasGiantBodyProps) => {
  const ref   = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const hazeRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const r     = placement.sceneRadius;
  const type  = visualGasGiantType(placement.orbitNum, classification);

  useEffect(() => { if (ref.current) ref.current.rotation.y = placement.angle0; }, []);
  useFrame((_, delta) => {
    if (sphereRef.current) sphereRef.current.rotation.y += delta * (type === 'hot' ? 0.16 : type === 'ice' ? 0.08 : 0.11);
    if (hazeRef.current) hazeRef.current.rotation.y -= delta * (type === 'hot' ? 0.08 : 0.045);
  });

  // Ringed giants are common, but not universal; the pattern stays deterministic per system.
  const hasRing = type !== 'hot' && (type === 'saturn' || (type === 'jovian' && idx % 3 === 0) || (type === 'ice' && idx % 2 === 0));
  const radius  = type === 'hot' ? 0.22 : type === 'jovian' ? 0.22 : type === 'saturn' ? 0.19 : 0.17;
  const seed = idx + placement.orbitNum * 0.27;

  const sphereTex = useMemo(() => {
    if (hasRing)          return buildGasGiantTex(SATURN_BANDS, seed);
    if (type === 'jovian') return buildGasGiantTex(JOVIAN_BANDS, seed);
    return buildGasGiantTex(type === 'hot' ? HOT_BANDS : ICE_BANDS, seed);
  }, [type, hasRing, seed]);
  useEffect(() => () => sphereTex.dispose(), [sphereTex]);

  const ringGeo = useMemo(
    () => hasRing ? buildRingGeo(radius * 1.35, radius * (type === 'ice' ? 2.35 : type === 'saturn' ? 2.85 : 2.55)) : null,
    [hasRing, radius, type],
  );
  useEffect(() => () => ringGeo?.dispose(), [ringGeo]);

  const ringShadowGeo = useMemo(
    () => hasRing ? new THREE.TorusGeometry(radius * 1.018, radius * 0.012, 6, 96) : null,
    [hasRing, radius],
  );
  useEffect(() => () => ringShadowGeo?.dispose(), [ringShadowGeo]);

  const ringTexture = useMemo(
    () => hasRing ? buildGasGiantRingTex(type === 'ice' ? ICE_RING_BANDS : JOVIAN_RING_BANDS, seed) : null,
    [hasRing, seed, type],
  );
  useEffect(() => () => ringTexture?.dispose(), [ringTexture]);

  const ringRotation = useMemo(
    (): [number, number, number] => [
      Math.PI / (2.55 + Math.sin(seed * 1.7) * 0.32),
      Math.sin(seed * 2.3) * 0.18,
      Math.cos(seed * 1.9) * 0.7,
    ],
    [seed],
  );

  const moonPlacement = useMemo((): WorldPlacement | null => {
    if (!placement.satellite || !world) return null;
    return { type: "mainWorld", orbitNum: 1, sceneRadius: placement.satellite.moonRadius, angle0: 0, label: world.name };
  }, [placement.satellite, world]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onFocusBody?.(bodyId);
    onPivot(pos);
  };

  return (
    <OrbitPlane seed={`gas-giant:${bodyId}`} orbitNum={placement.orbitNum}>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.4} />
      <group ref={ref}>
        <group position={[r, 0, 0]}>
          <mesh
            ref={sphereRef}
            onClick={handleClick}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHovered(true);
            }}
            onPointerOut={(event) => {
              event.stopPropagation();
              setHovered(false);
            }}
          >
            <sphereGeometry args={[radius, 48, 32]} />
            <meshStandardMaterial
              map={sphereTex}
              roughness={0.78}
              metalness={0}
              emissive={type === 'hot' ? "#2a0f12" : type === 'ice' ? "#062f3b" : "#1f160e"}
              emissiveIntensity={type === 'hot' ? 0.28 : 0.12}
            />
          </mesh>
          {hovered && (
            <Html position={[radius + 0.08, radius + 0.08, 0]} style={{ pointerEvents: "none" }}>
              <span className={sceneHoverTagClassName}>
                {classification ?? type}
              </span>
            </Html>
          )}
          {focusedBodyId === bodyId && (
            <Html position={[radius + 0.1, radius + 0.16, 0]} style={{ pointerEvents: "none" }}>
              <span className={sceneHoverTagClassName}>
                {classification ?? type}
              </span>
            </Html>
          )}
          <mesh ref={hazeRef}>
            <sphereGeometry args={[radius * 1.012, 48, 24]} />
            <meshBasicMaterial
              color={type === 'hot' ? "#f59e0b" : type === 'ice' ? "#67e8f9" : "#f5deb3"}
              transparent
              opacity={type === 'hot' ? 0.16 : 0.1}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {hasRing && ringGeo && ringTexture && (
            <>
              <mesh geometry={ringGeo} rotation={ringRotation}>
                <meshStandardMaterial
                  map={ringTexture}
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.9}
                  roughness={0.86}
                  metalness={0}
                  emissive={type === 'ice' ? "#164e63" : "#6b5a3d"}
                  emissiveIntensity={0.09}
                  depthWrite={false}
                />
              </mesh>
              {ringShadowGeo && (
                <mesh geometry={ringShadowGeo} rotation={ringRotation}>
                  <meshBasicMaterial
                    color="#02040a"
                    transparent
                    opacity={0.22}
                    depthWrite={false}
                  />
                </mesh>
              )}
            </>
          )}
          {moonPlacement && world && (
            <WorldBody placement={moonPlacement} world={world} onPivot={onPivot} />
          )}
        </group>
      </group>
    </OrbitPlane>
  );
};

// ─── Asteroid belt ────────────────────────────────────────────────────────────

const AsteroidBeltBody = ({
  placement,
  onPivot,
  bodyId = `belt-${placement.orbitNum}-${placement.isMainWorld ? "main" : "ordinary"}`,
  focusedBodyId = null,
  onFocusBody,
}: {
  placement: WorldPlacement;
  onPivot: (pos: THREE.Vector3) => void;
  bodyId?: string;
  focusedBodyId?: string | null;
  onFocusBody?: FocusBodyHandler;
}) => {
  const beltRef = useRef<THREE.Group>(null);
  const rocksRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState(false);
  const isMainWorldBelt = placement.isMainWorld === true;
  const clusterPosition = useMemo(
    () => new THREE.Vector3(placement.sceneRadius, 0.04, 0),
    [placement.sceneRadius],
  );
  const dust = useMemo(() => {
    const r = placement.sceneRadius;
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: isMainWorldBelt ? "#a8a29e" : "#78716c",
      transparent: true,
      opacity: isMainWorldBelt ? 0.2 : 0.12,
      depthWrite: false,
    });
    const inner = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 3, 160), mat);
    const outer = new THREE.Mesh(new THREE.TorusGeometry(r * 1.035, 0.04, 3, 160), mat.clone());
    inner.rotation.x = Math.PI / 2;
    outer.rotation.x = Math.PI / 2;
    group.add(inner, outer);
    return group;
  }, [isMainWorldBelt, placement.sceneRadius]);

  const rockData = useMemo(() => {
    const rng = seededRng(`${placement.label ?? "belt"}:${placement.orbitNum}:${placement.sceneRadius}:${isMainWorldBelt ? "main" : "ordinary"}`);
    const count = isMainWorldBelt ? 170 : 110;
    return Array.from({ length: count }, () => {
      const angle = rng() * Math.PI * 2;
      const radialJitter = (rng() - 0.5) * 0.55;
      const radius = placement.sceneRadius + radialJitter;
      const y = (rng() - 0.5) * (isMainWorldBelt ? 0.18 : 0.11);
      const scale = (isMainWorldBelt ? 0.028 : 0.02) * (0.55 + rng() * 1.25);
      return {
        position: new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius),
        rotation: new THREE.Euler(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI),
        scale,
      };
    });
  }, [isMainWorldBelt, placement.label, placement.orbitNum, placement.sceneRadius]);

  useEffect(() => {
    const mesh = rocksRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    rockData.forEach((rock, index) => {
      quaternion.setFromEuler(rock.rotation);
      scale.setScalar(rock.scale);
      matrix.compose(rock.position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [rockData]);

  useFrame((_, delta) => {
    if (beltRef.current) beltRef.current.rotation.y += delta * (isMainWorldBelt ? 0.006 : 0.0035);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onFocusBody?.(bodyId);
    onPivot(pos);
  };

  useEffect(() => () => {
    dust.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((material) => material.dispose());
        else obj.material.dispose();
      }
    });
  }, [dust]);

  return (
    <OrbitPlane seed={`belt:${bodyId}`} orbitNum={placement.orbitNum}>
      <OrbitalRing radius={placement.sceneRadius} color="#3f3f46" opacity={isMainWorldBelt ? 0.24 : 0.14} />
      <group
        ref={beltRef}
        onClick={handleClick}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
      >
        <primitive object={dust} />
        <instancedMesh ref={rocksRef} args={[undefined, undefined, rockData.length]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={isMainWorldBelt ? "#a8a29e" : "#78716c"}
            roughness={0.92}
            metalness={0.02}
            emissive={isMainWorldBelt ? "#1c1917" : "#0c0a09"}
            emissiveIntensity={0.08}
          />
        </instancedMesh>
        {isMainWorldBelt && (
          <group position={clusterPosition} onClick={handleClick}>
            <mesh>
              <sphereGeometry args={[0.055, 12, 8]} />
              <meshStandardMaterial
                color="#d6d3d1"
                roughness={0.82}
                emissive="#164e63"
                emissiveIntensity={0.22}
              />
            </mesh>
            <mesh position={[0.09, 0.015, 0.02]} rotation={[0.35, 0.2, 0.15]}>
              <boxGeometry args={[0.12, 0.035, 0.045]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.68} metalness={0.18} emissive="#0f172a" emissiveIntensity={0.18} />
            </mesh>
            <mesh position={[-0.08, -0.01, -0.025]} rotation={[0.1, -0.4, -0.25]}>
              <boxGeometry args={[0.09, 0.03, 0.04]} />
              <meshStandardMaterial color="#64748b" roughness={0.72} metalness={0.16} emissive="#0f172a" emissiveIntensity={0.14} />
            </mesh>
            <mesh position={[0.02, 0.065, -0.055]} rotation={[0.4, 0.7, 0.2]}>
              <dodecahedronGeometry args={[0.045, 0]} />
              <meshStandardMaterial color="#78716c" roughness={0.9} emissive="#1c1917" emissiveIntensity={0.12} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.15, 0.004, 4, 48]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.28} depthWrite={false} />
            </mesh>
          </group>
        )}
      </group>
      {hovered && (
        <Html position={[placement.sceneRadius + 0.08, 0.28, 0]} style={{ pointerEvents: "none" }}>
          <span className={sceneHoverTagClassName}>
            {isMainWorldBelt ? "Main Belt" : "Asteroid Belt"}
          </span>
        </Html>
      )}
      {focusedBodyId === bodyId && (
        <Html position={[placement.sceneRadius + 0.12, 0.38, 0]} style={{ pointerEvents: "none" }}>
          <span className={sceneHoverTagClassName}>
            {placement.label ?? (isMainWorldBelt ? "Main Belt" : "Asteroid Belt")}
          </span>
        </Html>
      )}
      {placement.label && (
        <Html position={isMainWorldBelt ? clusterPosition.clone().add(new THREE.Vector3(0.16, 0.13, 0)) : [placement.sceneRadius + 0.2, 0.15, 0]} style={{ pointerEvents: "none" }}>
          <span className={sceneSecondaryLabelClassName}>
            {placement.label}
          </span>
        </Html>
      )}
    </OrbitPlane>
  );
};

// ─── Other worlds (small dots) ────────────────────────────────────────────────

const OtherWorld = ({
  placement,
  onPivot,
  bodyId = `other-${placement.orbitNum}-${placement.sceneRadius}`,
  focusedBodyId = null,
  onFocusBody,
}: {
  placement: WorldPlacement;
  onPivot: (pos: THREE.Vector3) => void;
  bodyId?: string;
  focusedBodyId?: string | null;
  onFocusBody?: FocusBodyHandler;
}) => {
  const ref   = useRef<THREE.Group>(null);
  const r     = placement.sceneRadius;
  const [hovered, setHovered] = useState(false);
  const visual = useMemo(() => {
    const rng = seededRng(`${placement.orbitNum}:${placement.sceneRadius}:other-world`);
    const palette = [
      { color: "#78716c", emissive: "#0c0a09", radius: 0.062 },
      { color: "#8b6f56", emissive: "#120f0a", radius: 0.068 },
      { color: "#bfdbfe", emissive: "#082f49", radius: 0.058 },
      { color: "#1d4ed8", emissive: "#061a3a", radius: 0.064 },
      { color: "#7f1d1d", emissive: "#1f0505", radius: 0.056 },
    ];
    return palette[Math.floor(rng() * palette.length)] ?? palette[0];
  }, [placement.orbitNum, placement.sceneRadius]);

  useEffect(() => { if (ref.current) ref.current.rotation.y = placement.angle0; }, []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onFocusBody?.(bodyId);
    onPivot(pos);
  };

  return (
    <OrbitPlane seed={`other-world:${bodyId}`} orbitNum={placement.orbitNum}>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.25} />
      <group ref={ref}>
        <mesh
          position={[r, 0, 0]}
          onClick={handleClick}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            setHovered(false);
          }}
        >
          <icosahedronGeometry args={[visual.radius, 1]} />
          <meshStandardMaterial
            color={visual.color}
            roughness={0.88}
            emissive={visual.emissive}
            emissiveIntensity={0.08}
          />
        </mesh>
        {hovered && (
          <Html position={[r + 0.11, 0.12, 0]} style={{ pointerEvents: "none" }}>
            <span className={sceneHoverTagClassName}>World</span>
          </Html>
        )}
        {focusedBodyId === bodyId && (
          <Html position={[r + 0.13, 0.2, 0]} style={{ pointerEvents: "none" }}>
            <span className={sceneHoverTagClassName}>World</span>
          </Html>
        )}
      </group>
    </OrbitPlane>
  );
};

// ─── Companion bodies (orbiting the far companion star) ──────────────────────
// Rendered inside the companion's animated group in BinaryScene/TrinaryScene,
// so they move with the companion rather than orbiting the primary.

const CompanionBodies = ({
  orbits, onPivot, focusedBodyId, onFocusBody,
}: {
  orbits: SystemOrbit[];
  onPivot: (p: THREE.Vector3) => void;
  focusedBodyId?: string | null;
  onFocusBody?: FocusBodyHandler;
}) => {
  let ggIdx = 0;
  return (
    <>
      {orbits.map((orbit, i) => {
        const b = orbit.body;
        if (b.kind === "gasGiant") {
          const p: WorldPlacement = { type: "gasGiant", orbitNum: orbit.orbitId, sceneRadius: orbitToScene(orbit.orbitId), angle0: orbit.angle0 };
          const bodyId = `companion-gas-${orbit.orbitId}-${i}`;
          return <GasGiantBody key={i} placement={p} idx={ggIdx++} onPivot={onPivot} classification={b.classification} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
        }
        if (b.kind === "belt") {
          const p: WorldPlacement = {
            type: "belt",
            orbitNum: orbit.orbitId,
            sceneRadius: orbitToScene(orbit.orbitId),
            angle0: orbit.angle0,
            label: b.name,
            isMainWorld: b.isMainWorld,
          };
          const bodyId = `companion-belt-${orbit.orbitId}-${i}`;
          return <AsteroidBeltBody key={i} placement={p} onPivot={onPivot} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
        }
        const bodyId = `companion-world-${orbit.orbitId}-${i}`;
        return <OtherWorld key={i} placement={{ type: "otherWorld", orbitNum: orbit.orbitId, sceneRadius: orbitToScene(orbit.orbitId), angle0: orbit.angle0 }} onPivot={onPivot} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      })}
    </>
  );
};

// ─── World system layer (all bodies) ─────────────────────────────────────────
// Placed bodies render directly from SystemData.orbits[] using orbit.orbitId for
// position. Unplaced bodies are scattered procedurally — their orbit is unknown.

type WorldSystemProps = {
  world: World;
  onPivot: (pos: THREE.Vector3) => void;
  systemData: SystemData | null;
  focusedBodyId?: string | null;
  onFocusBody?: FocusBodyHandler;
};

const WorldSystem = ({ world, onPivot, systemData, focusedBodyId = null, onFocusBody }: WorldSystemProps) => {
  const useData = !!(systemData && systemData.hex === world.hex);

  // ── Placed bodies (data-driven) ────────────────────────────────────────────
  const placedElements = useMemo(() => {
    if (!useData || !systemData) return null;
    let ggIdx = 0;
    return systemData.orbits.map((orbit, i) => {
      const b = orbit.body;
      if (b.kind === "gasGiant") {
        const hasMainMoon = b.moons.some(m => m.kind === "world" && m.isMainWorld);
        const placement: WorldPlacement = {
          type: "gasGiant", orbitNum: orbit.orbitId,
          sceneRadius: orbitToScene(orbit.orbitId), angle0: orbit.angle0,
          ...(hasMainMoon ? { satellite: { moonRadius: 0.5 } } : {}),
        };
        const bodyId = `gas-${orbit.orbitId}-${i}`;
        return <GasGiantBody key={i} placement={placement} idx={ggIdx++} onPivot={onPivot} world={hasMainMoon ? world : undefined} classification={b.classification} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      }
      if (b.kind === "belt") {
        const placement: WorldPlacement = {
          type: "belt",
          orbitNum: orbit.orbitId,
          sceneRadius: orbitToScene(orbit.orbitId),
          angle0: orbit.angle0,
          label: b.name,
          isMainWorld: b.isMainWorld,
        };
        const bodyId = `belt-${orbit.orbitId}-${i}`;
        return <AsteroidBeltBody key={i} placement={placement} onPivot={onPivot} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      }
      if (b.kind === "world" && b.isMainWorld) {
        const placement: WorldPlacement = { type: "mainWorld", orbitNum: orbit.orbitId, sceneRadius: orbitToScene(orbit.orbitId), angle0: orbit.angle0, label: world.name };
        const bodyId = `main-${orbit.orbitId}-${world.hex}`;
        return <WorldBody key={i} placement={placement} world={world} onPivot={onPivot} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      }
      // Rocky parent (bigworld) hosting main world as a moon — isSatellite + no gas giants
      if (b.kind === "world" && b.isParent) {
        return <RockyParentBody key={i} orbit={orbit} world={world} onPivot={onPivot} />;
      }
      // Non-main placed world — render from body data
      const bodyId = `world-${orbit.orbitId}-${i}`;
      return <PlacedWorldBody key={i} orbit={orbit} onPivot={onPivot} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedBodyId, onFocusBody, useData, systemData, world, onPivot]);

  // ── Unplaced bodies (procedural scatter) ───────────────────────────────────
  const unplacedElements = useMemo(() => {
    if (!useData || !systemData) return null;
    const rng        = seededRng(`${world.hex}:unplaced`);
    const used       = new Set(systemData.orbits.map(o => o.orbitId));
    const mainOrbit  = systemData.orbits[0]?.orbitId ?? 3;
    const place      = (c: number) => { let o = Math.max(1, c); while (used.has(o)) o++; used.add(o); return o; };
    let ggOffset = 2, otherOffset = 1, ggIdx = systemData.orbits.filter(o => o.body.kind === "gasGiant").length;

    return systemData.unplaced.map((body, i) => {
      if (body.kind === "gasGiant") {
        const orbitNum = place(mainOrbit + ggOffset++);
        const p: WorldPlacement = { type: "gasGiant", orbitNum, sceneRadius: orbitToScene(orbitNum), angle0: rng() * Math.PI * 2 };
        const bodyId = `unplaced-gas-${orbitNum}-${i}`;
        return <GasGiantBody key={`u${i}`} placement={p} idx={ggIdx++} onPivot={onPivot} classification={body.classification} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      }
      if (body.kind === "belt") {
        const orbitNum = place(mainOrbit - 1);
        const p: WorldPlacement = { type: "belt", orbitNum, sceneRadius: orbitToScene(orbitNum), angle0: 0, isMainWorld: false };
        const bodyId = `unplaced-belt-${orbitNum}-${i}`;
        return <AsteroidBeltBody key={`u${i}`} placement={p} onPivot={onPivot} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      }
      if (body.kind === "world") {
        const candidate = mainOrbit - otherOffset++;
        if (candidate < 1) return null;
        const orbitNum = place(candidate);
        const p: WorldPlacement = { type: "otherWorld", orbitNum, sceneRadius: orbitToScene(orbitNum), angle0: rng() * Math.PI * 2 };
        const bodyId = `unplaced-world-${orbitNum}-${i}`;
        return <OtherWorld key={`u${i}`} placement={p} onPivot={onPivot} bodyId={bodyId} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      }
      return null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedBodyId, onFocusBody, useData, systemData, world.hex, onPivot]);

  // ── Procedural fallback (no system data) ──────────────────────────────────
  const proceduralElements = useMemo(() => {
    if (useData) return null;
    const placements = buildWorldPlacements(world);
    let ggCount = 0;
    return placements.map((p, i) => {
      if (p.type === "mainWorld") return <WorldBody key={i} placement={p} world={world} onPivot={onPivot} bodyId={`fallback-main-${i}`} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      if (p.type === "gasGiant")  return <GasGiantBody key={i} placement={p} idx={ggCount++} onPivot={onPivot} bodyId={`fallback-gas-${i}`} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      if (p.type === "belt")      return <AsteroidBeltBody key={i} placement={p} onPivot={onPivot} bodyId={`fallback-belt-${i}`} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
      return                             <OtherWorld key={i} placement={p} onPivot={onPivot} bodyId={`fallback-world-${i}`} focusedBodyId={focusedBodyId} onFocusBody={onFocusBody} />;
    });
  }, [focusedBodyId, onFocusBody, useData, world, onPivot]);

  return <>{placedElements}{unplacedElements}{proceduralElements}</>;
};

// ─── Camera distance ──────────────────────────────────────────────────────────

const cameraZ = (layout: SystemLayout, outermostScene: number): number => {
  const starBase = layout.type === "single" ? 10 : layout.type === "binary" ? 16 : Math.max(22, layout.companionRadius * 2.8);
  return Math.max(starBase, outermostScene * 1.5);
};

const JumpSpaceScene = ({
  active,
  onExitReached,
}: {
  active: boolean;
  onExitReached?: () => void;
}) => {
  const { camera } = useThree();
  const exitTriggeredRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const travelRef = useRef(0.08);

  const { path, tunnel, accents } = useMemo(() => {
    const pointCount = 34;
    const points = Array.from({ length: pointCount }, (_, index) => {
      const pct = index / (pointCount - 1);
      const t = pct * Math.PI * 2;
      return new THREE.Vector3(
        Math.sin(t * 1.5) * 3.1 + Math.sin(t * 4.0) * 0.9,
        Math.cos(t * 1.25) * 2.4 + Math.sin(t * 3.25) * 0.75,
        8 - pct * 132,
      );
    });
    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.32);
    const tubeGeo = new THREE.TubeGeometry(curve, 1400, 1.05, 24, false);
    const wallMat = new THREE.MeshBasicMaterial({
      color: "#0891b2",
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wallMesh = new THREE.Mesh(tubeGeo, wallMat);
    const wireGeo = new THREE.WireframeGeometry(tubeGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: "#22d3ee",
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const tunnelLines = new THREE.LineSegments(wireGeo, lineMat);
    const tunnelGroup = new THREE.Group();
    tunnelGroup.add(wallMesh, tunnelLines);

    const makeParticleStream = ({
      count,
      size,
      opacity,
      radiusMin,
      radiusJitter,
      lightness,
    }: {
      count: number;
      size: number;
      opacity: number;
      radiusMin: number;
      radiusJitter: number;
      lightness: number;
    }) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const color = new THREE.Color();

      for (let index = 0; index < count; index++) {
        const t = (index + 0.5) / count;
        const point = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t).normalize();
        const normal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();
        if (normal.lengthSq() < 0.01) normal.set(1, 0, 0);
        const binormal = tangent.clone().cross(normal).normalize();
        const angle = index * 2.399963 + Math.sin(index * 0.17) * 0.65;
        const radius = radiusMin + ((index * 17) % 23) * radiusJitter;

        point
          .addScaledVector(normal, Math.cos(angle) * radius)
          .addScaledVector(binormal, Math.sin(angle) * radius);

        positions[index * 3] = point.x;
        positions[index * 3 + 1] = point.y;
        positions[index * 3 + 2] = point.z;

        color.setHSL(THREE.MathUtils.euclideanModulo(0.54 + t * 0.86 + index * 0.003, 1), 1, lightness);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size,
        map: glowTex(),
        vertexColors: true,
        sizeAttenuation: true,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      return new THREE.Points(geometry, material);
    };

    const accentObjects = [
      makeParticleStream({
        count: 1100,
        size: 0.11,
        opacity: 0.78,
        radiusMin: 0.92,
        radiusJitter: 0.018,
        lightness: 0.64,
      }),
      makeParticleStream({
        count: 260,
        size: 0.23,
        opacity: 0.55,
        radiusMin: 1.18,
        radiusJitter: 0.035,
        lightness: 0.72,
      }),
    ];

    return {
      path: curve,
      tunnel: tunnelGroup,
      accents: accentObjects,
    };
  }, []);

  useEffect(
    () => () => {
      tunnel.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      accents.forEach((accent) => {
        accent.geometry.dispose();
        if (Array.isArray(accent.material)) {
          accent.material.forEach((material) => material.dispose());
        } else {
          accent.material.dispose();
        }
      });
    },
    [accents, tunnel],
  );

  useFrame((state) => {
    if (!active) return;
    if (startTimeRef.current === null) startTimeRef.current = state.clock.elapsedTime;
    if (lastFrameTimeRef.current === null) lastFrameTimeRef.current = state.clock.elapsedTime;
    const delta = Math.min(0.05, state.clock.elapsedTime - lastFrameTimeRef.current);
    lastFrameTimeRef.current = state.clock.elapsedTime;
    travelRef.current += delta * 0.055;
    const travel = travelRef.current;
    const progress = Math.min(travel, 0.96);
    const lookAhead = Math.min(progress + 0.012, 0.985);
    const position = path.getPointAt(progress);
    const lookAt = path.getPointAt(lookAhead);

    if (travel > 0.96) {
      const tangent = path.getTangentAt(0.96).normalize();
      const overshoot = (travel - 0.96) * 160;
      position.addScaledVector(tangent, overshoot);
      lookAt.copy(position).addScaledVector(tangent, 4);
    }

    camera.position.copy(position);
    camera.lookAt(lookAt);

    if (!exitTriggeredRef.current && travel >= 0.5) {
      exitTriggeredRef.current = true;
      onExitReached?.();
    }
  });

  return (
    <>
      <primitive object={tunnel} />
      {accents.map((accent, index) => (
        <primitive key={index} object={accent} />
      ))}
      <pointLight color="#22d3ee" intensity={2.4} distance={12} position={[0, 0, 0]} />
      <pointLight color="#22d3ee" intensity={1.8} distance={14} position={[3, 2, -8]} />
    </>
  );
};

const SystemCameraReset = ({
  camZ,
  controlsRef,
  pivotTarget,
  resetKey,
  sceneMode,
}: {
  camZ: number;
  controlsRef: React.RefObject<ControlsHandle | null>;
  pivotTarget: React.MutableRefObject<THREE.Vector3>;
  resetKey: string;
  sceneMode: "system" | "jump";
}) => {
  const { camera } = useThree();

  useEffect(() => {
    if (sceneMode !== "system") return;
    camera.position.set(0, camZ * 0.4, camZ);
    camera.lookAt(0, 0, 0);
    pivotTarget.current.set(0, 0, 0);
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
  }, [camZ, camera, controlsRef, pivotTarget, resetKey, sceneMode]);

  return null;
};

const AutoRotatingSystemGroup = ({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) => {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!enabled || !ref.current) return;
    ref.current.rotation.y += delta * 0.035;
  });

  return <group ref={ref}>{children}</group>;
};

// ─── Camera-pinned 3D HUD ────────────────────────────────────────────────────

type HudOffset = { x: number; y: number };

const clampHudOffset = (value: HudOffset): HudOffset => ({
  x: Math.max(-0.78, Math.min(0.78, value.x)),
  y: Math.max(-0.58, Math.min(0.58, value.y)),
});

const CameraPinnedSystemHud = ({
  world,
  miniMapVisible,
  onOpenMiniMap,
  onOpenMapPage,
  selectedSystemDetailAvailable,
  onOpenSelectedSystemDetail,
  navigationHudVisible,
  onOpenNavigationHud,
  mainWorldHudVisible,
  onOpenMainWorldHud,
  characterProfileHudVisible,
  onOpenCharacterProfileHud,
  tradeHudVisible,
  onOpenTradeHud,
}: {
  world: World;
  miniMapVisible: boolean;
  onOpenMiniMap: () => void;
  onOpenMapPage: () => void;
  selectedSystemDetailAvailable: boolean;
  onOpenSelectedSystemDetail: () => void;
  navigationHudVisible: boolean;
  onOpenNavigationHud: () => void;
  mainWorldHudVisible: boolean;
  onOpenMainWorldHud: () => void;
  characterProfileHudVisible: boolean;
  onOpenCharacterProfileHud: () => void;
  tradeHudVisible: boolean;
  onOpenTradeHud: () => void;
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector(selectHudLayout("hudControls"));
  const offset = layout.offset;
  const pinned = layout.pinned;
  const visible = layout.visible;
  const dragOffsetRef = useRef<HudOffset | null>(null);
  const pendingOffsetRef = useRef<HudOffset | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: HudOffset;
  } | null>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const distance = 4.5;
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.isPerspectiveCamera ? perspective.fov : 50;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * distance;
    const width = height * (size.width / Math.max(1, size.height));
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const activeOffset = dragOffsetRef.current ?? offset;

    group.position
      .copy(camera.position)
      .addScaledVector(forward, distance)
      .addScaledVector(right, activeOffset.x * width * 0.5)
      .addScaledVector(up, activeOffset.y * height * 0.5);
    group.quaternion.copy(camera.quaternion);
  });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ((event.clientX - dragRef.current.startX) / Math.max(1, size.width)) * 2;
      const dy = -((event.clientY - dragRef.current.startY) / Math.max(1, size.height)) * 2;
      const nextOffset = clampHudOffset({
        x: dragRef.current.origin.x + dx,
        y: dragRef.current.origin.y + dy,
      });
      pendingOffsetRef.current = nextOffset;
      dragOffsetRef.current = nextOffset;
    };
    const handleUp = () => {
      if (dragRef.current && pendingOffsetRef.current) {
        dispatch(setHudOffset({ id: "hudControls", offset: pendingOffsetRef.current }));
      }
      pendingOffsetRef.current = null;
      dragOffsetRef.current = null;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dispatch, size.height, size.width]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pinned) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
    pendingOffsetRef.current = offset;
  };

  return (
    <group ref={groupRef}>
      <Html transform center occlude={false} distanceFactor={4.5}>
        {visible ? (
          <HudPanel className="min-w-40">
            <HudHeader
              title={world.name}
              pinned={pinned}
              onTogglePinned={() => dispatch(setHudPinned({ id: "hudControls", pinned: !pinned }))}
              onClose={() => dispatch(setHudVisible({ id: "hudControls", visible: false }))}
              onDragStart={startDrag}
              closeTitle="Hide HUD"
            />
            <div className="flex items-center gap-1">
              <HudIconButton
                title={miniMapVisible ? "Mini map visible" : "Open mini map"}
                onClick={onOpenMiniMap}
              >
                <Radar size={13} aria-hidden="true" />
              </HudIconButton>
              <HudIconButton
                title="Open 2D map"
                onClick={onOpenMapPage}
              >
                <Map size={13} aria-hidden="true" />
              </HudIconButton>
              <HudIconButton
                title={selectedSystemDetailAvailable ? "Open selected system" : "Select a world on the mini map"}
                onClick={onOpenSelectedSystemDetail}
                disabled={!selectedSystemDetailAvailable}
              >
                <Grid3X3 size={13} aria-hidden="true" />
              </HudIconButton>
              <HudIconButton
                title={navigationHudVisible ? "Navigation visible" : "Open navigation"}
                onClick={onOpenNavigationHud}
              >
                <Navigation size={13} aria-hidden="true" />
              </HudIconButton>
              <HudIconButton
                title={mainWorldHudVisible ? "Main world visible" : "Open main world"}
                onClick={onOpenMainWorldHud}
              >
                <Globe2 size={13} aria-hidden="true" />
              </HudIconButton>
              <HudIconButton
                title={characterProfileHudVisible ? "Character profile visible" : "Open character profile"}
                onClick={onOpenCharacterProfileHud}
              >
                <User size={13} aria-hidden="true" />
              </HudIconButton>
              <HudIconButton
                title={tradeHudVisible ? "Trade HUD visible" : "Open trade HUD"}
                onClick={onOpenTradeHud}
              >
                <Coins size={13} aria-hidden="true" />
              </HudIconButton>
            </div>
          </HudPanel>
        ) : (
          <button
            type="button"
            onClick={() => dispatch(setHudVisible({ id: "hudControls", visible: true }))}
            title="Show HUD"
            aria-label="Show HUD"
            className="select-none border border-(--hud-accent)/70 bg-(--hud-bg)/80 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-(--hud-accent) shadow-[0_0_18px_rgba(34,211,238,0.18)] backdrop-blur-md transition-colors hover:bg-(--hud-accent) hover:text-(--hud-bg)"
            style={{ pointerEvents: "auto" }}
          >
            HUD
          </button>
        )}
      </Html>
    </group>
  );
};

const CameraPinnedTradeHud = ({
  visible,
  tradeHud,
  store,
  onClose,
}: {
  visible: boolean;
  tradeHud: ReactNode;
  store: AppStore;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector(selectHudLayout("trade"));
  const offset = layout.offset;
  const pinned = layout.pinned;
  const dragOffsetRef = useRef<HudOffset | null>(null);
  const pendingOffsetRef = useRef<HudOffset | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: HudOffset;
  } | null>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !visible) return;

    const distance = 4.8;
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.isPerspectiveCamera ? perspective.fov : 50;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * distance;
    const width = height * (size.width / Math.max(1, size.height));
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const activeOffset = dragOffsetRef.current ?? offset;

    group.position
      .copy(camera.position)
      .addScaledVector(forward, distance)
      .addScaledVector(right, activeOffset.x * width * 0.5)
      .addScaledVector(up, activeOffset.y * height * 0.5);
    group.quaternion.copy(camera.quaternion);
  });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ((event.clientX - dragRef.current.startX) / Math.max(1, size.width)) * 2;
      const dy = -((event.clientY - dragRef.current.startY) / Math.max(1, size.height)) * 2;
      const nextOffset = clampHudOffset({
        x: dragRef.current.origin.x + dx,
        y: dragRef.current.origin.y + dy,
      });
      pendingOffsetRef.current = nextOffset;
      dragOffsetRef.current = nextOffset;
    };
    const handleUp = () => {
      if (dragRef.current && pendingOffsetRef.current) {
        dispatch(setHudOffset({ id: "trade", offset: pendingOffsetRef.current }));
      }
      pendingOffsetRef.current = null;
      dragOffsetRef.current = null;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dispatch, size.height, size.width]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pinned) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
    pendingOffsetRef.current = offset;
  };

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <Html transform center occlude={false} distanceFactor={4.8}>
        <HudPanel>
          <HudHeader
            title="Trade"
            pinned={pinned}
            onTogglePinned={() => dispatch(setHudPinned({ id: "trade", pinned: !pinned }))}
            onClose={onClose}
            onDragStart={startDrag}
            closeTitle="Close trade HUD"
          />
          <StoreBridge store={store}>
            {tradeHud}
          </StoreBridge>
        </HudPanel>
      </Html>
    </group>
  );
};

const CameraPinnedMainWorldHud = ({
  visible,
  mainWorldHud,
  world,
  inJump,
  onClose,
}: {
  visible: boolean;
  mainWorldHud: ReactNode;
  world: World | null;
  inJump: boolean;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector(selectHudLayout("mainWorld"));
  const offset = layout.offset;
  const pinned = layout.pinned;
  const dragOffsetRef = useRef<HudOffset | null>(null);
  const pendingOffsetRef = useRef<HudOffset | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: HudOffset;
  } | null>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !visible) return;

    const distance = 4.8;
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.isPerspectiveCamera ? perspective.fov : 50;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * distance;
    const width = height * (size.width / Math.max(1, size.height));
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const activeOffset = dragOffsetRef.current ?? offset;

    group.position
      .copy(camera.position)
      .addScaledVector(forward, distance)
      .addScaledVector(right, activeOffset.x * width * 0.5)
      .addScaledVector(up, activeOffset.y * height * 0.5);
    group.quaternion.copy(camera.quaternion);
  });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ((event.clientX - dragRef.current.startX) / Math.max(1, size.width)) * 2;
      const dy = -((event.clientY - dragRef.current.startY) / Math.max(1, size.height)) * 2;
      const nextOffset = clampHudOffset({
        x: dragRef.current.origin.x + dx,
        y: dragRef.current.origin.y + dy,
      });
      pendingOffsetRef.current = nextOffset;
      dragOffsetRef.current = nextOffset;
    };
    const handleUp = () => {
      if (dragRef.current && pendingOffsetRef.current) {
        dispatch(setHudOffset({ id: "mainWorld", offset: pendingOffsetRef.current }));
      }
      pendingOffsetRef.current = null;
      dragOffsetRef.current = null;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dispatch, size.height, size.width]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pinned) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
    pendingOffsetRef.current = offset;
  };

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {!inJump && world && !isAsteroid(world) && (
        <group position={[0, -0.48, 0.08]}>
          <WorldGlobeVisual world={world} radius={0.34} />
        </group>
      )}
      <Html transform center occlude={false} distanceFactor={4.8}>
        <HudPanel className="[background:linear-gradient(to_bottom,var(--hud-bg)_0_18px,rgba(2,12,20,0.2)_18px_100%)]">
          <HudHeader
            title="Main World"
            pinned={pinned}
            onTogglePinned={() => dispatch(setHudPinned({ id: "mainWorld", pinned: !pinned }))}
            onClose={onClose}
            onDragStart={startDrag}
            closeTitle="Close main world HUD"
          />
          {mainWorldHud}
        </HudPanel>
      </Html>
    </group>
  );
};

const CameraPinnedCharacterProfileHud = ({
  visible,
  characterProfileHud,
  store,
  onClose,
}: {
  visible: boolean;
  characterProfileHud: ReactNode;
  store: AppStore;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector(selectHudLayout("characterProfile"));
  const offset = layout.offset;
  const pinned = layout.pinned;
  const dragOffsetRef = useRef<HudOffset | null>(null);
  const pendingOffsetRef = useRef<HudOffset | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: HudOffset;
  } | null>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !visible) return;

    const distance = 4.8;
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.isPerspectiveCamera ? perspective.fov : 50;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * distance;
    const width = height * (size.width / Math.max(1, size.height));
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const activeOffset = dragOffsetRef.current ?? offset;

    group.position
      .copy(camera.position)
      .addScaledVector(forward, distance)
      .addScaledVector(right, activeOffset.x * width * 0.5)
      .addScaledVector(up, activeOffset.y * height * 0.5);
    group.quaternion.copy(camera.quaternion);
  });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ((event.clientX - dragRef.current.startX) / Math.max(1, size.width)) * 2;
      const dy = -((event.clientY - dragRef.current.startY) / Math.max(1, size.height)) * 2;
      const nextOffset = clampHudOffset({
        x: dragRef.current.origin.x + dx,
        y: dragRef.current.origin.y + dy,
      });
      pendingOffsetRef.current = nextOffset;
      dragOffsetRef.current = nextOffset;
    };
    const handleUp = () => {
      if (dragRef.current && pendingOffsetRef.current) {
        dispatch(setHudOffset({ id: "characterProfile", offset: pendingOffsetRef.current }));
      }
      pendingOffsetRef.current = null;
      dragOffsetRef.current = null;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dispatch, size.height, size.width]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pinned) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
    pendingOffsetRef.current = offset;
  };

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <Html transform center occlude={false} distanceFactor={4.8}>
        <HudPanel>
          <HudHeader
            title="Character"
            pinned={pinned}
            onTogglePinned={() => dispatch(setHudPinned({ id: "characterProfile", pinned: !pinned }))}
            onClose={onClose}
            onDragStart={startDrag}
            closeTitle="Close character profile HUD"
          />
          <StoreBridge store={store}>
            {characterProfileHud}
          </StoreBridge>
        </HudPanel>
      </Html>
    </group>
  );
};

const CameraPinnedNavigationHud = ({
  visible,
  navigationHud,
  store,
  onClose,
}: {
  visible: boolean;
  navigationHud: ReactNode;
  store: AppStore;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector(selectHudLayout("navigation"));
  const offset = layout.offset;
  const pinned = layout.pinned;
  const dragOffsetRef = useRef<HudOffset | null>(null);
  const pendingOffsetRef = useRef<HudOffset | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: HudOffset;
  } | null>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !visible) return;

    const distance = 4.8;
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.isPerspectiveCamera ? perspective.fov : 50;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * distance;
    const width = height * (size.width / Math.max(1, size.height));
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const activeOffset = dragOffsetRef.current ?? offset;

    group.position
      .copy(camera.position)
      .addScaledVector(forward, distance)
      .addScaledVector(right, activeOffset.x * width * 0.5)
      .addScaledVector(up, activeOffset.y * height * 0.5);
    group.quaternion.copy(camera.quaternion);
  });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ((event.clientX - dragRef.current.startX) / Math.max(1, size.width)) * 2;
      const dy = -((event.clientY - dragRef.current.startY) / Math.max(1, size.height)) * 2;
      const nextOffset = clampHudOffset({
        x: dragRef.current.origin.x + dx,
        y: dragRef.current.origin.y + dy,
      });
      pendingOffsetRef.current = nextOffset;
      dragOffsetRef.current = nextOffset;
    };
    const handleUp = () => {
      if (dragRef.current && pendingOffsetRef.current) {
        dispatch(setHudOffset({ id: "navigation", offset: pendingOffsetRef.current }));
      }
      pendingOffsetRef.current = null;
      dragOffsetRef.current = null;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dispatch, size.height, size.width]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pinned) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
    pendingOffsetRef.current = offset;
  };

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <Html transform center occlude={false} distanceFactor={4.8}>
        <HudPanel>
          <HudHeader
            title="Nav"
            pinned={pinned}
            onTogglePinned={() => dispatch(setHudPinned({ id: "navigation", pinned: !pinned }))}
            onClose={onClose}
            onDragStart={startDrag}
            closeTitle="Close navigation HUD"
          />
          <StoreBridge store={store}>
            {navigationHud}
          </StoreBridge>
        </HudPanel>
      </Html>
    </group>
  );
};

const CameraPinnedSubsectorMiniMapHud = ({
  visible,
  miniMap,
  store,
  onOpenSectorMap,
  onClose,
}: {
  visible: boolean;
  miniMap: ReactNode;
  store: AppStore;
  onOpenSectorMap: () => void;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector(selectHudLayout("subsectorMap"));
  const offset = layout.offset;
  const pinned = layout.pinned;
  const dragOffsetRef = useRef<HudOffset | null>(null);
  const pendingOffsetRef = useRef<HudOffset | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: HudOffset;
  } | null>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !visible) return;

    const distance = 4.8;
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.isPerspectiveCamera ? perspective.fov : 50;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * distance;
    const width = height * (size.width / Math.max(1, size.height));
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const activeOffset = dragOffsetRef.current ?? offset;

    group.position
      .copy(camera.position)
      .addScaledVector(forward, distance)
      .addScaledVector(right, activeOffset.x * width * 0.5)
      .addScaledVector(up, activeOffset.y * height * 0.5);
    group.quaternion.copy(camera.quaternion);
  });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ((event.clientX - dragRef.current.startX) / Math.max(1, size.width)) * 2;
      const dy = -((event.clientY - dragRef.current.startY) / Math.max(1, size.height)) * 2;
      const nextOffset = clampHudOffset({
        x: dragRef.current.origin.x + dx,
        y: dragRef.current.origin.y + dy,
      });
      pendingOffsetRef.current = nextOffset;
      dragOffsetRef.current = nextOffset;
    };
    const handleUp = () => {
      if (dragRef.current && pendingOffsetRef.current) {
        dispatch(setHudOffset({ id: "subsectorMap", offset: pendingOffsetRef.current }));
      }
      pendingOffsetRef.current = null;
      dragOffsetRef.current = null;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dispatch, size.height, size.width]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pinned) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
    pendingOffsetRef.current = offset;
  };

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <Html transform center occlude={false} distanceFactor={4.8}>
        <HudPanel>
          <HudHeader
            title="Subsector"
            pinned={pinned}
            actions={(
              <HudIconButton title="Open sector map" onClick={onOpenSectorMap}>
                <Grid3X3 size={8} aria-hidden="true" />
              </HudIconButton>
            )}
            onTogglePinned={() => dispatch(setHudPinned({ id: "subsectorMap", pinned: !pinned }))}
            onClose={onClose}
            onDragStart={startDrag}
            closeTitle="Close subsector HUD"
          />
          <StoreBridge store={store}>
            {miniMap}
          </StoreBridge>
        </HudPanel>
      </Html>
    </group>
  );
};

const CameraPinnedSectorMiniMapHud = ({
  visible,
  sectorMiniMap,
  store,
  onOpenGalaxyMap,
  onClose,
}: {
  visible: boolean;
  sectorMiniMap: ReactNode;
  store: AppStore;
  onOpenGalaxyMap: () => void;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector(selectHudLayout("sectorMap"));
  const offset = layout.offset;
  const pinned = layout.pinned;
  const dragOffsetRef = useRef<HudOffset | null>(null);
  const pendingOffsetRef = useRef<HudOffset | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: HudOffset;
  } | null>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !visible) return;

    const distance = 4.8;
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.isPerspectiveCamera ? perspective.fov : 50;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * distance;
    const width = height * (size.width / Math.max(1, size.height));
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const activeOffset = dragOffsetRef.current ?? offset;

    group.position
      .copy(camera.position)
      .addScaledVector(forward, distance)
      .addScaledVector(right, activeOffset.x * width * 0.5)
      .addScaledVector(up, activeOffset.y * height * 0.5);
    group.quaternion.copy(camera.quaternion);
  });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ((event.clientX - dragRef.current.startX) / Math.max(1, size.width)) * 2;
      const dy = -((event.clientY - dragRef.current.startY) / Math.max(1, size.height)) * 2;
      const nextOffset = clampHudOffset({
        x: dragRef.current.origin.x + dx,
        y: dragRef.current.origin.y + dy,
      });
      pendingOffsetRef.current = nextOffset;
      dragOffsetRef.current = nextOffset;
    };
    const handleUp = () => {
      if (dragRef.current && pendingOffsetRef.current) {
        dispatch(setHudOffset({ id: "sectorMap", offset: pendingOffsetRef.current }));
      }
      pendingOffsetRef.current = null;
      dragOffsetRef.current = null;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dispatch, size.height, size.width]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pinned) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
    pendingOffsetRef.current = offset;
  };

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <Html transform center occlude={false} distanceFactor={4.8}>
        <HudPanel>
          <HudHeader
            title="Sector"
            pinned={pinned}
            actions={(
              <HudIconButton title="Open galaxy map" onClick={onOpenGalaxyMap}>
                <Grid3X3 size={8} aria-hidden="true" />
              </HudIconButton>
            )}
            onTogglePinned={() => dispatch(setHudPinned({ id: "sectorMap", pinned: !pinned }))}
            onClose={onClose}
            onDragStart={startDrag}
            closeTitle="Close sector HUD"
          />
          <StoreBridge store={store}>
            {sectorMiniMap}
          </StoreBridge>
        </HudPanel>
      </Html>
    </group>
  );
};

const CameraPinnedGalaxyMiniMapHud = ({
  visible,
  galaxyMiniMap,
  store,
  onClose,
}: {
  visible: boolean;
  galaxyMiniMap: ReactNode;
  store: AppStore;
  onClose: () => void;
}) => {
  const dispatch = useAppDispatch();
  const layout = useAppSelector(selectHudLayout("galaxyMap"));
  const offset = layout.offset;
  const pinned = layout.pinned;
  const dragOffsetRef = useRef<HudOffset | null>(null);
  const pendingOffsetRef = useRef<HudOffset | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: HudOffset;
  } | null>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    const group = groupRef.current;
    if (!group || !visible) return;

    const distance = 4.8;
    const perspective = camera as THREE.PerspectiveCamera;
    const fov = perspective.isPerspectiveCamera ? perspective.fov : 50;
    const height = 2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * distance;
    const width = height * (size.width / Math.max(1, size.height));
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    const activeOffset = dragOffsetRef.current ?? offset;

    group.position
      .copy(camera.position)
      .addScaledVector(forward, distance)
      .addScaledVector(right, activeOffset.x * width * 0.5)
      .addScaledVector(up, activeOffset.y * height * 0.5);
    group.quaternion.copy(camera.quaternion);
  });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ((event.clientX - dragRef.current.startX) / Math.max(1, size.width)) * 2;
      const dy = -((event.clientY - dragRef.current.startY) / Math.max(1, size.height)) * 2;
      const nextOffset = clampHudOffset({
        x: dragRef.current.origin.x + dx,
        y: dragRef.current.origin.y + dy,
      });
      pendingOffsetRef.current = nextOffset;
      dragOffsetRef.current = nextOffset;
    };
    const handleUp = () => {
      if (dragRef.current && pendingOffsetRef.current) {
        dispatch(setHudOffset({ id: "galaxyMap", offset: pendingOffsetRef.current }));
      }
      pendingOffsetRef.current = null;
      dragOffsetRef.current = null;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dispatch, size.height, size.width]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (pinned) return;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origin: offset,
    };
    pendingOffsetRef.current = offset;
  };

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      <Html transform center occlude={false} distanceFactor={4.8}>
        <HudPanel>
          <HudHeader
            title="Galaxy"
            pinned={pinned}
            onTogglePinned={() => dispatch(setHudPinned({ id: "galaxyMap", pinned: !pinned }))}
            onClose={onClose}
            onDragStart={startDrag}
            closeTitle="Close galaxy HUD"
          />
          <StoreBridge store={store}>
            {galaxyMiniMap}
          </StoreBridge>
        </HudPanel>
      </Html>
    </group>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

type StarSystemViewSceneProps = {
  world: World;
  sectorAbbr?: string | null;
  showHudControls?: boolean;
  miniMapVisible?: boolean;
  onOpenMiniMap?: () => void;
  onOpenMapPage?: () => void;
  onCloseMiniMap?: () => void;
  miniMap?: ReactNode;
  selectedSystemDetailAvailable?: boolean;
  onOpenSelectedSystemDetail?: () => void;
  sectorMiniMapVisible?: boolean;
  onOpenSectorMiniMap?: () => void;
  onCloseSectorMiniMap?: () => void;
  sectorMiniMap?: ReactNode;
  galaxyMiniMapVisible?: boolean;
  onOpenGalaxyMiniMap?: () => void;
  onCloseGalaxyMiniMap?: () => void;
  galaxyMiniMap?: ReactNode;
  mainWorldHudVisible?: boolean;
  onOpenMainWorldHud?: () => void;
  onCloseMainWorldHud?: () => void;
  mainWorldHud?: ReactNode;
  mainWorldHudInJump?: boolean;
  characterProfileHudVisible?: boolean;
  onOpenCharacterProfileHud?: () => void;
  onCloseCharacterProfileHud?: () => void;
  characterProfileHud?: ReactNode;
  tradeHudVisible?: boolean;
  onOpenTradeHud?: () => void;
  onCloseTradeHud?: () => void;
  tradeHud?: ReactNode;
  navigationHudVisible?: boolean;
  onOpenNavigationHud?: () => void;
  onCloseNavigationHud?: () => void;
  navigationHud?: ReactNode;
  sceneMode?: "system" | "jump";
  showWarpLayer?: boolean;
  renderSystemLayer?: boolean;
  warpLayerOpacity?: number;
  warpLayerActive?: boolean;
  autoRotateSystem?: boolean;
  onWarpExitReached?: () => void;
};

export const StarSystemViewScene = ({
  world,
  sectorAbbr: sectorAbbrProp,
  showHudControls = false,
  miniMapVisible = false,
  onOpenMiniMap = () => {},
  onOpenMapPage = () => {},
  onCloseMiniMap = () => {},
  miniMap = null,
  selectedSystemDetailAvailable = false,
  onOpenSelectedSystemDetail = () => {},
  sectorMiniMapVisible = false,
  onOpenSectorMiniMap = () => {},
  onCloseSectorMiniMap = () => {},
  sectorMiniMap = null,
  galaxyMiniMapVisible = false,
  onOpenGalaxyMiniMap = () => {},
  onCloseGalaxyMiniMap = () => {},
  galaxyMiniMap = null,
  mainWorldHudVisible = false,
  onOpenMainWorldHud = () => {},
  onCloseMainWorldHud = () => {},
  mainWorldHud = null,
  mainWorldHudInJump = false,
  characterProfileHudVisible = false,
  onOpenCharacterProfileHud = () => {},
  onCloseCharacterProfileHud = () => {},
  characterProfileHud = null,
  tradeHudVisible = false,
  onOpenTradeHud = () => {},
  onCloseTradeHud = () => {},
  tradeHud = null,
  navigationHudVisible = false,
  onOpenNavigationHud = () => {},
  onCloseNavigationHud = () => {},
  navigationHud = null,
  sceneMode = "system",
  showWarpLayer = false,
  renderSystemLayer = true,
  warpLayerOpacity = 0,
  warpLayerActive = false,
  autoRotateSystem = false,
  onWarpExitReached,
}: StarSystemViewSceneProps) => {
  const dispatch = useAppDispatch();
  const reduxStore = useStore() as AppStore;
  const activeWorldSectorAbbr = useSelector((s: { galaxy?: { activeWorldSectorAbbr?: string | null } }) => s.galaxy?.activeWorldSectorAbbr ?? null);
  const sectorAbbr = sectorAbbrProp ?? activeWorldSectorAbbr;
  const systemData = useSelector(
    sectorAbbr
      ? selectSystemDataByKey(sectorAbbr, world.hex)
      : () => null,
  );
  const systemStatus = useSelector(
    sectorAbbr
      ? selectSystemStatusByKey(sectorAbbr, world.hex)
      : () => "idle",
  );
  const generatedTurn = useSelector(
    sectorAbbr
      ? selectSystemGeneratedTurnByKey(sectorAbbr, world.hex)
      : () => null,
  );
  const useData = !!(
    systemData &&
    systemData.hex === world.hex &&
    (!sectorAbbr || systemData.sector === sectorAbbr)
  );
  const currentTurn = useSelector((s: { turn?: { currentTurn?: number } }) => s.turn?.currentTurn ?? 1);

  useEffect(() => {
    if (!sectorAbbr) return;
    if (systemStatus === "loading") return;
    if (systemStatus === "loaded" && generatedTurn === currentTurn) return;
    dispatch(getSystemData({ sectorAbbr, hex: world.hex }));
  }, [currentTurn, dispatch, generatedTurn, sectorAbbr, systemStatus, world.hex]);

  const layout = useMemo(
    () => useData ? buildLayoutFromSystemData(systemData!.stars) : buildSystemLayout(world.stellar),
    [useData, systemData, world.stellar],
  );

  // Star epoch angles — companions frozen at their calendar position
  const epochAngles = useMemo(() => {
    if (!useData || !systemData) return { inner: 0, outer: 0 };
    const elapsed = elapsedDaysAtTurn(currentTurn);
    const primary = systemData.stars.find(s => s.role === "primary");
    const close   = systemData.stars.find(s => s.role === "close-companion");
    const far     = systemData.stars.find(s => s.role === "far-companion");
    const pMass = primary ? spectralMass(primary.spectral) : 1.0;
    const cMass = close   ? spectralMass(close.spectral)   : 0;
    const fMass = far     ? spectralMass(far.spectral)     : 0;
    return {
      inner: close?.au ? epochAngle(close.au, elapsed, pMass + cMass) : 0,
      outer: far?.au   ? epochAngle(far.au,   elapsed, pMass + cMass + fMass) : 0,
    };
  }, [useData, systemData, currentTurn]);

  const controlsRef = useRef<ControlsHandle>(null);
  const pivotTarget = useRef(new THREE.Vector3());
  const [focusedBodyId, setFocusedBodyId] = useState<string | null>(null);
  const onPivot = useCallback((pos: THREE.Vector3) => { pivotTarget.current.copy(pos); }, []);

  const companionChildren = useData && systemData && systemData.companionOrbits.length > 0
    ? (
      <CompanionBodies
        orbits={systemData.companionOrbits}
        onPivot={onPivot}
        focusedBodyId={focusedBodyId}
        onFocusBody={setFocusedBodyId}
      />
    )
    : undefined;

  const outermostScene = useMemo(() => {
    if (useData && systemData) {
      const all = [...systemData.orbits, ...systemData.companionOrbits];
      return all.reduce((m, o) => Math.max(m, orbitToScene(o.orbitId)), 0);
    }
    return buildWorldPlacements(world).reduce((m, p) => Math.max(m, p.sceneRadius), 0);
  }, [useData, systemData, world]);

  const camZ = cameraZ(layout, outermostScene);
  const cameraResetKey = `${sectorAbbr ?? ""}:${world.hex}`;
  const renderHudLayer = showHudControls;
  const renderSystemCanvas = renderSystemLayer || renderHudLayer;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#020c14" }}>
      {renderSystemCanvas && (
        <Canvas
          key={renderSystemLayer ? "system-layer" : "hud-layer"}
          camera={{ position: [0, camZ * 0.4, camZ] as [number, number, number], fov: 50, far: 200 }}
          gl={{ alpha: !renderSystemLayer }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: renderSystemLayer ? 0 : 20,
            background: renderSystemLayer ? "#020c14" : "transparent",
          }}
        >
          <StoreBridge store={reduxStore}>
            {renderSystemLayer && (
              <>
                <SystemCameraReset
                  camZ={camZ}
                  controlsRef={controlsRef}
                  pivotTarget={pivotTarget}
                  resetKey={cameraResetKey}
                  sceneMode={sceneMode}
                />
                <ambientLight intensity={0.6} />
                <directionalLight position={[2, 3, 4]} intensity={1.4} />
                <Starfield />
                <AutoRotatingSystemGroup enabled={autoRotateSystem}>
                  <SystemScene layout={layout} onPivot={onPivot} companionChildren={companionChildren} epochAngles={epochAngles} />
                  <WorldSystem
                    world={world}
                    onPivot={onPivot}
                    systemData={systemData}
                    focusedBodyId={focusedBodyId}
                    onFocusBody={setFocusedBodyId}
                  />
                </AutoRotatingSystemGroup>
                {sceneMode === "system" && (
                  <>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <OrbitControls ref={controlsRef as any} enablePan={false} minDistance={2} maxDistance={80} />
                    <PivotSmoother target={pivotTarget.current} controlsRef={controlsRef} />
                  </>
                )}
              </>
            )}
            {showHudControls && (
              <CameraPinnedSystemHud
                world={world}
                miniMapVisible={miniMapVisible}
                onOpenMiniMap={onOpenMiniMap}
                onOpenMapPage={onOpenMapPage}
                selectedSystemDetailAvailable={selectedSystemDetailAvailable}
                onOpenSelectedSystemDetail={onOpenSelectedSystemDetail}
                navigationHudVisible={navigationHudVisible}
                onOpenNavigationHud={onOpenNavigationHud}
                mainWorldHudVisible={mainWorldHudVisible}
                onOpenMainWorldHud={onOpenMainWorldHud}
                characterProfileHudVisible={characterProfileHudVisible}
                onOpenCharacterProfileHud={onOpenCharacterProfileHud}
                tradeHudVisible={tradeHudVisible}
                onOpenTradeHud={onOpenTradeHud}
              />
            )}
          {showHudControls && mainWorldHud && (
            <CameraPinnedMainWorldHud
              visible={mainWorldHudVisible}
              mainWorldHud={mainWorldHud}
              world={world}
              inJump={mainWorldHudInJump}
              onClose={onCloseMainWorldHud}
            />
          )}
          {showHudControls && navigationHud && (
            <CameraPinnedNavigationHud
              visible={navigationHudVisible}
              navigationHud={navigationHud}
              store={reduxStore}
              onClose={onCloseNavigationHud}
            />
          )}
          {showHudControls && characterProfileHud && (
            <CameraPinnedCharacterProfileHud
              visible={characterProfileHudVisible}
              characterProfileHud={characterProfileHud}
              store={reduxStore}
              onClose={onCloseCharacterProfileHud}
            />
          )}
          {showHudControls && tradeHud && (
            <CameraPinnedTradeHud
              visible={tradeHudVisible}
              tradeHud={tradeHud}
              store={reduxStore}
              onClose={onCloseTradeHud}
            />
          )}
          {showHudControls && miniMap && (
            <CameraPinnedSubsectorMiniMapHud
              visible={miniMapVisible}
              miniMap={miniMap}
              store={reduxStore}
              onOpenSectorMap={onOpenSectorMiniMap}
              onClose={onCloseMiniMap}
            />
          )}
          {showHudControls && sectorMiniMap && (
            <CameraPinnedSectorMiniMapHud
              visible={sectorMiniMapVisible}
              sectorMiniMap={sectorMiniMap}
              store={reduxStore}
              onOpenGalaxyMap={onOpenGalaxyMiniMap}
              onClose={onCloseSectorMiniMap}
            />
          )}
          {showHudControls && galaxyMiniMap && (
            <CameraPinnedGalaxyMiniMapHud
              visible={galaxyMiniMapVisible}
              galaxyMiniMap={galaxyMiniMap}
              store={reduxStore}
              onClose={onCloseGalaxyMiniMap}
            />
          )}
          </StoreBridge>
        </Canvas>
      )}
      {showWarpLayer && (
        <Canvas
          camera={{ position: [0, 0, 0] as [number, number, number], fov: 72, far: 220 }}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            opacity: warpLayerOpacity,
            pointerEvents: "none",
          }}
        >
          <ambientLight intensity={0.15} />
          <JumpSpaceScene
            active={warpLayerActive}
            onExitReached={onWarpExitReached}
          />
        </Canvas>
      )}
    </div>
  );
};

const StarSystemView = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const shipStatus = useAppSelector(selectShipStatus);
  const ship = useAppSelector(selectShip);
  const activeTradeWorld = useAppSelector(selectActiveWorld);
  const miniMapVisible = useAppSelector(selectHudVisible("subsectorMap"));
  const sectorMiniMapVisible = useAppSelector(selectHudVisible("sectorMap"));
  const galaxyMiniMapVisible = useAppSelector(selectHudVisible("galaxyMap"));
  const navigationHudVisible = useAppSelector(selectHudVisible("navigation"));
  const mainWorldHudVisible = useAppSelector(selectHudVisible("mainWorld"));
  const characterProfileHudVisible = useAppSelector(selectHudVisible("characterProfile"));
  const tradeHudVisible = useAppSelector(selectHudVisible("trade"));
  const hasStoredJumpDestination = useAppSelector(selectHasStoredJumpDestination);
  const renderedSceneMode = useAppSelector(selectSystemSceneMode);
  const showWarpLayer = useAppSelector(selectShowWarpLayer);
  const warpLayerOpacity = useAppSelector(selectWarpLayerOpacity);
  const warpLayerActive = useAppSelector(selectWarpLayerActive);
  const warpExitBlankActive = useAppSelector(selectWarpExitBlankActive);
  const renderableLocation = useAppSelector(selectSystemSceneRenderableLocation);
  const sectorStatus = useAppSelector(selectShipSectorLoadStatus);

  const handleWarpExitReached = useCallback(() => {
    dispatch(runWarpExitSequence());
  }, [dispatch]);

  const handleResolveFailedJump = useCallback(() => {
    dispatch(resolveFailedJump());
  }, [dispatch]);

  const handleOpenSelectedSystemDetail = useCallback(() => {
    dispatch(openSelectedWorldSystemDetail());
  }, [dispatch]);

  const inJump = ship?.status === "in_jump";
  const mainWorldHud = <MainWorldHud world={renderableLocation?.world ?? null} inJump={inJump} />;

  if (warpExitBlankActive) {
    return <div className="h-full w-full bg-black" />;
  }

  if (!renderableLocation) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-xs uppercase tracking-widest text-(--hud-text-dim)">
          {shipStatus === "loading" || sectorStatus === "loading"
            ? "Loading current system"
            : "Current ship system unavailable"}
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <StarSystemViewScene
        world={renderableLocation.world}
        sectorAbbr={renderableLocation.sectorAbbr}
        sceneMode={renderedSceneMode}
        showWarpLayer={showWarpLayer}
        renderSystemLayer={!showWarpLayer}
        warpLayerOpacity={warpLayerOpacity}
        warpLayerActive={warpLayerActive}
        showHudControls
        miniMapVisible={miniMapVisible}
        onOpenMiniMap={() => dispatch(setHudVisible({ id: "subsectorMap", visible: true }))}
        onOpenMapPage={() => router.push("/map")}
        onCloseMiniMap={() => dispatch(setHudVisible({ id: "subsectorMap", visible: false }))}
        miniMap={<SubsectorMiniMapHudContent />}
        selectedSystemDetailAvailable={!!activeTradeWorld}
        onOpenSelectedSystemDetail={handleOpenSelectedSystemDetail}
        sectorMiniMapVisible={sectorMiniMapVisible}
        onOpenSectorMiniMap={() => dispatch(setHudVisible({ id: "sectorMap", visible: true }))}
        onCloseSectorMiniMap={() => dispatch(setHudVisible({ id: "sectorMap", visible: false }))}
        sectorMiniMap={<SectorMiniMapHudContent />}
        galaxyMiniMapVisible={galaxyMiniMapVisible}
        onOpenGalaxyMiniMap={() => dispatch(setHudVisible({ id: "galaxyMap", visible: true }))}
        onCloseGalaxyMiniMap={() => dispatch(setHudVisible({ id: "galaxyMap", visible: false }))}
        galaxyMiniMap={<GalaxyMiniMapHudContent />}
        navigationHudVisible={navigationHudVisible}
        onOpenNavigationHud={() => dispatch(setHudVisible({ id: "navigation", visible: true }))}
        onCloseNavigationHud={() => dispatch(setHudVisible({ id: "navigation", visible: false }))}
        navigationHud={<NavigationHudContent />}
        mainWorldHudVisible={mainWorldHudVisible}
        onOpenMainWorldHud={() => dispatch(setHudVisible({ id: "mainWorld", visible: true }))}
        onCloseMainWorldHud={() => dispatch(setHudVisible({ id: "mainWorld", visible: false }))}
        mainWorldHud={mainWorldHud}
        mainWorldHudInJump={inJump}
        characterProfileHudVisible={characterProfileHudVisible}
        onOpenCharacterProfileHud={() => dispatch(setHudVisible({ id: "characterProfile", visible: true }))}
        onCloseCharacterProfileHud={() => dispatch(setHudVisible({ id: "characterProfile", visible: false }))}
        characterProfileHud={<CharacterProfileHudContent />}
        tradeHudVisible={tradeHudVisible}
        onOpenTradeHud={() => dispatch(setHudVisible({ id: "trade", visible: true }))}
        onCloseTradeHud={() => dispatch(setHudVisible({ id: "trade", visible: false }))}
        tradeHud={<TradeSystemHudContent />}
        onWarpExitReached={handleWarpExitReached}
      />
      {ship?.status === "in_jump" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <div className="hud-panel pointer-events-auto flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-(--hud-text)">
            <span className="text-(--hud-accent)">Jump Space</span>
            {!hasStoredJumpDestination && (
              <button
                type="button"
                onClick={handleResolveFailedJump}
                className="border border-(--hud-border) px-2 py-1 text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
              >
                Return
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StarSystemView;
