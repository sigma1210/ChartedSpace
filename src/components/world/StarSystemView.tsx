"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { World } from "../../types";
import { buildSystemLayout, type SystemLayout, type StarSlot } from "../../lib/stellarSystem";
import { buildWorldPlacements, orbitToScene, type WorldPlacement } from "../../lib/orbitData";
import { uwpVal } from "../../lib/worldMap";

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

// ─── Star sphere ──────────────────────────────────────────────────────────────

const StarSphere = ({ slot, position }: { slot: StarSlot; position: [number, number, number] }) => {
  const tex   = useMemo(() => glowTex(), []);
  const color = useMemo(() => new THREE.Color(slot.star.colors.glow), [slot.star.colors.glow]);
  const gr    = slot.visualRadius * 4.5;

  return (
    <group position={position}>
      <sprite scale={[gr * 2.4, gr * 2.4, 1]}>
        <spriteMaterial map={tex} color={color} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.35} />
      </sprite>
      <sprite scale={[gr * 1.3, gr * 1.3, 1]}>
        <spriteMaterial map={tex} color={color} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.65} />
      </sprite>
      <mesh>
        <sphereGeometry args={[slot.visualRadius, 32, 32]} />
        <meshBasicMaterial color={slot.star.colors.mid} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ─── Star scenes ─────────────────────────────────────────────────────────────

const SingleScene = ({ layout }: { layout: SystemLayout }) => (
  <StarSphere slot={layout.slots[0]} position={[0, 0, 0]} />
);

const BinaryScene = ({ layout }: { layout: SystemLayout }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [sA, sB] = layout.slots;
  useFrame((_, dt) => { if (groupRef.current) groupRef.current.rotation.y += layout.outerAngularVelocity * dt; });
  return (
    <>
      <OrbitalRing radius={sA.orbitRadius} />
      <OrbitalRing radius={sB.orbitRadius} />
      <group ref={groupRef}>
        <StarSphere slot={sA} position={[ sA.orbitRadius, 0, 0]} />
        <StarSphere slot={sB} position={[-sB.orbitRadius, 0, 0]} />
      </group>
    </>
  );
};

const TrinaryScene = ({ layout }: { layout: SystemLayout }) => {
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const [sA, sB, sC] = layout.slots;
  useFrame((_, dt) => {
    if (outerRef.current) outerRef.current.rotation.y += layout.outerAngularVelocity * dt;
    if (innerRef.current) innerRef.current.rotation.y += layout.innerAngularVelocity * dt;
  });
  return (
    <>
      <OrbitalRing radius={layout.innerBinaryRadius} />
      <OrbitalRing radius={layout.companionRadius} />
      <group ref={outerRef}>
        <group position={[layout.innerBinaryRadius, 0, 0]}>
          <group ref={innerRef}>
            <StarSphere slot={sA} position={[ sA.orbitRadius, 0, 0]} />
            <StarSphere slot={sB} position={[-sB.orbitRadius, 0, 0]} />
          </group>
        </group>
        <StarSphere slot={sC} position={[-layout.companionRadius, 0, 0]} />
      </group>
    </>
  );
};

const SystemScene = ({ layout }: { layout: SystemLayout }) => {
  if (layout.type === "single")  return <SingleScene  layout={layout} />;
  if (layout.type === "binary")  return <BinaryScene  layout={layout} />;
  return                                <TrinaryScene layout={layout} />;
};

// ─── World body color from UWP ────────────────────────────────────────────────

const worldColor = (world: World): string => {
  const atmo = uwpVal(world.uwp.atmosphere);
  const hydro = uwpVal(world.uwp.hydrographics);
  if (atmo === 0)                   return "#6b7280"; // airless rock
  if (atmo >= 10)                   return "#7c3aed"; // exotic/insidious — purple
  if (hydro >= 7)                   return "#1d6fa0"; // ocean world — blue
  if (hydro >= 4)                   return "#2b6b42"; // habitable — green-blue
  if (hydro >= 1)                   return "#8b7355"; // dry but some water — tan
  return "#a07850";                                   // desert — sandy
};

