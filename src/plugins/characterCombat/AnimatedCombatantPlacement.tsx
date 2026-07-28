"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";
import type { CombatantFacing } from "./AnimatedCombatantModel";
import {
  shouldStartCombatantMovement,
  type VisualCombatantMovement,
} from "./combatantMovementAnimation";

export const AnimatedCombatantPlacement = ({ position, rotation, finalFacing, movement, onClick, onMovementComplete, children }: {
  position: [number, number, number];
  rotation: [number, number, number];
  finalFacing: CombatantFacing;
  movement?: VisualCombatantMovement;
  onClick: (event: { stopPropagation: () => void }) => void;
  onMovementComplete?: (sequence: number) => void;
  children: (moving: boolean, facing: CombatantFacing) => ReactNode;
}) => {
  const group = useRef<Group>(null);
  const lastSequence = useRef<number | null>(null);
  const active = useRef<{
    movement: VisualCombatantMovement;
    segment: number;
    progress: number;
  } | null>(null);
  const [moving, setMoving] = useState(false);
  const [visualFacing, setVisualFacing] = useState<CombatantFacing>(finalFacing);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!movement || !shouldStartCombatantMovement(lastSequence.current, movement)) return;
    lastSequence.current = movement.sequence;
    active.current = { movement, segment: 0, progress: 0 };
    group.current?.position.set(...movement.path[0]);
    const next = movement.path[1];
    const first = movement.path[0];
    setVisualFacing(next[0] > first[0] ? "east" : next[0] < first[0] ? "west" : next[2] > first[2] ? "south" : "north");
    setMoving(true);
    invalidate();
  }, [invalidate, movement]);

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
    invalidate();
    if (amount < 1) return;
    current.segment += 1;
    current.progress = 0;
    if (current.segment < current.movement.path.length - 1) {
      const next = current.movement.path[current.segment + 1];
      setVisualFacing(next[0] > to[0] ? "east" : next[0] < to[0] ? "west" : next[2] > to[2] ? "south" : "north");
      return;
    }
    const completedSequence = current.movement.sequence;
    active.current = null;
    target.position.set(...position);
    setVisualFacing(finalFacing);
    setMoving(false);
    onMovementComplete?.(completedSequence);
  });

  return <group ref={group} position={position} rotation={rotation} onClick={(event) => { if (!moving) onClick(event); }}>
    {children(moving, moving ? visualFacing : finalFacing)}
  </group>;
};
