import { NextResponse } from "next/server";
import type { Prisma as CharacterDbPrisma } from "@/generated/character-prisma";
import type { CharacterSheet } from "@/lib/characters/types";
import { getCurrentUser } from "@/lib/devAuth";
import { generateCharacterPortraitAvatar } from "@/plugins/characters/server/avatarGenerationService";
import { characterPrisma } from "@/plugins/characters/server/characterPrisma";

type Params = { params: Promise<{ id: string }> };

const runAvatarGeneration = async ({
  characterId,
  sheet,
}: {
  characterId: string;
  sheet: CharacterSheet;
}) => {
  const avatarResult = await generateCharacterPortraitAvatar({
    characterId,
    sheet,
  });

  if (!avatarResult) {
    console.warn(`[POST /api/characters/${characterId}/avatar/generate] avatar prompt missing`);
    return;
  }

  await characterPrisma.character.update({
    where: { id: characterId },
    data: {
      sheet: avatarResult.sheet as unknown as CharacterDbPrisma.InputJsonValue,
    },
  });
};

export const POST = async (_request: Request, { params }: Params) => {
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
      return NextResponse.json({ error: "Only player characters can generate avatars" }, { status: 400 });
    }

    const sheet = character.sheet as CharacterSheet | null;
    if (!sheet) return NextResponse.json({ error: "Character sheet not found" }, { status: 400 });
    if (!sheet.avatar?.promptSlug?.trim()) {
      return NextResponse.json({ error: "Avatar settings must be saved before generation" }, { status: 400 });
    }

    void runAvatarGeneration({
      characterId: character.id,
      sheet,
    }).catch((err) => {
      console.error(`[POST /api/characters/${character.id}/avatar/generate]`, err);
    });

    return NextResponse.json({ queued: true }, { status: 202 });
  } catch (err) {
    console.error("[POST /api/characters/:id/avatar/generate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
