import type { CharacterSummary } from "@/plugins/characters/charactersSlice";
import type { CrewMember } from "@/plugins/ship/shipPluginSlice";
import { buildTrainingScenario } from "../trainingScenario";
import { buildBoardingCandidates, defaultBoardingTeamIds, hydrateScenarioBoardingTeam } from "../crewCombatantAdapter";

const crew = (overrides: Partial<CrewMember>): CrewMember => ({ id: "crew-1", role: "unassigned", isOwnerOperator: false, monthlySalary: 0, characterId: null, characterName: null, npcName: null, keySkillName: null, keySkillLevel: 0, skills: [], ...overrides });
const character = (overrides: Partial<CharacterSummary>): CharacterSummary => ({ id: "character-1", name: "Traveller", upp: "777777", strength: 7, dexterity: 7, endurance: 7, intelligence: 7, education: 7, socialStanding: 7, credits: 0, skills: [], worldName: null, sectorAbbr: null, hex: null, ...overrides });

describe("character combat crew adapter", () => {
  it("joins linked crew to full character combat skills", () => {
    const candidates = buildBoardingCandidates(
      [crew({ characterId: "character-1", characterName: "Stale Name", isOwnerOperator: true })],
      [character({ name: "Asha", skills: [{ name: "Gun Combat", level: 3 }, { name: "Melee", level: 2 }, { name: "Medic", level: 1 }] })],
    );
    expect(candidates[0]).toMatchObject({ id: "crew-1", characterId: "character-1", name: "Asha", isOwnerOperator: true, gunCombat: 3, melee: 2, medic: 1 });
  });

  it("maps named NPC crew using an available key combat skill", () => {
    const candidates = buildBoardingCandidates([crew({ id: "npc-crew", npcName: "Rook", keySkillName: "Gun Combat", keySkillLevel: 2 })], []);
    expect(candidates[0]).toMatchObject({ id: "npc-crew", characterId: null, name: "Rook", gunCombat: 2, melee: 0 });
  });

  it("defaults to the current or owner character and the strongest remaining combatant", () => {
    const candidates = buildBoardingCandidates([
      crew({ id: "owner", characterId: "owner-character", isOwnerOperator: true }),
      crew({ id: "marine", characterId: "marine-character" }),
      crew({ id: "medic", characterId: "medic-character" }),
    ], [
      character({ id: "owner-character", name: "Owner" }),
      character({ id: "marine-character", name: "Marine", skills: [{ name: "Gun Combat", level: 3 }] }),
      character({ id: "medic-character", name: "Medic", skills: [{ name: "Medic", level: 3 }] }),
    ]);
    expect(defaultBoardingTeamIds(candidates, "owner-character")).toEqual(["owner", "marine"]);
  });

  it("hydrates player names and skills while preserving scenario loadouts", () => {
    const scenario = buildTrainingScenario();
    const originalWeapon = scenario.combatants.find((unit) => unit.id === "player-1")!.weapon;
    const candidates = buildBoardingCandidates([
      crew({ id: "crew-a", characterId: "character-a" }),
      crew({ id: "crew-b", npcName: "NPC B", keySkillName: "Melee", keySkillLevel: 2 }),
    ], [character({ id: "character-a", name: "Character A", skills: [{ name: "Gun Combat", level: 2 }] })]);
    const hydrated = hydrateScenarioBoardingTeam(scenario, candidates);
    expect(hydrated.combatants.find((unit) => unit.id === "player-1")).toMatchObject({ name: "Character A", weaponSkill: 2, sourceCrewId: "crew-a", sourceCharacterId: "character-a", grenades: 1, medkits: 1 });
    expect(hydrated.combatants.find((unit) => unit.id === "player-2")).toMatchObject({ name: "NPC B", meleeRating: 2, sourceCrewId: "crew-b", sourceCharacterId: null });
    expect(hydrated.combatants.find((unit) => unit.id === "player-1")?.weapon).toEqual(originalWeapon);
  });

  it("preserves training characters unless exactly two campaign candidates are selected", () => {
    const scenario = buildTrainingScenario();
    expect(hydrateScenarioBoardingTeam(scenario, []).combatants.find((unit) => unit.id === "player-1")?.name).toBe("Boarding Lead");
  });
});
