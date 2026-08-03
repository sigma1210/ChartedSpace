import {
  freshTacticalMap,
  type TacticalCrewInput,
} from "@/plugins/characterCombat/tacticalScenarioReducers";

const DEFAULT_TACTICAL_CREW = [
  {
    id: "player-1",
    name: "Boarding Lead",
    weaponSkill: 1,
    meleeRating: 2,
    skills: [{ name: "Security", level: 1 }],
  },
  {
    id: "player-2",
    name: "Boarding Support",
    weaponSkill: 0,
    meleeRating: 1,
    skills: [],
  },
] satisfies TacticalCrewInput[];

export const buildDefaultTacticalMap = () =>
  freshTacticalMap(DEFAULT_TACTICAL_CREW, undefined, {
    setup: true,
    lightingPreset: "exterior-dark",
  });

export const DEFAULT_TACTICAL_MAP = buildDefaultTacticalMap();
