import "server-only";

import { characterPrisma } from "./characterPrisma";

export const getCharacterForUser = async (
  userId: string,
  characterId: string,
) => {
  return characterPrisma.character.findFirst({
    where: {
      id: characterId,
      userId,
    },
    select: {
      id: true,
      userId: true,
    },
  });
};

export const getCharactersForUserByIds = async (
  userId: string,
  characterIds: readonly string[],
) => {
  const ids = [...new Set(characterIds.filter(Boolean))];
  if (ids.length === 0) return [];

  return characterPrisma.character.findMany({
    where: {
      id: { in: ids },
      userId,
    },
    select: {
      id: true,
      name: true,
      credits: true,
      skills: {
        select: {
          name: true,
          level: true,
        },
      },
    },
  });
};

export const getCharacterCreditsForUser = async (
  userId: string,
  characterId: string,
) => {
  return characterPrisma.character.findFirst({
    where: {
      id: characterId,
      userId,
    },
    select: {
      id: true,
      credits: true,
    },
  });
};

export const debitCharacterCreditsForUser = async ({
  userId,
  characterId,
  amount,
}: {
  userId: string;
  characterId: string;
  amount: number;
}) => {
  const result = await characterPrisma.character.updateMany({
    where: {
      id: characterId,
      userId,
      credits: { gte: amount },
    },
    data: {
      credits: { decrement: amount },
    },
  });

  if (result.count === 0) return null;
  return getCharacterCreditsForUser(userId, characterId);
};

export const creditCharacterCreditsForUser = async ({
  userId,
  characterId,
  amount,
}: {
  userId: string;
  characterId: string;
  amount: number;
}) => {
  const result = await characterPrisma.character.updateMany({
    where: {
      id: characterId,
      userId,
    },
    data: {
      credits: { increment: amount },
    },
  });

  if (result.count === 0) return null;
  return getCharacterCreditsForUser(userId, characterId);
};

export const setCharacterCreditsForUser = async ({
  userId,
  characterId,
  credits,
}: {
  userId: string;
  characterId: string;
  credits: number;
}) => {
  const result = await characterPrisma.character.updateMany({
    where: {
      id: characterId,
      userId,
    },
    data: {
      credits,
    },
  });

  if (result.count === 0) return null;
  return getCharacterCreditsForUser(userId, characterId);
};

export const countCharactersForUser = async (userId: string) => {
  return characterPrisma.character.count({
    where: { userId },
  });
};

export const recordCharacterShipAssignment = async ({
  characterId,
  userId,
  shipId,
  role,
  location,
}: {
  characterId: string;
  userId: string;
  shipId: string;
  role: string;
  location: string;
}) => {
  return characterPrisma.$transaction(async (tx) => {
    await tx.character.update({
      where: { id: characterId },
      data: {
        userId,
        currentShipId: shipId,
        currentShipRole: role,
        currentLocation: location,
      },
    });

    await tx.locationLog.create({
      data: {
        characterId,
        location,
      },
    });
  });
};

export const clearCharacterShipAssignment = async ({
  characterId,
  userId,
  location,
}: {
  characterId: string;
  userId: string;
  location: string | null;
}) => {
  return characterPrisma.$transaction(async (tx) => {
    const result = await tx.character.updateMany({
      where: {
        id: characterId,
        userId,
      },
      data: {
        currentShipId: null,
        currentShipRole: null,
        ...(location ? { currentLocation: location } : {}),
      },
    });

    if (result.count === 0) return false;

    if (location) {
      await tx.locationLog.create({
        data: {
          characterId,
          location,
        },
      });
    }

    return true;
  });
};
