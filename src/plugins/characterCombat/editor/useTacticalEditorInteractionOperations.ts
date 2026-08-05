import type { TacticalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type {
  TacticalConsoleOperation,
  TacticalConsoleVictoryDefinitionFile,
} from "@/plugins/characterCombat/tacticalConsoleVictory";

type ConsoleVictoryUpdate = TacticalConsoleVictoryDefinitionFile
  | ((current: TacticalConsoleVictoryDefinitionFile) => TacticalConsoleVictoryDefinitionFile);

type UseTacticalEditorInteractionOperationsOptions = {
  consoleVictory: TacticalConsoleVictoryDefinitionFile;
  setConsoleVictory: (update: ConsoleVictoryUpdate) => void;
  selectedPlacement: TacticalTerrainPlacement | null;
  selectedPlacementSupportsOperations: boolean;
  selectedOperationId: string | null;
  setSelectedOperationId: (id: string | null) => void;
};

const withMembership = (ids: string[], id: string, included: boolean) => included
  ? [...new Set([...ids, id])]
  : ids.filter((candidateId) => candidateId !== id);

export const useTacticalEditorInteractionOperations = ({
  consoleVictory,
  setConsoleVictory,
  selectedPlacement,
  selectedPlacementSupportsOperations,
  selectedOperationId,
  setSelectedOperationId,
}: UseTacticalEditorInteractionOperationsOptions) => {
  const selectedConsoleOperations = selectedPlacement
    ? consoleVictory.operations.filter((operation) => operation.consolePlacementId === selectedPlacement.id)
    : [];
  const selectedOperation = consoleVictory.operations
    .find((operation) => operation.id === selectedOperationId) ?? null;

  const updateConsoleOperation = (
    id: string,
    update: (operation: TacticalConsoleOperation) => TacticalConsoleOperation,
  ) => setConsoleVictory((current) => ({
    ...current,
    operations: current.operations.map((operation) => operation.id === id ? update(operation) : operation),
  }));

  const addConsoleOperation = () => {
    if (!selectedPlacement || !selectedPlacementSupportsOperations) return false;
    const interactiveHuman = selectedPlacement.terrainDefinitionId === "interactive-human";
    let suffix = selectedConsoleOperations.length + 1;
    let id = `${selectedPlacement.id}-operation-${suffix}`;
    while (consoleVictory.operations.some((operation) => operation.id === id)) {
      suffix += 1;
      id = `${selectedPlacement.id}-operation-${suffix}`;
    }
    const victoryExists = consoleVictory.operations.some((operation) => operation.result.type === "victory");
    const operation: TacticalConsoleOperation = {
      id,
      consolePlacementId: selectedPlacement.id,
      label: `${interactiveHuman ? "Interact with" : "Operate"} ${selectedPlacement.objectSettings?.terminal?.label ?? (interactiveHuman ? "Interactive Human" : "Console")}`,
      prerequisites: { mode: "all", operationIds: [] },
      checks: [{
        id: `${id}-check-1`,
        skill: interactiveHuman ? "Persuade" : "Security",
        difficulty: "average",
        apCost: 6,
      }],
      criticalSuccessNextCheckModifier: 2,
      criticalFailureNextCheckModifier: -2,
      result: victoryExists ? { type: "unlock", operationIds: [] } : { type: "victory" },
      ...(interactiveHuman
        ? { successTransformation: "ally" as const, failureTransformation: "enemy" as const }
        : {}),
    };
    setConsoleVictory((current) => ({ ...current, operations: [...current.operations, operation] }));
    setSelectedOperationId(id);
    return true;
  };

  const deleteSelectedOperation = () => {
    if (!selectedOperation) return false;
    setConsoleVictory((current) => ({
      ...current,
      operations: current.operations
        .filter((operation) => operation.id !== selectedOperation.id)
        .map((operation) => ({
          ...operation,
          prerequisites: {
            ...operation.prerequisites,
            operationIds: operation.prerequisites.operationIds
              .filter((id) => id !== selectedOperation.id),
          },
          result: operation.result.type === "unlock"
            ? {
              ...operation.result,
              operationIds: operation.result.operationIds.filter((id) => id !== selectedOperation.id),
            }
            : operation.result,
        })),
    }));
    setSelectedOperationId(null);
    return true;
  };

  const updateConsoleOperationResult = (
    operationId: string,
    resultType: "victory" | "unlock",
  ) => {
    const victory = resultType === "victory";
    setConsoleVictory((current) => ({
      ...current,
      operations: current.operations.map((operation) => {
        if (operation.id === operationId) {
          return {
            ...operation,
            result: victory ? { type: "victory" as const } : { type: "unlock" as const, operationIds: [] },
          };
        }
        const withoutNewVictoryPrerequisite = victory
          ? {
            ...operation,
            prerequisites: {
              ...operation.prerequisites,
              operationIds: operation.prerequisites.operationIds.filter((id) => id !== operationId),
            },
          }
          : operation;
        return victory && withoutNewVictoryPrerequisite.result.type === "victory"
          ? { ...withoutNewVictoryPrerequisite, result: { type: "unlock" as const, operationIds: [] } }
          : withoutNewVictoryPrerequisite;
      }),
    }));
  };

  const toggleConsoleOperationPrerequisite = (
    operationId: string,
    candidateId: string,
    checked: boolean,
  ) => {
    setConsoleVictory((current) => ({
      ...current,
      operations: current.operations.map((operation) => {
        if (operation.id === operationId) {
          return {
            ...operation,
            prerequisites: {
              ...operation.prerequisites,
              operationIds: withMembership(operation.prerequisites.operationIds, candidateId, checked),
            },
          };
        }
        if (operation.id === candidateId && operation.result.type === "unlock") {
          return {
            ...operation,
            result: {
              ...operation.result,
              operationIds: withMembership(operation.result.operationIds, operationId, checked),
            },
          };
        }
        return operation;
      }),
    }));
  };

  const toggleConsoleOperationUnlock = (
    operationId: string,
    candidateId: string,
    checked: boolean,
  ) => {
    setConsoleVictory((current) => ({
      ...current,
      operations: current.operations.map((operation) => {
        if (operation.id === operationId && operation.result.type === "unlock") {
          return {
            ...operation,
            result: {
              ...operation.result,
              operationIds: withMembership(operation.result.operationIds, candidateId, checked),
            },
          };
        }
        if (operation.id === candidateId) {
          return {
            ...operation,
            prerequisites: {
              ...operation.prerequisites,
              operationIds: withMembership(operation.prerequisites.operationIds, operationId, checked),
            },
          };
        }
        return operation;
      }),
    }));
  };

  return {
    selectedConsoleOperations,
    selectedOperation,
    addConsoleOperation,
    updateConsoleOperation,
    deleteSelectedOperation,
    updateConsoleOperationResult,
    toggleConsoleOperationPrerequisite,
    toggleConsoleOperationUnlock,
  };
};
