import { createEmptyDialogueDefinition } from "../../dialogue/types";
import { DialogueFileError, validateDialogueDefinition } from "../dialogueFiles";

describe("dialogue definition validation", () => {
  it("accepts multiple player choices from NPC text and independent endings", () => {
    const definition = createEmptyDialogueDefinition("dockmaster", "Dockmaster");
    definition.nodes.push(
      { id: "choice-one", kind: "choice", text: "Ask {{npcName}} for work", position: { x: 300, y: 100 } },
      { id: "choice-two", kind: "choice", text: "Leave", position: { x: 300, y: 300 } },
      { id: "ending", kind: "ending", endingKind: "neutral", title: "Later", text: "", transformation: "unchanged", restartable: true, resumeNodeId: definition.startNodeId, position: { x: 600, y: 300 } },
    );
    definition.connections.push(
      { id: "one", sourceNodeId: definition.startNodeId, outcome: "next", targetNodeId: "choice-one" },
      { id: "two", sourceNodeId: definition.startNodeId, outcome: "next", targetNodeId: "choice-two" },
      { id: "three", sourceNodeId: "choice-two", outcome: "next", targetNodeId: "ending" },
    );
    expect(validateDialogueDefinition(definition).connections).toHaveLength(3);
  });

  it("rejects duplicate skill-chain outcome links", () => {
    const definition = createEmptyDialogueDefinition("broker", "Broker");
    definition.nodes.push(
      { id: "check", kind: "skill-chain", label: "Convince", tasks: [{ id: "task", skill: "Persuade", difficulty: "average" }], position: { x: 300, y: 100 } },
      { id: "end-one", kind: "ending", endingKind: "failure", title: "No", text: "", transformation: "enemy", restartable: false, resumeNodeId: null, position: { x: 600, y: 100 } },
      { id: "end-two", kind: "ending", endingKind: "failure", title: "Still no", text: "", transformation: "unchanged", restartable: false, resumeNodeId: null, position: { x: 600, y: 300 } },
    );
    definition.connections.push(
      { id: "one", sourceNodeId: "check", outcome: "failure", targetNodeId: "end-one" },
      { id: "two", sourceNodeId: "check", outcome: "failure", targetNodeId: "end-two" },
    );
    expect(() => validateDialogueDefinition(definition)).toThrow(DialogueFileError);
  });
});
