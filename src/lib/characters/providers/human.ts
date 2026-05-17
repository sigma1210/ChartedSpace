import type { DecisionPoint, DecisionProvider } from "../types";

export class GenerationCancelledError extends Error {
  constructor() {
    super("Generation cancelled");
    this.name = "GenerationCancelledError";
  }
}

export class HumanDecisionProvider implements DecisionProvider {
  private resolveNext: ((id: string) => void) | null = null;
  private rejectNext: ((err: Error) => void) | null = null;

  constructor(private readonly onDecision: (point: DecisionPoint) => void) {}

  async decide(point: DecisionPoint): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.resolveNext = resolve;
      this.rejectNext = reject;
      this.onDecision(point);
    });
  }

  choose(id: string): void {
    const r = this.resolveNext;
    this.resolveNext = null;
    this.rejectNext = null;
    r?.(id);
  }

  cancel(): void {
    const r = this.rejectNext;
    this.resolveNext = null;
    this.rejectNext = null;
    r?.(new GenerationCancelledError());
  }
}
