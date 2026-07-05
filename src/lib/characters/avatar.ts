import type { CharacterGender } from "./types";

export interface AvatarSlugOptionDefinition {
  id: string;
  label: string;
  prompt: string;
}

export interface AvatarSlugFieldDefinition {
  key: string;
  label: string;
  options: readonly AvatarSlugOptionDefinition[];
  required?: boolean;
  defaultOptionId?: string;
}

export type AvatarSlugValues = Record<string, string>;

export interface CharacterAvatarImage {
  id: string;
  type: "portrait" | (string & {});
  version: number;
  path: string;
  promptSlug: string;
  age?: number;
  createdAt?: string;
}

export interface CharacterAvatar {
  slugValues: AvatarSlugValues;
  promptSlug: string;
  currentPortraitPath?: string | null;
  images: CharacterAvatarImage[];
}

export const DEFAULT_AVATAR_SLUG_FIELDS: readonly AvatarSlugFieldDefinition[] = [
  {
    key: "gender",
    label: "Gender",
    required: true,
    defaultOptionId: "female",
    options: [
      { id: "female", label: "Female", prompt: "female" },
      { id: "male", label: "Male", prompt: "male" },
    ],
  },
  {
    key: "build",
    label: "Build",
    required: true,
    defaultOptionId: "average",
    options: [
      { id: "slim", label: "Slim", prompt: "slim build" },
      { id: "average", label: "Average", prompt: "average build" },
      { id: "athletic", label: "Athletic", prompt: "athletic build" },
      { id: "heavy", label: "Heavy", prompt: "heavy build" },
    ],
  },
  {
    key: "clothing",
    label: "Clothing",
    required: true,
    defaultOptionId: "blue",
    options: [
      { id: "blue", label: "Blue", prompt: "blue clothing" },
      { id: "black", label: "Black", prompt: "black clothing" },
      { id: "white", label: "White", prompt: "white clothing" },
      { id: "red", label: "Red", prompt: "red clothing" },
      { id: "green", label: "Green", prompt: "green clothing" },
      { id: "grey", label: "Grey", prompt: "grey clothing" },
    ],
  },
  {
    key: "hairColor",
    label: "Hair",
    required: true,
    defaultOptionId: "brown",
    options: [
      { id: "black", label: "Black", prompt: "black hair" },
      { id: "brown", label: "Brown", prompt: "brown hair" },
      { id: "blonde", label: "Blonde", prompt: "blonde hair" },
      { id: "red", label: "Red", prompt: "red hair" },
      { id: "gray", label: "Gray", prompt: "gray hair" },
    ],
  },
  {
    key: "eyeColor",
    label: "Eyes",
    required: true,
    defaultOptionId: "brown",
    options: [
      { id: "brown", label: "Brown", prompt: "brown eyes" },
      { id: "blue", label: "Blue", prompt: "blue eyes" },
      { id: "green", label: "Green", prompt: "green eyes" },
      { id: "hazel", label: "Hazel", prompt: "hazel eyes" },
    ],
  },
] as const;

export const buildDefaultAvatarSlugValues = (
  fields: readonly AvatarSlugFieldDefinition[],
  overrides: AvatarSlugValues = {},
): AvatarSlugValues => {
  const values: AvatarSlugValues = {};

  for (const field of fields) {
    const override = overrides[field.key];
    const defaultOptionId = override ?? field.defaultOptionId;
    if (defaultOptionId) values[field.key] = defaultOptionId;
  }

  return values;
};

export const buildAvatarSlugValuesForGender = (
  fields: readonly AvatarSlugFieldDefinition[],
  gender: CharacterGender | null | undefined,
) => buildDefaultAvatarSlugValues(fields, gender ? { gender } : {});

export const buildAvatarPromptSlug = (
  fields: readonly AvatarSlugFieldDefinition[],
  values: AvatarSlugValues,
) => {
  const prompts: string[] = [];

  for (const field of fields) {
    const optionId = values[field.key];
    if (!optionId) {
      if (field.required) throw new Error(`Missing avatar slug value for ${field.key}`);
      continue;
    }

    const option = field.options.find((item) => item.id === optionId);
    if (!option) throw new Error(`Unknown avatar slug value ${field.key}:${optionId}`);
    prompts.push(option.prompt);
  }

  return prompts.join(", ");
};

export const characterAvatarPublicDirectory = (characterId: string) =>
  `/generated/avatars/characters/${characterId}`;

export const characterAvatarPublicPath = ({
  characterId,
  type = "portrait",
  version = 1,
  age,
  extension = "png",
}: {
  characterId: string;
  type?: string;
  version?: number;
  age?: number;
  extension?: string;
}) => {
  const ageSegment = typeof age === "number" ? `-age-${age}` : "";
  return `${characterAvatarPublicDirectory(characterId)}/${type}${ageSegment}-v${version}.${extension}`;
};

export const characterAvatarFilePath = (
  publicPath: string,
  publicRoot = "public",
) => `${publicRoot.replace(/\/+$/, "")}/${publicPath.replace(/^\/+/, "")}`;
