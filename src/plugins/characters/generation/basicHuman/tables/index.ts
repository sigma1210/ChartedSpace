import { backgroundTables } from "./background";
import { preCareerSkillTables } from "./preCareerSkills";
import { careerSkillTables } from "./careerSkills";
import { eventTables } from "./events";
import { mishapTables } from "./mishaps";
import { benefitTables } from "./benefits";
import type { LifepathTableDefinition } from "../../lifepathTypes";

export const basicHumanTables = [
  ...backgroundTables,
  ...preCareerSkillTables,
  ...careerSkillTables,
  ...eventTables,
  ...mishapTables,
  ...benefitTables,
] as const satisfies readonly LifepathTableDefinition[];
