import { tacticalCrewVisibilityMask, tacticalLightingLevelAt, tacticalLightPatchVisibleAt, tacticalLightReaches, tacticalLightSources, tacticalRangedEnemies, tacticalVisibilityAssessment } from "../geometry";
import { buildDefaultTacticalScenario } from "../defaultTacticalScenario";
import reducer, { confirmTacticalAttack, initializeTacticalMap, selectTacticalAttackMode, selectTacticalAttackTarget } from "../slice";
import type { CharacterCombatState, CombatScenario, Combatant } from "../types";

const weapon: Combatant["weapon"] = {
  name: "Test Rifle",
  effectiveRange: 8,
  longRange: 16,
  extremeRange: 24,
  penetration: 2,
  automatic: false,
};

const combatant = (id: string, position: { x: number; y: number }, overrides: Partial<Combatant> = {}): Combatant => ({
  id,
  name: id,
  side: id === "observer" ? "player" : "enemy",
  position,
  facing: "east",
  health: 3,
  defeated: false,
  surrendered: false,
  weapon: { ...weapon },
  weaponSkill: 1,
  meleeWeapon: { name: "Fist", penetration: 0 },
  meleeRating: 0,
  armor: 0,
  grenades: 0,
  medkits: 0,
  woundState: "healthy",
  ...overrides,
});

const scenarioWith = (observer: Combatant, target: Combatant, overrides: Partial<CombatScenario> = {}): CombatScenario => ({
  id: "tactical-visibility-test",
  title: "Tactical visibility test",
  briefing: "",
  objective: "",
  width: 12,
  height: 12,
  walls: [],
  doors: [],
  objects: [],
  combatants: [observer, target],
  ...overrides,
});

