import type { CharacterSheet } from "@/lib/characters/types";
import { generateHumanName } from "@/lib/characters/names";
import {
  applyLifepathAction,
  createInitialLifepathState,
  getCurrentLifepathStep,
  type LifepathRollProvider,
  type LifepathRuntimeState,
} from "./lifepathRunner";
import {
  buildLifepathDraft,
  lifepathDraftToCharacterSheet,
} from "./lifepathDraft";
import { registeredLifepathDefinitions } from "./registry";

const definition = registeredLifepathDefinitions[0];

const rollNotation = (notation: string) => {
  const match = /^(\d+)d(\d+)$/i.exec(notation.trim());
  if (!match) return 0;
  const count = Number(match[1]);
  const sides = Number(match[2]);
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
};

const rollProvider: LifepathRollProvider = {
  roll: ({ notation }) => rollNotation(notation),
};

const choose = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const resolveRollStep = (state: LifepathRuntimeState): LifepathRuntimeState => {
  const step = getCurrentLifepathStep(state, definition);

  switch (step.id) {
    case "lifepath.characteristics":
      return applyLifepathAction(state, definition, { type: "characteristics.roll", source: "random" }, rollProvider);
    case "lifepath.pre-career.qualification":
      return applyLifepathAction(state, definition, { type: "preCareer.qualification.resolve" }, rollProvider);
    case "lifepath.pre-career.graduation":
      return applyLifepathAction(state, definition, { type: "preCareer.graduation.resolve" }, rollProvider);
    case "lifepath.pre-career.skill":
      return applyLifepathAction(state, definition, { type: "preCareer.skill.resolve" }, rollProvider);
    case "lifepath.career.qualification":
      return applyLifepathAction(state, definition, { type: "career.qualification.resolve" }, rollProvider);
    case "lifepath.term.commission":
      return applyLifepathAction(state, definition, { type: "term.commission.resolve" }, rollProvider);
    case "lifepath.term.survival":
      return applyLifepathAction(state, definition, { type: "term.survival.resolve" }, rollProvider);
    case "lifepath.term.skill":
      return applyLifepathAction(state, definition, { type: "term.skill.resolve" }, rollProvider);
    case "lifepath.term.event":
      return applyLifepathAction(state, definition, { type: "term.event.resolve" }, rollProvider);
    case "lifepath.term.mishap":
      return applyLifepathAction(state, definition, { type: "term.mishap.resolve" }, rollProvider);
    case "lifepath.term.advancement":
      return applyLifepathAction(state, definition, { type: "term.advancement.resolve" }, rollProvider);
    case "lifepath.term.aging":
      return applyLifepathAction(state, definition, { type: "term.aging.resolve" });
    case "lifepath.term.reenlistment":
      return applyLifepathAction(state, definition, { type: "term.reenlistment.resolve" }, rollProvider);
    case "lifepath.muster-out":
      return applyLifepathAction(state, definition, { type: "muster-out.resolve" }, rollProvider);
    default:
      throw new Error(`Cannot resolve roll step: ${step.id}`);
  }
};

const resolveChoiceStep = (
  state: LifepathRuntimeState,
  targetTerms: number,
): LifepathRuntimeState => {
  const step = getCurrentLifepathStep(state, definition);
  if (step.kind !== "choice") throw new Error(`Expected choice step: ${step.id}`);
  const options = step.options.filter((option) => !option.disabled);
  const option = step.id === "lifepath.qualification-failed"
    ? options.find((item) => item.id !== "choose-another-career") ?? choose(options)
    : choose(options);

  switch (step.id) {
    case "lifepath.background-skill": {
      const tableId = typeof option.data?.tableId === "string" ? option.data.tableId : null;
      const entryId = typeof option.data?.entryId === "string" ? option.data.entryId : null;
      if (!tableId || !entryId) throw new Error("Invalid background skill option.");
      return applyLifepathAction(state, definition, {
        type: "background.skill.select",
        tableId,
        entryId,
        source: "random",
      });
    }
    case "lifepath.pre-career-choice":
      return option.id === "enter-career"
        ? applyLifepathAction(state, definition, { type: "preCareer.skip", source: "random" })
        : applyLifepathAction(state, definition, {
            type: "preCareer.select",
            educationId: option.id,
            source: "random",
          });
    case "lifepath.choose-career":
      return applyLifepathAction(state, definition, {
        type: "career.select",
        careerId: option.id,
        source: "random",
      });
    case "lifepath.choose-assignment":
      return applyLifepathAction(state, definition, {
        type: "assignment.select",
        assignmentId: option.id,
        source: "random",
      });
    case "lifepath.qualification-failed": {
      const selectedCareerId = typeof option.data?.careerId === "string" ? option.data.careerId : undefined;
      return option.id === "choose-another-career"
        ? applyLifepathAction(state, definition, { type: "qualification.choose-career", source: "random" })
        : applyLifepathAction(state, definition, {
            type: "qualification.fallback",
            careerId: selectedCareerId,
            source: "random",
          });
    }
    case "lifepath.term-complete":
      if (state.completedTerms >= targetTerms) {
        return applyLifepathAction(state, definition, { type: "generation.muster-out", source: "random" });
      }
      if (!state.selectedCareerId || !state.selectedAssignmentId) {
        return applyLifepathAction(state, definition, { type: "career.change", source: "random" });
      }
      return applyLifepathAction(state, definition, { type: "term.continue", source: "random" });
    case "lifepath.muster-out-benefit-choice":
      return applyLifepathAction(state, definition, {
        type: "muster-out.benefit.select",
        tableId: option.id,
        source: "random",
      });
    default:
      if (state.pendingChoice) {
        return applyLifepathAction(state, definition, {
          type: "table.choice.select",
          choiceId: option.id,
          source: "random",
        });
      }
      throw new Error(`Cannot resolve choice step: ${step.id}`);
  }
};

export const generateAutomaticContactSheet = ({
  currentLocation,
  targetTerms = 2,
}: {
  currentLocation: string | null;
  targetTerms?: number;
}): CharacterSheet => {
  const identity = generateHumanName();
  let state = createInitialLifepathState(definition);

  for (let iteration = 0; iteration < 300; iteration += 1) {
    const step = getCurrentLifepathStep(state, definition);

    if (step.kind === "complete" || step.id === "lifepath.generation-complete") {
      const draft = buildLifepathDraft(state, definition, identity.name, identity.gender);
      return {
        ...lifepathDraftToCharacterSheet(draft),
        currentLocation,
      };
    }

    state = step.kind === "choice"
      ? resolveChoiceStep(state, targetTerms)
      : resolveRollStep(state);
  }

  throw new Error("Automatic contact generation did not complete.");
};