// ─── World body (orbiting planet) ────────────────────────────────────────────

const WorldBody = ({ placement, world }: { placement: WorldPlacement; world: World }) => {
  const ref    = useRef<THREE.Group>(null);
  const speed  = 0.03 / Math.sqrt(Math.max(1, placement.orbitNum));
  const color  = useMemo(() => worldColor(world), [world]);
  const r      = placement.sceneRadius;

  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += speed * dt; });

  return (
    <>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.5} />
      <group ref={ref}>
        <mesh position={[r, 0, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <Html position={[r + 0.15, 0.15, 0]} style={{ pointerEvents: "none" }}>
          <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#22d3ee", whiteSpace: "nowrap" }}>
            {placement.label}
          </span>
        </Html>
      </group>
    </>
  );
};

// ─── Gas giant body ───────────────────────────────────────────────────────────

const GAS_COLORS = ["#b45309", "#a16207", "#92400e", "#7c3f0a", "#d97706"];

const GasGiantBody = ({ placement, idx }: { placement: WorldPlacement; idx: number }) => {
  const ref   = useRef<THREE.Group>(null);
  const speed = 0.018 / Math.sqrt(Math.max(1, placement.orbitNum));
  const color = GAS_COLORS[idx % GAS_COLORS.length];
  const r     = placement.sceneRadius;

  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += speed * dt; });

  return (
    <>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.4} />
      <group ref={ref}>
        <mesh position={[r, 0, 0]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
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
  return <primitive object={obj} />;
};

// ─── Other worlds (small dots) ────────────────────────────────────────────────

const OtherWorld = ({ placement }: { placement: WorldPlacement }) => {
  const ref   = useRef<THREE.Group>(null);
  const speed = 0.05 / Math.sqrt(Math.max(1, placement.orbitNum));
  const r     = placement.sceneRadius;
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += speed * dt; });
  return (
    <>
      <OrbitalRing radius={r} color="#0e3a50" opacity={0.25} />
      <group ref={ref}>
        <mesh position={[r, 0, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#6b7280" toneMapped={false} />
        </mesh>
      </group>
    </>
  );
};

// ─── World system layer (all bodies) ─────────────────────────────────────────

const WorldSystem = ({ world }: { world: World }) => {
  const placements = useMemo(() => buildWorldPlacements(world), [world]);

  let ggIdx = 0;
  return (
    <>
      {placements.map((p, i) => {
        if (p.type === "mainWorld")  return <WorldBody    key={i} placement={p} world={world} />;
        if (p.type === "gasGiant")   return <GasGiantBody key={i} placement={p} idx={ggIdx++} />;
        if (p.type === "belt")       return <BeltRing     key={i} placement={p} />;
        return                              <OtherWorld   key={i} placement={p} />;
      })}
    </>
  );
};

// ─── Camera distance ──────────────────────────────────────────────────────────

const cameraZ = (layout: SystemLayout, placements: WorldPlacement[]): number => {
  const outermost = placements.reduce((max, p) => Math.max(max, p.sceneRadius), 0);
  const starBase  = layout.type === "single" ? 10 : layout.type === "binary" ? 16 : Math.max(22, layout.companionRadius * 2.8);
  return Math.max(starBase, outermost * 1.5);
};

// ─── Component ────────────────────────────────────────────────────────────────

const StarSystemView = ({ world }: { world: World }) => {
  const layout     = useMemo(() => buildSystemLayout(world.stellar), [world.stellar]);
  const placements = useMemo(() => buildWorldPlacements(world), [world]);
  const camZ       = cameraZ(layout, placements);

  return (
    <div style={{ width: "100%", height: "100%", background: "#020c14" }}>
      <Canvas camera={{ position: [0, camZ * 0.4, camZ] as [number, number, number], fov: 50, far: 200 }}>
        <Starfield />
        <SystemScene layout={layout} />
        <WorldSystem world={world} />
        <OrbitControls enablePan={false} minDistance={2} maxDistance={80} />
      </Canvas>
    </div>
  );
};

export default StarSystemView;
