/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import {
  confirmTacticalTreatment,
  previewTacticalExtinguishFire,
} from "@/plugins/characterCombat/slice";
import { freshTacticalMap } from "@/plugins/characterCombat/tacticalScenarioReducers";
import { activeTacticalTerrainObjects } from "@/plugins/characterCombat/tacticalTerrain";
import { TacticalSupportControls } from "../TacticalSupportControls";
import { createEmptyQuestDefinition, type QuestScenarioInstance } from "@/plugins/quest/editor/types";
import { inactiveQuestPlaytestRuntime, questChainOperationId, questScenarioConsoleVictory } from "@/plugins/quest/playtest/questPlaytest";

const mockDispatch = jest.fn();

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => mockDispatch,
}));

describe("TacticalSupportControls", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  const supportState = () => {
    const tacticalMap = freshTacticalMap(["crew-1"]);
    const activeCombatant = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "player",
    )!;
    tacticalMap.actionPointsByCharacterId[activeCombatant.id] = 6;
    return { tacticalMap, activeCombatant };
  };

  it("dispatches selection of an adjacent fire for extinguishing", () => {
    const { tacticalMap, activeCombatant } = supportState();
    const fire = {
      x: activeCombatant.position.x + 1,
      y: activeCombatant.position.y,
    };
    tacticalMap.scenario.fireCells = [fire];

    render(
      <TacticalSupportControls
        section="recovery"
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: `Extinguish Fire ${fire.x}, ${fire.y} · 3 AP`,
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: previewTacticalExtinguishFire.type,
        payload: fire,
      }),
    );
  });

  it("dispatches confirmation for a planned treatment", () => {
    const { tacticalMap, activeCombatant } = supportState();
    const patient = tacticalMap.scenario.combatants.find(
      (unit) => unit.side === "enemy",
    )!;
    patient.side = "player";
    patient.position = {
      x: activeCombatant.position.x + 1,
      y: activeCombatant.position.y,
    };
    patient.woundState = "light";
    patient.defeated = false;
    tacticalMap.plannedTreatmentTargetId = patient.id;

    render(
      <TacticalSupportControls
        section="recovery"
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Confirm Treatment",
    }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: confirmTacticalTreatment.type }),
    );
  });

  it("renders the selected structural terrain interaction", () => {
    const { tacticalMap, activeCombatant } = supportState();
    const wall = activeTacticalTerrainObjects(
      tacticalMap.scenario,
      tacticalMap.doorOpenById,
      tacticalMap.destroyedTerrainObjectIds,
    ).find((object) => object.kind === "wall")!;
    tacticalMap.selectedTerrainObjectId = wall.id;

    render(
      <TacticalSupportControls
        section="terrain"
        tacticalMap={tacticalMap}
        activeCombatant={activeCombatant}
        draggedCombatant={null}
      />,
    );

    expect(screen.getByText("Interaction")).toBeTruthy();
    expect(screen.getByText("Wall segment")).toBeTruthy();
    expect(screen.getByText(/Integrity damage/)).toBeTruthy();
  });

  it("enables an item-gated successor chain when the active character holds the rewarded item", () => {
    const { tacticalMap, activeCombatant } = supportState();
    const terminal = activeTacticalTerrainObjects(tacticalMap.scenario, tacticalMap.doorOpenById, tacticalMap.destroyedTerrainObjectIds).find((object) => object.kind === "terminal")!;
    const placementId = terminal.id.replace(/:terminal$/, "");
    activeCombatant.position = { x: terminal.position.x, y: terminal.position.y + 1 };
    tacticalMap.selectedTerrainObjectId = terminal.id;
    tacticalMap.actionPointsByCharacterId[activeCombatant.id] = 6;
    const scene: QuestScenarioInstance = {
      id: "laundry", sourceScenarioId: "laundry", title: "Laundry", nodes: [
        { id: "start", kind: "start", title: "Start", position: { x: 0, y: 0 } },
        { id: "washer", kind: "entity", entityType: "console", sourcePlacementId: placementId, title: "Washer", description: "", position: { x: 0, y: 0 }, chains: [{ id: "remove", name: "Remove Laundry", description: "", tasks: [{ id: "remove-task", skill: "Steward", difficulty: "easy" }], itemRequirements: [], successRewards: [{ id: "wet-reward", itemDefinitionId: "wet-laundry", quantity: 1, repeatable: false, recipient: { mode: "performer" } }] }] },
        { id: "dryer", kind: "entity", entityType: "console", sourcePlacementId: placementId, title: "Dryer", description: "", position: { x: 0, y: 0 }, chains: [{ id: "dry", name: "Dry Fred's Laundry", description: "", tasks: [{ id: "dry-task", skill: "Steward", difficulty: "easy" }], itemRequirements: [{ id: "wet-required", itemDefinitionId: "wet-laundry", quantity: 1, consumeOn: [] }], successRewards: [] }] },
        { id: "victory", kind: "victory", title: "Victory", description: "", position: { x: 0, y: 0 } },
      ], connections: [
        { id: "start-washer", sourceNodeId: "start", sourceChainId: null, targetNodeId: "washer" },
        { id: "washer-dryer", sourceNodeId: "washer", sourceChainId: "remove", targetNodeId: "dryer" },
        { id: "dryer-victory", sourceNodeId: "dryer", sourceChainId: "dry", targetNodeId: "victory" },
      ],
    };
    tacticalMap.scenario.consoleVictory = questScenarioConsoleVictory("quest", scene);
    tacticalMap.completedConsoleOperationIds = [questChainOperationId("washer", "remove")];
    tacticalMap.resolvedConsoleOperationIds = [questChainOperationId("washer", "remove")];
    const definition = createEmptyQuestDefinition("quest", "Quest");
    definition.itemDefinitions.push({ id: "wet-laundry", name: "Wet Laundry", description: "", icon: "laundry", requiredSkill: null, unskilledDm: -2 });
    definition.scenarioInstances.push(scene);
    const questPlaytest = { ...inactiveQuestPlaytestRuntime(), status: "active" as const, definition, currentScenarioInstanceId: scene.id, itemInstances: [{ id: "wet-copy", itemDefinitionId: "wet-laundry", characterId: activeCombatant.id }] };

    render(<TacticalSupportControls section="terrain" tacticalMap={tacticalMap} activeCombatant={activeCombatant} draggedCombatant={null} questPlaytest={questPlaytest} />);

    expect((screen.getByRole("button", { name: /Dry Fred's Laundry/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});
