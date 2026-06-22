import {
  classicTravellerGenerator,
} from "./classicTravellerGenerator";

export const registeredCharacterGenerators = [
  classicTravellerGenerator,
] as const;

export const getCharacterGenerator = (id: string) =>
  registeredCharacterGenerators.find((generator) => generator.id === id) ?? null;
