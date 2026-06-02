"use client";

import { useMemo, useRef, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { World } from "../../types";
import { buildSystemLayout, buildLayoutFromSystemData, type SystemLayout, type StarSlot } from "../../lib/stellarSystem";
import { buildWorldPlacements, orbitToScene, seededRng, type WorldPlacement, type WorldBodyType } from "../../lib/orbitData";
import { spectralMass, epochAngle, elapsedDaysAtTurn } from "../../lib/orbitalMechanics";
import { buildTexture, cloudConfig, getCloudTex, PLANET_SPEED, type CloudConfig } from "./PlanetGlobe";
import { uwpVal } from "../../lib/worldMap";
import { selectActiveWorldSystem, type SystemData, type WorldBody as SystemWorldBody, type SystemOrbit, type UnplacedBody } from "../../store/selectors/system.selectors";

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

const Starfield = () => {
  const obj = useMemo(() => {
    const count = 1500;
    const pos   = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 45 + Math.random() * 8;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.07, color: "#ffffff", sizeAttenuation: true,
      transparent: true, opacity: 0.75,
    });
    return new THREE.Points(geo, mat);
  }, []);
  return <primitive object={obj} />;
};

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

type WorldBodyProps = {
  placement: WorldPlacement;
  world: World;
  onPivot: (pos: THREE.Vector3) => void;
};

