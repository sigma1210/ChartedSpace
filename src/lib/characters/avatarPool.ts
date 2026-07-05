import fs from "node:fs";
import path from "node:path";

import {
  type AvatarSlugValues,
  type CharacterAvatar,
  type CharacterAvatarImage,
} from "./avatar";

export interface AvatarPoolManifestItem {
  id: string;
  path: string;
  slugValues: AvatarSlugValues;
  promptSlug: string;
  variant: number;
  seed?: number;
  createdAt?: string;
}

interface AvatarPoolManifest {
  items?: AvatarPoolManifestItem[];
}

const defaultManifestPath = () =>
  path.join(process.cwd(), "public", "generated", "avatars", "pool", "manifest.json");

const readAvatarPoolManifest = (
  manifestPath = defaultManifestPath(),
): AvatarPoolManifestItem[] => {
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(raw) as AvatarPoolManifest;
    return Array.isArray(manifest.items) ? manifest.items : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    console.warn("[avatar pool] Failed to read avatar pool manifest", err);
    return [];
  }
};

const matchScore = (
  item: AvatarPoolManifestItem,
  slugValues: AvatarSlugValues,
) => {
  let score = 0;

  for (const [key, value] of Object.entries(slugValues)) {
    if (item.slugValues[key] === value) score += 1;
  }

  if (item.slugValues.gender === slugValues.gender) score += 100;
  return score;
};

const choosePoolItem = (
  items: readonly AvatarPoolManifestItem[],
  slugValues: AvatarSlugValues,
) => {
  const gender = slugValues.gender;
  const candidates = gender
    ? items.filter((item) => item.slugValues.gender === gender)
    : [...items];
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((item) => ({ item, score: matchScore(item, slugValues) }))
    .sort((left, right) => right.score - left.score);
  const bestScore = scored[0]?.score ?? 0;
  const bestMatches = scored.filter((entry) => entry.score === bestScore);

  return bestMatches[Math.floor(Math.random() * bestMatches.length)]?.item ?? null;
};

export const assignAvatarFromPool = ({
  slugValues,
  promptSlug,
  age,
  manifestPath,
}: {
  slugValues: AvatarSlugValues;
  promptSlug: string;
  age?: number;
  manifestPath?: string;
}): CharacterAvatar | null => {
  const item = choosePoolItem(readAvatarPoolManifest(manifestPath), slugValues);
  if (!item) return null;

  const image: CharacterAvatarImage = {
    id: item.id,
    type: "portrait",
    version: item.variant,
    path: item.path,
    promptSlug: item.promptSlug,
    age,
    createdAt: item.createdAt,
  };

  return {
    slugValues,
    promptSlug,
    currentPortraitPath: item.path,
    images: [image],
  };
};
