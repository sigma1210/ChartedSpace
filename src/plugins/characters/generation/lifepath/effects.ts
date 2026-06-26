import type { LifepathEffect } from "../lifepathTypes";
import {
  payloadNumber,
  payloadString,
} from "./payload";
import type {
  LifepathEffectContext,
  LifepathRuntimeSkill,
  LifepathRuntimeState,
} from "./runtimeTypes";

export const appendUnique = (values: readonly string[], value: string) =>
  values.includes(value) ? [...values] : [...values, value];

export const addOrIncreaseSkill = (
  skills: readonly LifepathRuntimeSkill[],
  name: string,
  level: number,
) => {
  const existing = skills.find((skill) => skill.name === name);
  if (!existing) return [...skills, { name, level }];

  return skills.map((skill) =>
    skill.name === name
      ? { ...skill, level: skill.level + level }
      : skill,
  );
};

export const effectSummary = (effects: readonly LifepathEffect[]): string[] =>
  effects.map((effect) => {
    if (effect.type === "skill.add") {
      const skill = payloadString(effect.payload, "skill");
      const level = payloadNumber(effect.payload, "level") ?? 1;
      return skill ? `Gained ${skill}-${level}` : null;
    }
    if (effect.type === "career.promote") {
      const ranks = payloadNumber(effect.payload, "ranks") ?? 1;
      return `Promoted ${ranks} rank${ranks === 1 ? "" : "s"}`;
    }
    if (effect.type === "characteristic.modify") {
      const characteristicId = payloadString(effect.payload, "characteristicId");
      const modifier = payloadNumber(effect.payload, "modifier") ?? 0;
      return characteristicId
        ? `${characteristicId.toUpperCase()} ${modifier >= 0 ? "+" : ""}${modifier}`
        : null;
    }
    if (effect.type === "credit.add") {
      const amount = payloadNumber(effect.payload, "amount") ?? 0;
      return `Cr${amount.toLocaleString()}`;
    }
    if (effect.type === "benefit.add") {
      const benefitType = payloadString(effect.payload, "benefitType");
      const value = payloadString(effect.payload, "value");
      return value ? `${benefitType ?? "Benefit"}: ${value}` : benefitType;
    }
    if (effect.type === "relationship.add") {
      return payloadString(effect.payload, "label")
        ? `Met ${payloadString(effect.payload, "label")}`
        : "Relationship added";
    }
    if (effect.type === "injury.add") {
      return payloadString(effect.payload, "label")
        ? `Injury: ${payloadString(effect.payload, "label")}`
        : "Injury added";
    }
    if (effect.type === "age.add") {
      const years = payloadNumber(effect.payload, "years") ?? 0;
      return `Aged ${years} year${years === 1 ? "" : "s"}`;
    }
    return effect.type;
  }).filter((item): item is string => Boolean(item));

