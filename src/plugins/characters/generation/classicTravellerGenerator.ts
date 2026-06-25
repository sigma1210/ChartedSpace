import {
  generateCharacter,
} from "@/lib/characters/engine";
import type {
  CharacterSheet,
  DecisionProvider,
} from "@/lib/characters/types";
import type {
  CharacterGenerationLogEvent,
  CharacterGeneratorContext,
  CharacterGeneratorPlugin,
  GenerationAction,
  GenerationEffect,
} from "./types";

export const classicTravellerGeneratorId = "classic-traveller" as const;

export type ClassicTravellerGeneratorAction =
  | {
      type: "generation.completed";
      payload: {
        draft: CharacterSheet;
      };
    };

export interface ClassicTravellerGeneratorState {
  status: "idle" | "complete";
  mode: CharacterGeneratorContext["mode"];
  draft: CharacterSheet | null;
  actions: GenerationAction[];
  effects: GenerationEffect[];
  logEvents: CharacterGenerationLogEvent[];
}

const decisionLabel = (step: string, chosen: string) =>
  chosen ? `${step}: ${chosen}` : step;

export const characterSheetToLogEvents = (
  draft: CharacterSheet,
): CharacterGenerationLogEvent[] =>
  draft.generation.decisions.map((decision, index) => ({
    sequence: index,
    type: decision.step,
    term: decision.term,
    label: decisionLabel(decision.step, decision.chosen),
    data: {
      options: decision.options,
      chosen: decision.chosen,
      roll: decision.roll,
      madeBy: decision.madeBy,
    },
  }));

export const classicTravellerGenerator = {
  id: classicTravellerGeneratorId,
  label: "Classic Traveller",

  createInitialState(context) {
    return {
      status: "idle",
      mode: context.mode,
      draft: null,
      actions: [],
      effects: [],
      logEvents: [],
    };
  },

  reduce(state, action) {
    switch (action.type) {
      case "generation.completed":
        return {
          ...state,
          status: "complete",
          draft: action.payload.draft,
          actions: [],
          effects: [],
          logEvents: characterSheetToLogEvents(action.payload.draft),
        };
      default:
        return state;
    }
  },

  getCurrentStep(state) {
    if (state.status === "complete" && state.draft) {
      return {
        kind: "complete",
        id: "classic.complete",
        title: "Character Generation Complete",
        draft: state.draft,
      };
    }

    return {
      kind: "running",
      id: "classic.running",
      title: "Classic Traveller Generation",
    };
  },

  isComplete(state) {
    return state.status === "complete";
  },

  buildCharacterDraft(state) {
    return state.draft;
  },

  getLogEvents(state) {
    return state.logEvents;
  },

  async run(name, provider, context) {
    const draft = await generateCharacter(name, provider, context.options ?? { mode: context.mode });
    const logEvents = characterSheetToLogEvents(draft);

    return {
      generatorId: classicTravellerGeneratorId,
      draft,
      log: logEvents,
      logEvents,
      actions: [],
      effects: [],
      metadata: {
        ruleset: draft.generation.ruleset,
        mode: draft.generation.mode,
      },
    };
  },
} satisfies CharacterGeneratorPlugin<
  ClassicTravellerGeneratorState,
  ClassicTravellerGeneratorAction
>;
