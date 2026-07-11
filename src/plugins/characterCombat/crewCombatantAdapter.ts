import type { CharacterSummary } from "@/plugins/characters/charactersSlice";
import type { CrewMember } from "@/plugins/ship/shipPluginSlice";
import type { CombatScenario } from "./types";

export interface BoardingCandidate { id: string; crewId: string; characterId: string | null; name: string; role: string; isOwnerOperator: boolean; gunCombat: number; melee: number; medic: number }

const skillLevel = (skills: Array<{ name: string; level: number }>, name: string) => skills.find((skill) => skill.name === name)?.level ?? 0;

export const buildBoardingCandidates = (crew: CrewMember[], characters: CharacterSummary[]): BoardingCandidate[] => {
  const charactersById = new Map(characters.map((character) => [character.id, character]));
  return crew.flatMap((member) => {
    const character = member.characterId ? charactersById.get(member.characterId) : null;
    const name = character?.name ?? member.characterName ?? member.npcName;
    if (!name) return [];
    const skills = character?.skills ?? member.skills ?? [];
    const keySkill = (skillName: string) => member.keySkillName === skillName ? Math.max(0, member.keySkillLevel) : 0;
    return [{ id: member.id, crewId: member.id, characterId: member.characterId, name, role: member.role, isOwnerOperator: member.isOwnerOperator,
      gunCombat: Math.max(skillLevel(skills, "Gun Combat"), keySkill("Gun Combat")),
      melee: Math.max(skillLevel(skills, "Melee"), keySkill("Melee")),
      medic: Math.max(skillLevel(skills, "Medic"), skillLevel(skills, "Medical"), keySkill("Medic"), keySkill("Medical")) }];
  });
};

export const defaultBoardingTeamIds = (candidates: BoardingCandidate[], currentCharacterId: string | null) => {
  const ranked = [...candidates].sort((a, b) => b.gunCombat + b.melee - (a.gunCombat + a.melee) || b.medic - a.medic);
  const first = candidates.find((candidate) => candidate.characterId === currentCharacterId) ?? candidates.find((candidate) => candidate.isOwnerOperator) ?? ranked[0];
  if (!first) return [];
  const second = ranked.find((candidate) => candidate.id !== first.id);
  return second ? [first.id, second.id] : [first.id];
};

export const hydrateScenarioBoardingTeam = (scenario: CombatScenario, candidates: BoardingCandidate[]) => {
  if (candidates.length !== 2) return scenario;
  scenario.combatants.filter((unit) => unit.side === "player").slice(0, 2).forEach((unit, index) => {
    const candidate = candidates[index];
    unit.name = candidate.name;
    unit.weaponSkill = candidate.gunCombat;
    unit.meleeRating = candidate.melee;
    unit.sourceCrewId = candidate.crewId;
    unit.sourceCharacterId = candidate.characterId;
  });
  return scenario;
};
