import { freeTraderCareer } from "./freeTrader";
import { agentCareer } from "./agent";
import { scholarCareer } from "./scholar";
import { entertainerCareer } from "./entertainer";
import { navyCareer } from "./navy";
import { armyCareer } from "./army";
import { marinesCareer } from "./marines";
import { surveyScoutCareer } from "./surveyScout";
import { drifterCareer } from "./drifter";
import type { LifepathCareerDefinition } from "../../lifepathTypes";

export const basicHumanCareers = [
  freeTraderCareer,
  agentCareer,
  scholarCareer,
  entertainerCareer,
  navyCareer,
  armyCareer,
  marinesCareer,
  surveyScoutCareer,
  drifterCareer,
] as const satisfies readonly LifepathCareerDefinition[];
