import type {
  CharacterSheet,
  DecisionPoint,
  DecisionProvider,
  GenerationMode,
  GenerationOptions,
} from "@/lib/characters/types";

export type GenerationPrimitiveValue =
  | string
  | number
  | boolean
  | null
  | GenerationPrimitiveValue[]
  | { [key: string]: GenerationPrimitiveValue };

export type GenerationPayload = Record<string, GenerationPrimitiveValue>;

export interface GenerationChoiceOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  data?: GenerationPayload;
}

export type GenerationStep =
  | {
      kind: "choice";
      id: string;
      title: string;
      prompt?: string;
      options: GenerationChoiceOption[];
      data?: GenerationPayload;
    }
  | {
      kind: "roll";
      id: string;
      title: string;
      notation: string;
      target?: number;
      data?: GenerationPayload;
    }
  | {
      kind: "table";
      id: string;
      title: string;
      tableId: string;
      data?: GenerationPayload;
    }
  | {
      kind: "running";
      id: string;
      title: string;
      data?: GenerationPayload;
    }
  | {
      kind: "review";
      id: string;
      title: string;
      draft: CharacterSheet;
      data?: GenerationPayload;
    }
  | {
      kind: "complete";
      id: string;
      title: string;
      draft: CharacterSheet;
      data?: GenerationPayload;
    };

export interface GenerationAction {
  id: string;
  type: string;
  source: "player" | "random" | "system" | "plugin";
  stepId?: string;
  term?: number | null;
  roll?: number | null;
  payload?: GenerationPayload;
}

export interface GenerationEffect {
  id: string;
  type: string;
  sourceActionId?: string;
  payload?: GenerationPayload;
}

export interface GenerationTableEntry {
  id: string;
  label: string;
  range?: [number, number];
  weight?: number;
  effects: GenerationEffect[];
  data?: GenerationPayload;
}

export interface GenerationTable {
  id: string;
  label: string;
  kind: "roll" | "choice" | "weighted";
  notation?: string;
  entries: GenerationTableEntry[];
}

export interface GenerationLogEntry {
  sequence: number;
  type: string;
  actionId?: string;
  effectIds?: string[];
  term: number | null;
  label: string;
  data: GenerationPayload;
}

export interface GenerationState {
  generatorId: string;
  status: "idle" | "running" | "waiting" | "review" | "complete" | "failed";
  mode: GenerationMode;
  draft: CharacterSheet | null;
  actions: GenerationAction[];
  effects: GenerationEffect[];
  log: GenerationLogEntry[];
  pluginState?: GenerationPayload;
}

export interface GenerationRunResult {
  generatorId: string;
  draft: CharacterSheet;
  log: GenerationLogEntry[];
  actions?: GenerationAction[];
  effects?: GenerationEffect[];
  stateSnapshot?: GenerationState;
  metadata?: GenerationPayload;
}

export type CharacterGenerationStep =
  | GenerationStep
  | {
      kind: "choice";
      id: string;
      title: string;
      decision: DecisionPoint;
    };

export type CharacterGenerationLogEvent = GenerationLogEntry;

export type CharacterGenerationRunResult = GenerationRunResult & {
  logEvents: CharacterGenerationLogEvent[];
};

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
  getLogEvents(state: State): GenerationLogEntry[];
  getTables?: () => readonly GenerationTable[];
  run(
    name: string,
    provider: DecisionProvider,
    context: CharacterGeneratorContext,
  ): Promise<CharacterGenerationRunResult>;
}
