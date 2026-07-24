"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Euler, Quaternion, type Group, type Object3D } from "three";

const MODEL_PATH = "/models/character-combat/Soldier.glb";
const FEMALE_MODEL_PATH = "/models/character-combat/female.glb";

export type CombatantAnimation = "idle" | "walk" | "run";
export type CombatantFacing = "north" | "east" | "south" | "west";
export type CombatantPose = "aim" | "surrender" | "stunned" | null;

const poseQuaternion = (x: number, y: number, z: number) => new Quaternion().setFromEuler(new Euler(x, y, z));
const poseOffsets: Record<Exclude<CombatantPose, null>, Record<string, Quaternion>> = {
  aim: {
    "mixamorig:Spine2": poseQuaternion(-0.08, 0, 0),
    "mixamorig:LeftArm": poseQuaternion(0, 0.9, -0.42),
    "mixamorig:LeftForeArm": poseQuaternion(0, 0.25, -0.72),
    "mixamorig:RightArm": poseQuaternion(0, -0.9, 0.42),
    "mixamorig:RightForeArm": poseQuaternion(0, -0.25, 0.72),
  },
  surrender: {
    "mixamorig:LeftArm": poseQuaternion(0, 0.18, 2.25),
    "mixamorig:LeftForeArm": poseQuaternion(0, 0, 0.28),
    "mixamorig:RightArm": poseQuaternion(0, -0.18, -2.25),
    "mixamorig:RightForeArm": poseQuaternion(0, 0, -0.28),
  },
  stunned: {
    "mixamorig:Spine": poseQuaternion(0.28, 0, 0.18),
    "mixamorig:Spine2": poseQuaternion(0.2, 0, -0.14),
    "mixamorig:Head": poseQuaternion(-0.2, 0, 0.12),
  },
};
const posedBoneNames = [...new Set(Object.values(poseOffsets).flatMap((offsets) => Object.keys(offsets)))];
const identityQuaternion = new Quaternion();

export const AnimatedCombatantModel = ({ animation, facing, pose = null, frozen = false, modelPath = MODEL_PATH }: { animation: CombatantAnimation; facing: CombatantFacing; pose?: CombatantPose; frozen?: boolean; modelPath?: string }) => {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const model = useMemo(() => clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, group);
  const invalidate = useThree((state) => state.invalidate);
  const clipName = modelPath === FEMALE_MODEL_PATH
    ? animation === "run" ? "Standard_Run" : animation === "walk" ? "Walking" : "Rifle_Idle"
    : animation === "run" ? "Run" : animation === "walk" ? "Walk" : "Idle";
  const poseBones = useMemo(() => Object.fromEntries(posedBoneNames.map((name) => [name, model.getObjectByName(name)])) as Record<string, Object3D | undefined>, [model]);
  const currentPoseOffsets = useRef(Object.fromEntries(posedBoneNames.map((name) => [name, new Quaternion()])) as Record<string, Quaternion>);

  useEffect(() => {
    const next = actions[clipName];
    if (!next) return;
    next.reset().fadeIn(0.22).play();
    next.setEffectiveTimeScale(frozen ? 0 : 1);
    invalidate();
    return () => { next.fadeOut(0.22); };
  }, [actions, clipName, frozen, invalidate]);

  useFrame((_, delta) => {
    mixer.update(delta);
    const targetOffsets = pose ? poseOffsets[pose] : null;
    posedBoneNames.forEach((name) => {
      const bone = poseBones[name];
      if (!bone) return;
      currentPoseOffsets.current[name].slerp(targetOffsets?.[name] ?? identityQuaternion, Math.min(1, delta * 9));
      bone.quaternion.multiply(currentPoseOffsets.current[name]);
    });
    invalidate();
  });

  const rotationY = facing === "east" ? -Math.PI / 2 : facing === "south" ? Math.PI : facing === "west" ? Math.PI / 2 : 0;

  return <group ref={group} scale={0.48} rotation={[0, rotationY, 0]}>
    <primitive object={model} />
  </group>;
};

export const AnimatedCombatantFallback = ({ color }: { color: string }) => <group>
  <mesh position={[0, 0.42, 0]} castShadow>
    <capsuleGeometry args={[0.18, 0.46, 6, 10]} />
    <meshStandardMaterial color={color} roughness={0.65} />
  </mesh>
  <mesh position={[0, 0.82, 0]} castShadow>
    <sphereGeometry args={[0.18, 12, 8]} />
    <meshStandardMaterial color={color} roughness={0.65} />
  </mesh>
</group>;

useGLTF.preload(MODEL_PATH);
useGLTF.preload(FEMALE_MODEL_PATH);