export const applyLifepathEffects = (
  state: LifepathRuntimeState,
  effects: readonly LifepathEffect[],
  context: LifepathEffectContext = {},
): LifepathRuntimeState => {
  let next = {
    ...state,
    effects: [...state.effects, ...effects],
  };

  for (const effect of effects) {
    switch (effect.type) {
      case "age.add": {
        next = {
          ...next,
          age: next.age + (payloadNumber(effect.payload, "years") ?? 0),
        };
        break;
      }
      case "career.leave": {
        next = {
          ...next,
          selectedCareerId: null,
          selectedAssignmentId: null,
        };
        break;
      }
      case "career.promote": {
        next = {
          ...next,
          careerRank: next.careerRank + (payloadNumber(effect.payload, "ranks") ?? 1),
        };
        break;
      }
      case "characteristic.modify": {
        const characteristicId = payloadString(effect.payload, "characteristicId");
        if (!characteristicId) break;
        const current = next.characteristics[characteristicId] ?? 0;
        next = {
          ...next,
          characteristics: {
            ...next.characteristics,
            [characteristicId]: Math.max(0, current + (payloadNumber(effect.payload, "modifier") ?? 0)),
          },
        };
        break;
      }
      case "credit.add": {
        next = {
          ...next,
          credits: next.credits + (payloadNumber(effect.payload, "amount") ?? 0),
        };
        break;
      }
      case "benefit.add": {
        const benefitType = payloadString(effect.payload, "benefitType");
        const value = payloadString(effect.payload, "value");
        const amount = payloadNumber(effect.payload, "amount");

        if (benefitType === "low-passage") {
          next = {
            ...next,
            benefits: {
              ...next.benefits,
              passages: {
                ...next.benefits.passages,
                low: next.benefits.passages.low + (amount ?? 1),
              },
            },
          };
          break;
        }
        if (benefitType === "middle-passage") {
          next = {
            ...next,
            benefits: {
              ...next.benefits,
              passages: {
                ...next.benefits.passages,
                middle: next.benefits.passages.middle + (amount ?? 1),
              },
            },
          };
          break;
        }
        if (benefitType === "high-passage") {
          next = {
            ...next,
            benefits: {
              ...next.benefits,
              passages: {
                ...next.benefits.passages,
                high: next.benefits.passages.high + (amount ?? 1),
              },
            },
          };
          break;
        }
        if (benefitType === "ship" && value) {
          next = {
            ...next,
            benefits: {
              ...next.benefits,
              ships: appendUnique(next.benefits.ships, value),
            },
          };
          break;
        }
        if (benefitType === "society" && value) {
          next = {
            ...next,
            benefits: {
              ...next.benefits,
              societies: appendUnique(next.benefits.societies, value),
            },
          };
          break;
        }
        if (benefitType === "weapon" && value) {
          next = {
            ...next,
            benefits: {
              ...next.benefits,
              weapons: appendUnique(next.benefits.weapons, value),
            },
          };
          break;
        }
        if (benefitType === "retirement-pay") {
          next = {
            ...next,
            benefits: {
              ...next.benefits,
              retirementPay: Math.max(next.benefits.retirementPay ?? 0, amount ?? 0),
            },
          };
        }
        break;
      }
      case "injury.add": {
        next = {
          ...next,
          injuries: [
            ...next.injuries,
            {
              severity: payloadString(effect.payload, "severity") ?? "minor",
              label: payloadString(effect.payload, "label") ?? undefined,
            },
          ],
        };
        break;
      }
      case "relationship.add": {
        const id = payloadString(effect.payload, "relationshipId") ?? payloadString(effect.payload, "id");
        const source = payloadString(effect.payload, "source");
        const careerId = payloadString(effect.payload, "careerId") ?? context.careerId;
        const term = payloadNumber(effect.payload, "term") ?? context.term ?? null;
        const notes = payloadString(effect.payload, "notes");
        const characterId = payloadString(effect.payload, "characterId");
        const role = payloadString(effect.payload, "role");
        const eventId = payloadString(effect.payload, "eventId") ?? context.eventId;
        const eventType = payloadString(effect.payload, "eventType") ?? context.eventType;
        next = {
          ...next,
          relationships: [
            ...next.relationships,
            {
              ...(id ? { id } : {}),
              type: payloadString(effect.payload, "relationshipType") ?? "contact",
              label: payloadString(effect.payload, "label") ?? "Unknown",
              ...(source ? { source } : {}),
              ...(careerId ? { careerId } : {}),
              ...(term !== null ? { term } : {}),
              ...(notes ? { notes } : {}),
              ...(characterId ? { characterId } : {}),
              ...(role ? { role } : {}),
              ...(eventId ? { eventId } : {}),
              ...(eventType ? { eventType } : {}),
            },
          ],
        };
        break;
      }
      case "skill.add": {
        const skillName = payloadString(effect.payload, "skill");
        if (!skillName) break;
        next = {
          ...next,
          skills: addOrIncreaseSkill(
            next.skills,
            skillName,
            payloadNumber(effect.payload, "level") ?? 1,
          ),
        };
        break;
      }
    }
  }

  return next;
};
