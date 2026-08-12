import { createEmptyQuestDefinition } from "../../editor/types";
import { QuestFileError, validateQuestDefinition } from "../questFiles";

describe("quest definition validation", () => {
  it("accepts quest item definitions referenced by requirements and rewards", () => {
    const definition = createEmptyQuestDefinition("vault-quest", "Vault Quest");
    definition.itemDefinitions.push({ id: "vault-key", name: "Vault Key", description: "Opens the vault", icon: "key", requiredSkill: "Security", unskilledDm: -2 });
    definition.scenarioInstances.push({
      id: "vault-scene", sourceScenarioId: "vault", title: "Vault", connections: [],
      nodes: [{ id: "console", kind: "entity", entityType: "console", sourcePlacementId: "door", title: "Door", description: "", position: { x: 100, y: 100 }, chains: [{
        id: "unlock", name: "Unlock", description: "", tasks: [{ id: "task", skill: "Security", difficulty: "average" }],
        itemRequirements: [{ id: "requires-key", itemDefinitionId: "vault-key", quantity: 1, consumeOn: ["critical-failure"] }],
        successRewards: [{ id: "return-key", itemDefinitionId: "vault-key", quantity: 2, repeatable: false, recipient: { mode: "performer" } }],
      }] }],
    });
    expect(validateQuestDefinition(definition).itemDefinitions[0]?.id).toBe("vault-key");
  });

  it("rejects dangling quest item references", () => {
    const definition = createEmptyQuestDefinition("vault-quest", "Vault Quest");
    definition.scenarioInstances.push({
      id: "vault-scene", sourceScenarioId: "vault", title: "Vault", connections: [],
      nodes: [{ id: "console", kind: "entity", entityType: "console", sourcePlacementId: "door", title: "Door", description: "", position: { x: 100, y: 100 }, chains: [{
        id: "unlock", name: "Unlock", description: "", tasks: [{ id: "task", skill: "Security", difficulty: "average" }],
        itemRequirements: [{ id: "requires-key", itemDefinitionId: "missing-key", quantity: 1, consumeOn: [] }], successRewards: [],
      }] }],
    });
    expect(() => validateQuestDefinition(definition)).toThrow(QuestFileError);
    expect(() => validateQuestDefinition(definition)).toThrow("references missing quest item missing-key");
  });
});
