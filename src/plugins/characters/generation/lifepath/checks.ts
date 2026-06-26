import type {
  LifepathCharacteristicId,
  LifepathQualificationModifierDefinition,
} from "../lifepathTypes";
import type {
  LifepathRollProvider,
  LifepathRuntimeState,
} from "./runtimeTypes";
import {
  characteristicDm,
  skillDm,
} from "./modifiers";

export const resolveCheckRoll = ({
  state,
  check,
  modifiers = [],
  rollProvider,
  reason,
}: {
  state: LifepathRuntimeState;
  check: {
    id: string;
    notation: string;
    target: number;
    characteristicModifier?: LifepathCharacteristicId;
    skillModifier?: string;
  };
  modifiers?: readonly LifepathQualificationModifierDefinition[];
  rollProvider: LifepathRollProvider;
  reason: string;
}) => {
  const roll = rollProvider.roll({
    id: check.id,
    notation: check.notation,
    reason,
  });
  const characteristicId = check.characteristicModifier ?? null;
  const characteristicScore = characteristicId
    ? state.characteristics[characteristicId] ?? null
    : null;
  const characteristicModifier = typeof characteristicScore === "number"
    ? characteristicDm(characteristicScore)
    : 0;
  const skillLevel = check.skillModifier
    ? state.skills.find((skill) => skill.name === check.skillModifier)?.level ?? null
    : null;
  const skillModifier = check.skillModifier ? skillDm(skillLevel) : 0;
  const modifierTotal = modifiers.reduce((total, modifier) => total + modifier.modifier, 0);
  const total = roll + characteristicModifier + skillModifier + modifierTotal;

  return {
    roll,
    total,
    characteristicId,
    characteristicScore,
    characteristicModifier,
    skillName: check.skillModifier ?? null,
    skillLevel,
    skillModifier,
    modifiers,
    modifierTotal,
    target: check.target,
    passed: total >= check.target,
  };
};
