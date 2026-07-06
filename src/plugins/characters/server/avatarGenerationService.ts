import "server-only";

import type { CharacterSheet } from "@/lib/characters/types";
import {
  buildAvatarShortPrompt,
  DEFAULT_AVATAR_WORKFLOW_PATH,
  DEFAULT_COMFYUI_BASE_URL,
  generateComfyImage,
} from "@/lib/comfyui/client";
import {
  characterAvatarFilePath,
  characterAvatarPublicPath,
  type CharacterAvatar,
  type CharacterAvatarImage,
} from "@/lib/characters/avatar";

export interface CharacterAvatarGenerationResult {
  sheet: CharacterSheet;
  image: CharacterAvatarImage;
  promptId: string;
  seed: number;
}

const portraitVersion = (avatar: CharacterAvatar | null | undefined) => {
  const versions = avatar?.images
    .filter((image) => image.type === "portrait")
    .map((image) => image.version) ?? [];
  return versions.length === 0 ? 1 : Math.max(...versions) + 1;
};

export const generateCharacterPortraitAvatar = async ({
  characterId,
  sheet,
}: {
  characterId: string;
  sheet: CharacterSheet;
}): Promise<CharacterAvatarGenerationResult | null> => {
  const promptSlug = sheet.avatar?.promptSlug?.trim();
  if (!promptSlug) return null;

  const version = portraitVersion(sheet.avatar);
  const publicPath = characterAvatarPublicPath({
    characterId,
    type: "portrait",
    version,
    age: sheet.age,
  });
  const outputPath = characterAvatarFilePath(publicPath);
  const promptWithAge = typeof sheet.age === "number"
    ? `${promptSlug}, ${sheet.age} years old`
    : promptSlug;
  const result = await generateComfyImage({
    baseUrl: process.env.COMFYUI_BASE_URL ?? DEFAULT_COMFYUI_BASE_URL,
    workflowPath: process.env.COMFYUI_AVATAR_WORKFLOW_PATH ?? DEFAULT_AVATAR_WORKFLOW_PATH,
    outputPath,
    shortPrompt: buildAvatarShortPrompt(promptWithAge),
  });
  const image: CharacterAvatarImage = {
    id: `portrait-v${version}`,
    type: "portrait",
    version,
    path: publicPath,
    promptSlug,
    age: sheet.age,
    createdAt: new Date().toISOString(),
  };
  const avatar: CharacterAvatar = {
    slugValues: sheet.avatar?.slugValues ?? {},
    promptSlug,
    currentPortraitPath: publicPath,
    images: [
      ...(sheet.avatar?.images ?? []),
      image,
    ],
  };
  const updatedSheet: CharacterSheet = {
    ...sheet,
    avatar,
    generation: {
      ...sheet.generation,
      metadata: {
        ...(sheet.generation.metadata ?? {}),
        avatar,
      },
    },
  };

  return {
    sheet: updatedSheet,
    image,
    promptId: result.promptId,
    seed: result.seed,
  };
};
