import type {
  CharacterSheet,
  DecisionPoint,
  DecisionProvider,
  GenerationMode,
  GenerationOptions,
} from "@/lib/characters/types";

export type CharacterGenerationStep =
  | {
      kind: "choice";
      id: string;
      title: string;
      decision: DecisionPoint;
    }
  | {
      kind: "running";
      id: string;
      title: string;
    }
  | {
      kind: "review";
      id: string;
      title: string;
      draft: CharacterSheet;
    }
  | {
      kind: "complete";
      id: string;
      title: string;
      draft: CharacterSheet;
    };

export interface CharacterGenerationLogEvent {
  sequence: number;
  type: string;
  term: number | null;
  label: string;
  data: Record<string, unknown>;
}

export interface CharacterGenerationRunResult {
  draft: CharacterSheet;
  logEvents: CharacterGenerationLogEvent[];
}

export interface CharacterGeneratorContext {
  mode: GenerationMode;
  options?: GenerationOptions;
}

export interface CharacterGeneratorPlugin<State, Action> {
  id: string;
  label: string;
  createInitialState(context: CharacterGeneratorContext): State;
  reduce(state: State, action: Action): State;
  getCurrentStep(state: State): CharacterGenerationStep;
  isComplete(state: State): boolean;
  buildCharacterDraft(state: State): CharacterSheet | null;
  getLogEvents(state: State): CharacterGenerationLogEvent[];
  run(
    name: string,
    provider: DecisionProvider,
    context: CharacterGeneratorContext,
  ): Promise<CharacterGenerationRunResult>;
}
