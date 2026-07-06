import { NextResponse } from "next/server";
import type { Prisma as CharacterDbPrisma } from "@/generated/character-prisma";
import {
  buildAvatarPromptSlug,
  buildDefaultAvatarSlugValues,
  DEFAULT_AVATAR_SLUG_FIELDS,
  type AvatarSlugValues,
  type CharacterAvatar,
} from "@/lib/characters/avatar";
import type { CharacterGender, CharacterSheet } from "@/lib/characters/types";
import { getCurrentUser } from "@/lib/devAuth";
import { characterPrisma } from "@/plugins/characters/server/characterPrisma";

type Params = { params: Promise<{ id: string }> };

const editableAvatarFieldKeys = new Set(["build", "clothing", "hairColor", "eyeColor"]);

const normalizeGender = (value: unknown): CharacterGender | null => {
  if (value === "female" || value === "male") return value;
  return null;
};

const avatarFieldByKey = new Map(
  DEFAULT_AVATAR_SLUG_FIELDS.map((field) => [field.key, field]),
);

const sanitizeSlugValues = (
  requestedValues: unknown,
  existingValues: AvatarSlugValues,
): { gender: CharacterGender; values: AvatarSlugValues } => {
  if (!requestedValues || typeof requestedValues !== "object" || Array.isArray(requestedValues)) {
    throw new Error("slugValues must be an object");
  }

  const gender = normalizeGender((requestedValues as Record<string, unknown>).gender);
  if (!gender) throw new Error("Character gender is required for avatar customization");

  const values = buildDefaultAvatarSlugValues(DEFAULT_AVATAR_SLUG_FIELDS, {
    ...existingValues,
    gender,
  });

  for (const key of editableAvatarFieldKeys) {
    const value = (requestedValues as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;

    const field = avatarFieldByKey.get(key);
    if (!field?.options.some((option) => option.id === value)) {
      throw new Error(`Invalid avatar slug value ${key}:${value}`);
    }
    values[key] = value;
  }

  values.gender = gender;
  return { gender, values };
};

const withAvatar = (
  sheet: CharacterSheet,
  avatar: CharacterAvatar,
): CharacterSheet => ({
  ...sheet,
  gender: normalizeGender(avatar.slugValues.gender),
  avatar,
  generation: {
    ...sheet.generation,
    metadata: {
      ...(sheet.generation.metadata ?? {}),
      avatar,
      gender: avatar.slugValues.gender,
    },
  },
});

export const PATCH = async (request: Request, { params }: Params) => {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const character = await characterPrisma.character.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        kind: true,
        sheet: true,
      },
    });
    if (!character) return NextResponse.json({ error: "Character not found" }, { status: 404 });
    if (character.kind !== "player") {
      return NextResponse.json({ error: "Only player characters can customize avatars" }, { status: 400 });
    }

    const sheet = character.sheet as CharacterSheet | null;
    if (!sheet) return NextResponse.json({ error: "Character sheet not found" }, { status: 400 });

    const body = await request.json().catch(() => ({})) as { slugValues?: unknown };
    const existingGender = normalizeGender(sheet.gender ?? sheet.generation?.metadata?.gender);
    const requestedValues = body.slugValues && typeof body.slugValues === "object" && !Array.isArray(body.slugValues)
      ? {
          ...body.slugValues,
          gender: existingGender ?? (body.slugValues as Record<string, unknown>).gender,
        }
      : body.slugValues;
    let slugValues: AvatarSlugValues;
    try {
      slugValues = sanitizeSlugValues(requestedValues, sheet.avatar?.slugValues ?? {}).values;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid avatar slug values" },
        { status: 400 },
      );
    }

    const promptSlug = buildAvatarPromptSlug(DEFAULT_AVATAR_SLUG_FIELDS, slugValues);
    const avatar: CharacterAvatar = {
      slugValues,
      promptSlug,
      currentPortraitPath: sheet.avatar?.currentPortraitPath ?? null,
      images: sheet.avatar?.images ?? [],
    };
    const updatedSheet = withAvatar(sheet, avatar);

    await characterPrisma.character.update({
      where: { id },
      data: {
        sheet: updatedSheet as unknown as CharacterDbPrisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      avatar,
      age: sheet.age,
    });
  } catch (err) {
    console.error("[PATCH /api/characters/:id/avatar]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
