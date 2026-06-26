import type { GenerationPayload } from "../types";

export const payloadString = (
  payload: GenerationPayload | undefined,
  key: string,
): string | null => {
  const value = payload?.[key];
  return typeof value === "string" ? value : null;
};

export const payloadStringList = (
  payload: GenerationPayload | undefined,
  key: string,
): string[] => {
  const value = payload?.[key];
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

export const payloadNumber = (
  payload: GenerationPayload | undefined,
  key: string,
): number | null => {
  const value = payload?.[key];
  return typeof value === "number" ? value : null;
};

export const payloadBoolean = (
  payload: GenerationPayload | undefined,
  key: string,
): boolean | null => {
  const value = payload?.[key];
  return typeof value === "boolean" ? value : null;
};
