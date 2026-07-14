import reducer, { activateTacticalCharacter, fireAtTacticalTerrain, initializeTacticalMap, interactWithTacticalTerrain, selectTacticalTerrainObject } from "../slice";
import type { CharacterCombatState } from "../types";

const stateWithCrewAt = (position: { x: number; y: number }, doorOpenById: Record<string, boolean> = {}): CharacterCombatState => {
  const initialized = reducer(undefined, initializeTacticalMap(["crew-1", "crew-2"]));
  return {
    ...initialized,
    tacticalMap: {
      ...initialized.tacticalMap!,
      characterPositions: { ...initialized.tacticalMap!.characterPositions, "crew-1": position },
      doorOpenById,
      activeCharacterId: "crew-1",
    },
  };
};

describe("tactical terrain interactions", () => {
  it("clears selected terrain when the active character changes", () => {
    let state = reducer(undefined, initializeTacticalMap(["crew-1", "crew-2"]));
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, activateTacticalCharacter("crew-2"));
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
    expect(state.tacticalMap?.selectedTerrainObjectId).toBeNull();
  });

  it("opens an adjacent door for 6 AP and ends the activation", () => {
    let state = stateWithCrewAt({ x: 48, y: 53 });
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, interactWithTacticalTerrain());
    expect(state.tacticalMap?.doorOpenById["control-room-alpha:north:door:4"]).toBe(true);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
  });

  it("closes an adjacent open door for 3 AP", () => {
    let state = stateWithCrewAt({ x: 48, y: 53 }, { "control-room-alpha:north:door:4": true });
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, interactWithTacticalTerrain());
    expect(state.tacticalMap?.doorOpenById["control-room-alpha:north:door:4"]).toBe(false);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(3);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-1");
  });

  it("activates an adjacent terminal for 6 AP and ends the activation", () => {
    let state = stateWithCrewAt({ x: 48, y: 57 });
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:terminal"));
    state = reducer(state, interactWithTacticalTerrain());
    expect(state.tacticalMap?.terminalActiveById["control-room-alpha:terminal"]).toBe(true);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
    expect(state.tacticalMap?.activeCharacterId).toBe("crew-2");
  });

  it("rejects terrain interaction when the character is not adjacent", () => {
    let state = stateWithCrewAt({ x: 40, y: 40 });
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, interactWithTacticalTerrain());
    expect(state.tacticalMap?.doorOpenById["control-room-alpha:north:door:4"]).toBeUndefined();
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(6);
  });

  it("uses the selected armory weapon, ammunition, and existing door breach threshold", () => {
    let state: CharacterCombatState = { ...stateWithCrewAt({ x: 48, y: 50 }), extendedArmoryLoadoutIds: ["lag", "breacher"], tacticalMap: { ...stateWithCrewAt({ x: 48, y: 50 }).tacticalMap!, terrainDamageById: { "control-room-alpha:north:door:4": 4 }, ammunitionByCharacterId: { "crew-1": 4, "crew-2": 6 } } };
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:door:4"));
    state = reducer(state, fireAtTacticalTerrain({ hitDice: { first: 6, second: 6 } }));
    expect(state.tacticalMap?.terrainDamageById["control-room-alpha:north:door:4"]).toBe(6);
    expect(state.tacticalMap?.destroyedTerrainObjectIds).toContain("control-room-alpha:north:door:4");
    expect(state.tacticalMap?.doorOpenById["control-room-alpha:north:door:4"]).toBe(true);
    expect(state.tacticalMap?.ammunitionByCharacterId["crew-1"]).toBe(3);
    expect(state.tacticalMap?.actionPointsByCharacterId["crew-1"]).toBe(0);
  });

  it("breaches only the selected one-unit wall segment at 25 structural damage", () => {
    const base = stateWithCrewAt({ x: 48, y: 50 });
    let state: CharacterCombatState = { ...base, extendedArmoryLoadoutIds: ["lag", "breacher"], tacticalMap: { ...base.tacticalMap!, terrainDamageById: { "control-room-alpha:north:wall:3": 24 }, ammunitionByCharacterId: { "crew-1": 4, "crew-2": 6 } } };
    state = reducer(state, selectTacticalTerrainObject("control-room-alpha:north:wall:3"));
    state = reducer(state, fireAtTacticalTerrain({ hitDice: { first: 6, second: 6 } }));
    expect(state.tacticalMap?.destroyedTerrainObjectIds).toEqual(["control-room-alpha:north:wall:3"]);
    expect(state.tacticalMap?.destroyedTerrainObjectIds).not.toContain("control-room-alpha:north:wall:2");
  });
});
