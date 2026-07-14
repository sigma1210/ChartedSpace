"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";
import type { CombatantFacing } from "./AnimatedCombatantModel";

interface VisualMovement {
  sequence: number;
  path: [number, number, number][];
  mode: "walk" | "run";
}

export const AnimatedCombatantPlacement = ({ position, rotation, finalFacing, movement, onClick, children }: {
  position: [number, number, number];
  rotation: [number, number, number];
  finalFacing: CombatantFacing;
  movement?: VisualMovement;
  onClick: (event: { stopPropagation: () => void }) => void;
  children: (moving: boolean, facing: CombatantFacing) => ReactNode;
}) => {
  const group = useRef<Group>(null);
  const lastSequence = useRef(movement?.sequence ?? 0);
  const active = useRef<{ movement: VisualMovement; segment: number; progress: number } | null>(null);
  const [moving, setMoving] = useState(false);
  const [visualFacing, setVisualFacing] = useState<CombatantFacing>(finalFacing);

  useEffect(() => {
    if (!movement || movement.sequence === lastSequence.current || movement.path.length < 2) return;
    lastSequence.current = movement.sequence;
    active.current = { movement, segment: 0, progress: 0 };
    group.current?.position.set(...movement.path[0]);
    const next = movement.path[1];
    const first = movement.path[0];
    setVisualFacing(next[0] > first[0] ? "east" : next[0] < first[0] ? "west" : next[2] > first[2] ? "south" : "north");
    setMoving(true);
  }, [movement]);

  useFrame((_, delta) => {
    const current = active.current;
    const target = group.current;
    if (!current || !target) return;
    const from = current.movement.path[current.segment];
    const to = current.movement.path[current.segment + 1];
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const speed = current.movement.mode === "run" ? 3.4 : 2.1;
    current.progress += distance > 0 ? delta * speed / distance : 1;
    const amount = Math.min(1, current.progress);
    target.position.set(
      from[0] + (to[0] - from[0]) * amount,
      from[1] + (to[1] - from[1]) * amount,
      from[2] + (to[2] - from[2]) * amount,
    );
    if (amount < 1) return;
    current.segment += 1;
    current.progress = 0;
    if (current.segment < current.movement.path.length - 1) {
      const next = current.movement.path[current.segment + 1];
      setVisualFacing(next[0] > to[0] ? "east" : next[0] < to[0] ? "west" : next[2] > to[2] ? "south" : "north");
      return;
    }
    active.current = null;
    target.position.set(...position);
    setVisualFacing(finalFacing);
    setMoving(false);
  });

  return <group ref={group} position={position} rotation={rotation} onClick={(event) => { if (!moving) onClick(event); }}>
    {children(moving, moving ? visualFacing : finalFacing)}
  </group>;
};
