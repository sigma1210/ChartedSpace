export interface VisualCombatantMovement {
  sequence: number;
  path: [number, number, number][];
  mode: "walk" | "run";
}

export const shouldStartCombatantMovement = (
  lastSequence: number | null,
  movement: VisualCombatantMovement | undefined,
) =>
  Boolean(
    movement &&
      movement.sequence !== lastSequence &&
      movement.path.length >= 2,
  );