const WorldBody = ({ placement, world, onPivot }: WorldBodyProps) => {
  const orbitRef = useRef<THREE.Group>(null);
  const spinRef  = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const speed    = 0.03 / Math.sqrt(Math.max(1, placement.orbitNum));
  const r        = placement.sceneRadius;

  useEffect(() => { if (orbitRef.current) orbitRef.current.rotation.y = placement.angle0; }, []);

  const texture = useMemo(() => buildTexture(world), [world]);
  useEffect(() => () => texture.dispose(), [texture]);

  const clouds = useMemo(
    (): CloudConfig | null => cloudConfig(uwpVal(world.uwp.atmosphere)),
    [world.uwp.atmosphere],
  );

  useFrame((_, dt) => {
    if (spinRef.current)  spinRef.current.rotation.y  += dt * PLANET_SPEED;
    if (cloudRef.current && clouds)
      cloudRef.current.rotation.y += dt * PLANET_SPEED * clouds.speedMult;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onPivot(pos);
  };

  return (
    <>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.5} />
      <group ref={orbitRef}>
        <group position={[r, 0, 0]}>
          <mesh ref={spinRef} onClick={handleClick}>
            <sphereGeometry args={[WORLD_R, 16, 16]} />
            <meshStandardMaterial map={texture} />
          </mesh>
          {clouds && (
            <mesh ref={cloudRef}>
              <sphereGeometry args={[WORLD_R * 1.015, 16, 16]} />
              <meshStandardMaterial
                alphaMap={getCloudTex()}
                color={clouds.color}
                transparent
                opacity={clouds.opacity}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>
        <Html position={[r + 0.15, 0.15, 0]} style={{ pointerEvents: "none" }}>
          <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#22d3ee", whiteSpace: "nowrap" }}>
            {placement.label}
          </span>
        </Html>
      </group>
    </>
  );
};

// ─── Placed world body (non-main world from SystemData) ──────────────────────
// Renders a placed non-main world using surface type for colour. No World object
// available so no Voronoi texture — a flat material is honest about what we know.

const SURFACE_COLOR: Record<string, string> = {
  barren: "#6b7280", vacuum: "#4b5563", desert: "#c2750c",
  arid: "#92644a",   terran: "#2563eb", ocean: "#1d4ed8",
  ice: "#bae6fd",    exotic: "#7c3aed", corrosive: "#b45309",
  insidious: "#991b1b", hellworld: "#dc2626",
};

const PlacedWorldBody = ({ orbit, onPivot }: { orbit: SystemOrbit; onPivot: (p: THREE.Vector3) => void }) => {
  const body = orbit.body as SystemWorldBody;
  const orbitRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const r     = orbitToScene(orbit.orbitId);
  const color = SURFACE_COLOR[body.surfaceType ?? "barren"] ?? "#6b7280";
  const atmoVal = uwpVal(body.atmosphereCode ?? "0");
  const clouds = useMemo(() => cloudConfig(atmoVal), [atmoVal]);

  useEffect(() => { if (orbitRef.current) orbitRef.current.rotation.y = orbit.angle0; }, []);

  useFrame((_, dt) => {
    if (cloudRef.current && clouds) cloudRef.current.rotation.y += dt * PLANET_SPEED * clouds.speedMult;
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onPivot(pos);
  };

  return (
    <>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.5} />
      <group ref={orbitRef}>
        <group position={[r, 0, 0]}>
          <mesh onClick={handleClick}>
            <sphereGeometry args={[WORLD_R, 16, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {clouds && (
            <mesh ref={cloudRef}>
              <sphereGeometry args={[WORLD_R * 1.015, 16, 16]} />
              <meshStandardMaterial alphaMap={getCloudTex()} color={clouds.color} transparent opacity={clouds.opacity} depthWrite={false} />
            </mesh>
          )}
        </group>
        {body.name && (
          <Html position={[r + 0.15, 0.15, 0]} style={{ pointerEvents: "none" }}>
            <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#22d3ee", whiteSpace: "nowrap" }}>{body.name}</span>
          </Html>
        )}
      </group>
    </>
  );
};

// ─── Gas giant classification ─────────────────────────────────────────────────

type GasGiantType = 'hot' | 'jovian' | 'ice';

const ggType = (orbitNum: number): GasGiantType => {
  if (orbitNum <= 3) return 'hot';
  if (orbitNum <= 7) return 'jovian';
  return 'ice';
};

// ─── Reference textures (loaded once, client-side) ───────────────────────────

const _loader = new THREE.TextureLoader();
let _jupiterTex: THREE.Texture | null = null;
let _saturnTex:  THREE.Texture | null = null;
let _ringTex:    THREE.Texture | null = null;

const jupiterTex = () => { if (!_jupiterTex) _jupiterTex = _loader.load('/textures/jupiter.jpg'); return _jupiterTex; };
const saturnTex  = () => { if (!_saturnTex)  _saturnTex  = _loader.load('/textures/saturn.jpg');  return _saturnTex; };
const ringTex    = () => { if (!_ringTex)    _ringTex    = _loader.load('/textures/saturn_ring.png'); return _ringTex; };

// ─── Procedural banded texture (hot Jupiters / ice giants) ───────────────────

const HOT_BANDS  = ['#c2770c','#1e3a5f','#b45309','#2563eb','#78350f','#1d4ed8'];
const ICE_BANDS  = ['#164e63','#0891b2','#083344','#67e8f9','#0e7490','#155e75'];

const buildBandedTex = (colors: string[], seed: number): THREE.CanvasTexture => {
  const W = 256, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const n = colors.length;
  for (let y = 0; y < H; y++) {
    const t    = y / H;
    const wave = Math.sin(t * Math.PI * 9 + seed * 2.3) * 0.5
               + Math.sin(t * Math.PI * 3 + seed * 0.7) * 0.25;
    const i = Math.min(n - 1, Math.max(0, Math.floor((wave * 0.5 + 0.5) * (n - 1))));
    ctx.fillStyle = colors[i];
    ctx.fillRect(0, y, W, 1);
  }
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, Math.abs(Math.sin((seed + i) * 4.7)) * H, W, 2 + (i % 3));
  }
  return new THREE.CanvasTexture(canvas);
};

// ─── Saturn ring geometry with correct UVs ────────────────────────────────────
// RingGeometry UVs are angular by default; remap them radially so the ring
// texture maps from inner edge (u=0) to outer edge (u=1).

const buildRingGeo = (inner: number, outer: number): THREE.BufferGeometry => {
  const geo = new THREE.RingGeometry(inner, outer, 64);
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
};

const GasGiantBody = ({ placement, idx, onPivot, world }: GasGiantBodyProps) => {
  const ref   = useRef<THREE.Group>(null);
  const speed = 0.018 / Math.sqrt(Math.max(1, placement.orbitNum));
  const r     = placement.sceneRadius;
  const type  = ggType(placement.orbitNum);

  useEffect(() => { if (ref.current) ref.current.rotation.y = placement.angle0; }, []);

  // Ringed: jovian every 4th, ice every other — use Saturn texture + ring image
  const hasRing = (type === 'jovian' && idx % 4 === 0) || (type === 'ice' && idx % 2 === 0);
  const radius  = type === 'hot' ? 0.22 : type === 'jovian' ? 0.20 : 0.17;

  const sphereTex = useMemo(() => {
    if (hasRing)          return saturnTex();
    if (type === 'jovian') return jupiterTex();
    return buildBandedTex(type === 'hot' ? HOT_BANDS : ICE_BANDS, idx);
  }, [type, hasRing, idx]);

  const ringGeo = useMemo(
    () => hasRing ? buildRingGeo(radius * 1.3, radius * 2.2) : null,
    [hasRing, radius],
  );

  const moonPlacement = useMemo((): WorldPlacement | null => {
    if (!placement.satellite || !world) return null;
    return { type: "mainWorld", orbitNum: 1, sceneRadius: placement.satellite.moonRadius, angle0: 0, label: world.name };
  }, [placement.satellite, world]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onPivot(pos);
  };

  return (
    <>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.4} />
      <group ref={ref}>
        <group position={[r, 0, 0]}>
          <mesh onClick={handleClick}>
            <sphereGeometry args={[radius, 32, 32]} />
            <meshBasicMaterial map={sphereTex} toneMapped={false} />
          </mesh>
          {hasRing && ringGeo && (
            <mesh geometry={ringGeo} rotation={[Math.PI / 2.3, 0, 0]}>
              <meshBasicMaterial map={ringTex()} side={THREE.DoubleSide} transparent />
            </mesh>
          )}
          {moonPlacement && world && (
            <WorldBody placement={moonPlacement} world={world} onPivot={onPivot} />
          )}
        </group>
      </group>
    </>
  );
};

// ─── Asteroid belt ────────────────────────────────────────────────────────────

const BeltRing = ({ placement }: { placement: WorldPlacement }) => {
  const obj = useMemo(() => {
    const r    = placement.sceneRadius;
    const geo  = new THREE.TorusGeometry(r, 0.12, 2, 128);
    const mat  = new THREE.MeshBasicMaterial({ color: "#78716c", transparent: true, opacity: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }, [placement.sceneRadius]);

  return (
    <>
      <primitive object={obj} />
      {placement.label && (
        <Html position={[placement.sceneRadius + 0.2, 0.15, 0]} style={{ pointerEvents: "none" }}>
          <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#a8a29e", whiteSpace: "nowrap" }}>
            {placement.label}
          </span>
        </Html>
      )}
    </>
  );
};

// ─── Other worlds (small dots) ────────────────────────────────────────────────

const OtherWorld = ({ placement, onPivot }: { placement: WorldPlacement; onPivot: (pos: THREE.Vector3) => void }) => {
  const ref   = useRef<THREE.Group>(null);
  const speed = 0.05 / Math.sqrt(Math.max(1, placement.orbitNum));
  const r     = placement.sceneRadius;

  useEffect(() => { if (ref.current) ref.current.rotation.y = placement.angle0; }, []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pos = new THREE.Vector3();
    e.object.getWorldPosition(pos);
    onPivot(pos);
  };

  return (
    <>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.25} />
      <group ref={ref}>
        <mesh position={[r, 0, 0]} onClick={handleClick}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#6b7280" toneMapped={false} />
        </mesh>
      </group>
    </>
  );
};

// ─── Companion bodies (orbiting the far companion star) ──────────────────────
// Rendered inside the companion's animated group in BinaryScene/TrinaryScene,
// so they move with the companion rather than orbiting the primary.

const CompanionBodies = ({
  orbits, onPivot,
}: {
  orbits: SystemOrbit[];
  onPivot: (p: THREE.Vector3) => void;
}) => {
  let ggIdx = 0;
  return (
    <>
      {orbits.map((orbit, i) => {
        const b = orbit.body;
        if (b.kind === "gasGiant") {
          const p: WorldPlacement = { type: "gasGiant", orbitNum: orbit.orbitId, sceneRadius: orbitToScene(orbit.orbitId), angle0: orbit.angle0 };
          return <GasGiantBody key={i} placement={p} idx={ggIdx++} onPivot={onPivot} />;
        }
        if (b.kind === "belt") {
          const p: WorldPlacement = { type: "belt", orbitNum: orbit.orbitId, sceneRadius: orbitToScene(orbit.orbitId), angle0: 0 };
          return <BeltRing key={i} placement={p} />;
        }
        return <OtherWorld key={i} placement={{ type: "otherWorld", orbitNum: orbit.orbitId, sceneRadius: orbitToScene(orbit.orbitId), angle0: orbit.angle0 }} onPivot={onPivot} />;
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
};

const WorldSystem = ({ world, onPivot, systemData }: WorldSystemProps) => {
  const useData = !!(systemData && systemData.hex === world.hex);
  const rng     = useMemo(() => seededRng(world.hex), [world.hex]);

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
        return <GasGiantBody key={i} placement={placement} idx={ggIdx++} onPivot={onPivot} world={hasMainMoon ? world : undefined} />;
      }
      if (b.kind === "belt") {
        const placement: WorldPlacement = { type: "belt", orbitNum: orbit.orbitId, sceneRadius: orbitToScene(orbit.orbitId), angle0: orbit.angle0 };
        return <BeltRing key={i} placement={placement} />;
      }
      if (b.kind === "world" && b.isMainWorld) {
        const placement: WorldPlacement = { type: "mainWorld", orbitNum: orbit.orbitId, sceneRadius: orbitToScene(orbit.orbitId), angle0: orbit.angle0, label: world.name };
        return <WorldBody key={i} placement={placement} world={world} onPivot={onPivot} />;
      }
      // Non-main placed world — render from body data
      return <PlacedWorldBody key={i} orbit={orbit} onPivot={onPivot} />;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useData, systemData, world, onPivot]);

  // ── Unplaced bodies (procedural scatter) ───────────────────────────────────
  const unplacedElements = useMemo(() => {
    if (!useData || !systemData) return null;
    const used       = new Set(systemData.orbits.map(o => o.orbitId));
    const mainOrbit  = systemData.orbits[0]?.orbitId ?? 3;
    const place      = (c: number) => { let o = Math.max(1, c); while (used.has(o)) o++; used.add(o); return o; };
    let ggOffset = 2, otherOffset = 1, ggIdx = systemData.orbits.filter(o => o.body.kind === "gasGiant").length;

    return systemData.unplaced.map((body, i) => {
      if (body.kind === "gasGiant") {
        const orbitNum = place(mainOrbit + ggOffset++);
        const p: WorldPlacement = { type: "gasGiant", orbitNum, sceneRadius: orbitToScene(orbitNum), angle0: rng() * Math.PI * 2 };
        return <GasGiantBody key={`u${i}`} placement={p} idx={ggIdx++} onPivot={onPivot} />;
      }
      if (body.kind === "belt") {
        const orbitNum = place(mainOrbit - 1);
        const p: WorldPlacement = { type: "belt", orbitNum, sceneRadius: orbitToScene(orbitNum), angle0: 0 };
        return <BeltRing key={`u${i}`} placement={p} />;
      }
      if (body.kind === "world") {
        const candidate = mainOrbit - otherOffset++;
        if (candidate < 1) return null;
        const orbitNum = place(candidate);
        const p: WorldPlacement = { type: "otherWorld", orbitNum, sceneRadius: orbitToScene(orbitNum), angle0: rng() * Math.PI * 2 };
        return <OtherWorld key={`u${i}`} placement={p} onPivot={onPivot} />;
      }
      return null;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useData, systemData, onPivot]);

  // ── Procedural fallback (no system data) ──────────────────────────────────
  const proceduralElements = useMemo(() => {
    if (useData) return null;
    const placements = buildWorldPlacements(world);
    let ggCount = 0;
    return placements.map((p, i) => {
      if (p.type === "mainWorld") return <WorldBody    key={i} placement={p} world={world} onPivot={onPivot} />;
      if (p.type === "gasGiant")  return <GasGiantBody key={i} placement={p} idx={ggCount++} onPivot={onPivot} />;
      if (p.type === "belt")      return <BeltRing     key={i} placement={p} />;
      return                             <OtherWorld   key={i} placement={p} onPivot={onPivot} />;
    });
  }, [useData, world, onPivot]);

  return <>{placedElements}{unplacedElements}{proceduralElements}</>;
};

// ─── Camera distance ──────────────────────────────────────────────────────────

const cameraZ = (layout: SystemLayout, outermostScene: number): number => {
  const starBase = layout.type === "single" ? 10 : layout.type === "binary" ? 16 : Math.max(22, layout.companionRadius * 2.8);
  return Math.max(starBase, outermostScene * 1.5);
};

// ─── Component ────────────────────────────────────────────────────────────────

const StarSystemView = ({ world }: { world: World }) => {
  const systemData = useSelector(selectActiveWorldSystem);
  const useData    = !!(systemData && systemData.hex === world.hex);

  const layout = useMemo(
    () => useData ? buildLayoutFromSystemData(systemData!.stars) : buildSystemLayout(world.stellar),
    [useData, systemData, world.stellar],
  );

  const currentTurn = useSelector((s: { turn?: { currentTurn?: number } }) => s.turn?.currentTurn ?? 1);

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
  const onPivot = useCallback((pos: THREE.Vector3) => { pivotTarget.current.copy(pos); }, []);

  const companionChildren = useData && systemData && systemData.companionOrbits.length > 0
    ? <CompanionBodies orbits={systemData.companionOrbits} onPivot={onPivot} />
    : undefined;

  const outermostScene = useMemo(() => {
    if (useData && systemData) {
      const all = [...systemData.orbits, ...systemData.companionOrbits];
      return all.reduce((m, o) => Math.max(m, orbitToScene(o.orbitId)), 0);
    }
    return buildWorldPlacements(world).reduce((m, p) => Math.max(m, p.sceneRadius), 0);
  }, [useData, systemData, world]);

  const camZ = cameraZ(layout, outermostScene);

  return (
    <div style={{ width: "100%", height: "100%", background: "#020c14" }}>
      <Canvas camera={{ position: [0, camZ * 0.4, camZ] as [number, number, number], fov: 50, far: 200 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 4]} intensity={1.4} />
        <Starfield />
        <SystemScene layout={layout} onPivot={onPivot} companionChildren={companionChildren} epochAngles={epochAngles} />
        <WorldSystem world={world} onPivot={onPivot} systemData={systemData} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <OrbitControls ref={controlsRef as any} enablePan={false} minDistance={2} maxDistance={80} />
        <PivotSmoother target={pivotTarget.current} controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
};

export default StarSystemView;
