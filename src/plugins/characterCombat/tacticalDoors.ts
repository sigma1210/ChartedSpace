import { depressurizedCells, pointKey } from "./geometry";
import { tacticalTerrainObjectsForScenario } from "./tacticalTerrain";
import type { TacticalMapState } from "./types";

export const tacticalTerrainObject = (map: TacticalMapState, id: string | null | undefined) => id ? tacticalTerrainObjectsForScenario(map.scenario).find((object) => object.id === id) ?? null : null;

export const irisValveAcrossPressureDifferential = (map: TacticalMapState, doorId: string) => {
  const object = tacticalTerrainObject(map, doorId);
  if (object?.kind !== "door" || object.portalType !== "iris-valve") return false;
  const vacuum = depressurizedCells(map.scenario);
  return vacuum.has(pointKey(object.separates.first)) !== vacuum.has(pointKey(object.separates.second));
};

export const resolveTacticalPendingDoorCommands = (map: TacticalMapState) => {
  Object.entries(map.pendingDoorCommandsById).forEach(([doorId, command]) => {
    if (command.resolvesAtTurn > map.turn) return;
    if (!map.destroyedTerrainObjectIds.includes(doorId)) {
      const object = tacticalTerrainObject(map, doorId);
      if (command.open && irisValveAcrossPressureDifferential(map, doorId)) {
        map.events.unshift(`Iris valve ${doorId} could not open across a pressure differential at the start of Turn ${map.turn}`);
        delete map.pendingDoorCommandsById[doorId];
        return;
      }
      map.doorOpenById[doorId] = command.open;
      const scenarioDoor = map.scenario.doors.find((door) => door.id === doorId);
      if (scenarioDoor) scenarioDoor.open = command.open;
      map.events.unshift(`${object?.kind === "hatch" ? "Hatch" : object?.kind === "door" && object.portalType === "iris-valve" ? "Iris valve" : "Control-room door"} ${command.open ? "opened" : "closed"} at the start of Turn ${map.turn}`);
    }
    delete map.pendingDoorCommandsById[doorId];
  });
};