describe("AHL tactical visibility", () => {
  it("builds a crew visibility mask from living crew LOS and records effective lighting", () => {
    const observer = combatant("observer", { x: 1, y: 1 });
    const target = combatant("target", { x: 5, y: 1 });
    const scenario = scenarioWith(observer, target, {
      width: 7,
      height: 4,
      exteriorLighting: "dark",
      lightingByCell: undefined,
      lightSources: [{ id: "test-light", position: { x: 2, y: 1 }, range: 1 }],
      walls: [{ id: "visibility-wall", from: { x: 4, y: 0 }, to: { x: 4, y: 4 } }],
    });

    const mask = tacticalCrewVisibilityMask(scenario);
    expect(mask.get("0:1")).toBe("dark");
    expect(mask.get("1:1")).toBe("illuminated");
    expect(mask.get("2:1")).toBe("illuminated");
    expect(mask.has("5:1")).toBe(false);
  });

  it("updates the crew visibility mask when a door opens", () => {
    const observer = combatant("observer", { x: 1, y: 1 });
    const target = combatant("target", { x: 4, y: 1 });
    const scenario = scenarioWith(observer, target, {
      width: 6,
      height: 3,
      doors: [{ id: "visibility-door", from: { x: 3, y: 0 }, to: { x: 3, y: 3 }, open: false }],
    });

    expect(tacticalCrewVisibilityMask(scenario).has("4:1")).toBe(false);
    scenario.doors[0].open = true;
    expect(tacticalCrewVisibilityMask(scenario).has("4:1")).toBe(true);
  });

  it("does not give defeated crew members visibility", () => {
    const observer = combatant("observer", { x: 1, y: 1 }, { defeated: true, woundState: "dead" });
    const target = combatant("target", { x: 3, y: 1 });
    expect(tacticalCrewVisibilityMask(scenarioWith(observer, target)).size).toBe(0);
  });

  it("lets control-room light escape only through an open door", () => {
    const scenario = buildDefaultTacticalScenario("exterior-dark");
    const northDoor = scenario.doors.find((door) => door.id === "control-room-alpha:north:door:4");
    expect(northDoor).toBeDefined();

    const outsideDoor = { x: 48, y: 37 };
    expect(tacticalLightingLevelAt(scenario, outsideDoor)).toBe("dark");
    expect(scenario.lightSources?.some((source) => tacticalLightReaches(scenario, source, outsideDoor))).toBe(false);

    scenario.exteriorLighting = "illuminated";
    expect(tacticalLightingLevelAt(scenario, outsideDoor)).toBe("illuminated");
    expect(scenario.lightSources?.some((source) => tacticalLightReaches(scenario, source, outsideDoor))).toBe(false);

    northDoor!.open = true;
    expect(tacticalLightingLevelAt(scenario, outsideDoor)).toBe("illuminated");
    expect(scenario.lightSources?.some((source) => tacticalLightReaches(scenario, source, outsideDoor))).toBe(true);
    expect(tacticalLightingLevelAt(scenario, { x: 47, y: 37 })).toBe("illuminated");
    expect(scenario.lightSources?.some((source) => tacticalLightReaches(scenario, source, { x: 47, y: 37 }))).toBe(false);

    scenario.exteriorLighting = "dark";
    expect(tacticalLightingLevelAt(scenario, outsideDoor)).toBe("illuminated");
    expect(tacticalLightingLevelAt(scenario, { x: 47, y: 37 })).toBe("dark");
  });

  it("lets illuminated exterior light reach only the directly adjacent interior doorway cell", () => {
    const scenario = buildDefaultTacticalScenario("exterior-lit");
    scenario.fireCells = [];
    scenario.lightSources?.forEach((source) => { source.on = false; });
    const northDoor = scenario.doors.find((door) => door.id === "control-room-alpha:north:door:4");
    expect(northDoor).toBeDefined();

    const insideDoor = { x: 48, y: 38 };
    expect(tacticalLightingLevelAt(scenario, insideDoor)).toBe("dark");

    northDoor!.open = true;
    expect(tacticalLightingLevelAt(scenario, insideDoor)).toBe("illuminated");
    expect(tacticalLightingLevelAt(scenario, { x: 47, y: 38 })).toBe("dark");
    expect(tacticalLightingLevelAt(scenario, { x: 48, y: 39 })).toBe("dark");
  });

  it("uses the exterior level only outside and requires a source inside", () => {
    const observer = combatant("observer", { x: 1, y: 1 });
    const target = combatant("target", { x: 5, y: 1 });
    const scenario = scenarioWith(observer, target, {
      exteriorLighting: "illuminated",
      interiorCells: [{ x: 4, y: 1 }, { x: 5, y: 1 }],
    });

    expect(tacticalLightingLevelAt(scenario, { x: 3, y: 1 })).toBe("illuminated");
    expect(tacticalLightingLevelAt(scenario, target.position)).toBe("dark");

    scenario.lightSources = [{ id: "room-light", position: { x: 4, y: 1 }, range: 1 }];
    expect(tacticalLightingLevelAt(scenario, target.position)).toBe("illuminated");
  });

  it("always derives light from fire and stops doing so when the fire is removed", () => {
    const observer = combatant("observer", { x: 1, y: 1 });
    const target = combatant("target", { x: 3, y: 1 });
    const scenario = scenarioWith(observer, target, { exteriorLighting: "dark", fireCells: [{ x: 2, y: 1 }] });

    expect(tacticalLightingLevelAt(scenario, target.position)).toBe("illuminated");
    const fireSource = tacticalLightSources(scenario).find((source) => source.id.startsWith("fire:"));
    expect(fireSource).toBeDefined();
    expect(tacticalLightPatchVisibleAt(scenario, fireSource!, target.position)).toBe(true);

    scenario.exteriorLighting = "illuminated";
    expect(tacticalLightingLevelAt(scenario, target.position)).toBe("illuminated");
    expect(tacticalLightPatchVisibleAt(scenario, fireSource!, target.position)).toBe(false);

    scenario.exteriorLighting = "dark";
    scenario.fireCells = [];
    expect(tacticalLightingLevelAt(scenario, target.position)).toBe("dark");
  });

  it("does not cast source light through a wall", () => {
    const observer = combatant("observer", { x: 0, y: 0 });
    const target = combatant("target", { x: 2, y: 1 });
    const scenario = scenarioWith(observer, target, {
      exteriorLighting: "dark",
      fireCells: [{ x: 1, y: 1 }],
      walls: [{ id: "light-blocking-wall", from: { x: 2, y: 0 }, to: { x: 2, y: 2 } }],
    });

    expect(tacticalLightingLevelAt(scenario, target.position)).toBe("dark");
  });

  it("keeps a target in darkness observable and applies -1 per AHL range square", () => {
    const observer = combatant("observer", { x: 1, y: 1 });
    const target = combatant("target", { x: 5, y: 4 });

    expect(tacticalVisibilityAssessment(scenarioWith(observer, target, { defaultLighting: "dark" }), observer, target)).toMatchObject({
      observable: true,
      hasLineOfSight: true,
      observerLighting: "dark",
      targetLighting: "dark",
      range: 6,
      darknessModifier: -6,
      visionEnhanced: false,
      reason: "darkness",
    });
  });

  it("does not apply the darkness modifier when the target square is illuminated", () => {
    const observer = combatant("observer", { x: 1, y: 1 });
    const target = combatant("target", { x: 5, y: 1 });
    const scenario = scenarioWith(observer, target, {
      defaultLighting: "dark",
      lightingByCell: { "5:1": "illuminated" },
    });

    expect(tacticalVisibilityAssessment(scenario, observer, target)).toMatchObject({
      observable: true,
      targetLighting: "illuminated",
      range: 4,
      darknessModifier: 0,
      reason: "illuminated-target",
    });
  });

  it.each([
    ["character vision", { visionMode: "enhanced" as const }],
    ["weapon vision", { weapon: { ...weapon, enhancedVision: true } }],
  ])("does not apply the darkness modifier with %s enhancement", (_label, overrides) => {
    const observer = combatant("observer", { x: 1, y: 1 }, overrides);
    const target = combatant("target", { x: 5, y: 1 });

    expect(tacticalVisibilityAssessment(scenarioWith(observer, target, { defaultLighting: "dark" }), observer, target)).toMatchObject({
      observable: true,
      range: 4,
      darknessModifier: 0,
      visionEnhanced: true,
      reason: "enhanced-vision",
    });
  });

  it("reports a wall-blocked target as unobservable", () => {
    const observer = combatant("observer", { x: 1, y: 1 });
    const target = combatant("target", { x: 3, y: 1 });
    const scenario = scenarioWith(observer, target, {
      walls: [{ id: "blocking-wall", from: { x: 2, y: 0 }, to: { x: 2, y: 2 } }],
      defaultLighting: "dark",
    });

    expect(tacticalVisibilityAssessment(scenario, observer, target)).toMatchObject({
      observable: false,
      hasLineOfSight: false,
      darknessModifier: 0,
      reason: "blocked",
    });
  });

  it("reports a concealed target as unobservable before applying lighting", () => {
    const observer = combatant("observer", { x: 1, y: 1 });
    const target = combatant("target", { x: 3, y: 1 }, { concealed: true });

    expect(tacticalVisibilityAssessment(scenarioWith(observer, target), observer, target)).toMatchObject({
      observable: false,
      hasLineOfSight: true,
      darknessModifier: 0,
      reason: "concealed",
    });
  });

  it("keeps a dark target in the tactical ranged-target list", () => {
    const observer = combatant("observer", { x: 1, y: 1 });
    const target = combatant("target", { x: 5, y: 1 });

    expect(tacticalRangedEnemies(scenarioWith(observer, target, { defaultLighting: "dark" }), observer.id)).toContainEqual(target);
  });

  it("applies the tactical darkness modifier during attack resolution", () => {
    let state = reducer(undefined, initializeTacticalMap([{ id: "crew-1", weaponSkill: 0 }, { id: "crew-2", weaponSkill: 0 }]));
    state = {
      ...state,
      tacticalMap: {
        ...state.tacticalMap!,
        scenario: {
          ...state.tacticalMap!.scenario,
          defaultLighting: "dark",
          lightingByCell: undefined,
          walls: [],
          doors: [],
          combatants: state.tacticalMap!.scenario.combatants.map((unit) => unit.id === "crew-1"
            ? { ...unit, position: { x: 1, y: 1 }, facing: "east" as const }
            : unit.id === "enemy-1"
              ? { ...unit, position: { x: 3, y: 1 } }
              : unit),
        },
        activeCharacterId: "crew-1",
      },
    } satisfies CharacterCombatState;

    state = reducer(state, selectTacticalAttackTarget("enemy-1"));
    state = reducer(state, selectTacticalAttackMode("snap"));
    state = reducer(state, confirmTacticalAttack({ hitDice: { first: 4, second: 4 }, woundDice: { first: 1, second: 1 } }));

    expect(state.tacticalMap?.events[0]).toContain("hit 5/8 · miss");
  });
});
