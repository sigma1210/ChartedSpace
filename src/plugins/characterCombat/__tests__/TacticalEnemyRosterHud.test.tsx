/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { characterCombatWeapons } from "@/plugins/characterCombat/equipment";
import {
  previewTacticalMelee,
  selectTacticalAttackTarget,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import { TacticalEnemyRosterHud } from "../TacticalEnemyRosterHud";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock("@/components/hud/FloatingPluginHud", () => ({
  FloatingPluginHud: ({ children, title }: { children: ReactNode; title: string }) => (
    <div aria-label={title}>{children}</div>
  ),
}));

describe("TacticalEnemyRosterHud", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  const adjacentState = () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const activeCombatant = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "player",
    )!;
    const enemy = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "enemy",
    )!;
    tacticalMap.scenario.walls = [];
    tacticalMap.scenario.doors = [];
    tacticalMap.scenario.defaultLighting = "illuminated";
    tacticalMap.scenario.exteriorLighting = "illuminated";
    tacticalMap.scenario.interiorCells = [];
    activeCombatant.position = { x: 10, y: 10 };
    activeCombatant.facing = "east";
    enemy.position = { x: 11, y: 10 };
    return { tacticalMap, activeCombatant, enemy };
  };

  it("dispatches ranged target selection when the enemy is shootable", () => {
    const { tacticalMap, activeCombatant, enemy } = adjacentState();
    activeCombatant.weapon = { ...characterCombatWeapons.autopistol };

    render(
      <TacticalEnemyRosterHud
        tacticalMap={tacticalMap}
        enemies={[enemy]}
        visibleEnemies={[enemy]}
        activeCombatant={activeCombatant}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: new RegExp(`Target ${enemy.name}`),
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: selectTacticalAttackTarget.type,
        payload: enemy.id,
      }),
    );
  });

  it("falls back to melee targeting for an unarmed adjacent combatant", () => {
    const { tacticalMap, activeCombatant, enemy } = adjacentState();
    activeCombatant.weapon = { ...characterCombatWeapons.noRangedWeapon };

    render(
      <TacticalEnemyRosterHud
        tacticalMap={tacticalMap}
        enemies={[enemy]}
        visibleEnemies={[enemy]}
        activeCombatant={activeCombatant}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: new RegExp(`Target ${enemy.name}`),
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: previewTacticalMelee.type,
        payload: enemy.id,
      }),
    );
  });

  it("renders visible but untargetable enemies as disabled status cards", () => {
    const { tacticalMap, enemy } = adjacentState();
    tacticalMap.suppressedCombatantIds = [enemy.id];

    render(
      <TacticalEnemyRosterHud
        tacticalMap={tacticalMap}
        enemies={[enemy]}
        visibleEnemies={[enemy]}
        activeCombatant={null}
      />,
    );

    const card = screen.getByRole("button", {
      name: new RegExp(`Enemy ${enemy.name}, No LOS, state Suppressed`),
    }) as HTMLButtonElement;
    expect(card.disabled).toBe(true);
  });

  it("shows the empty message when the scenario has no enemies", () => {
    const { tacticalMap } = adjacentState();
    render(
      <TacticalEnemyRosterHud
        tacticalMap={tacticalMap}
        enemies={[]}
        visibleEnemies={[]}
        activeCombatant={null}
      />,
    );

    expect(screen.getByText("No enemies")).toBeTruthy();
  });
});
