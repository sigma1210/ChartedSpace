import type { DecisionPoint, DecisionProvider } from "../types";

export class RandomDecisionProvider implements DecisionProvider {
  async decide(point: DecisionPoint): Promise<string> {
    const { options } = point;
    if (options.length === 0) throw new Error(`No options for step: ${point.step}`);
    return options[Math.floor(Math.random() * options.length)].id;
  }
}
