import {
  classicTravellerGenerator,
} from "./classicTravellerGenerator";
import { basicHumanLifepathDefinition } from "./basicHuman";

export const registeredCharacterGenerators = [
  classicTravellerGenerator,
] as const;

export const registeredLifepathDefinitions = [
  basicHumanLifepathDefinition,
] as const;

export const getCharacterGenerator = (id: string) =>
  registeredCharacterGenerators.find((generator) => generator.id === id) ?? null;

export const getLifepathDefinition = (id: string) =>
  registeredLifepathDefinitions.find((definition) => definition.id === id) ?? null;
