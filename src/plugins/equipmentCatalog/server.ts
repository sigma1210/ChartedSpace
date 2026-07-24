import "server-only";

import { prisma } from "@/lib/prisma";
import { characterPrisma } from "@/plugins/characters/server/characterPrisma";
import { equipmentCatalog, equipmentCatalogById } from "./catalog";
import {
  availabilityModifiers,
  characteristicModifier,
  isEquipmentLegal,
  monthForTurn,
  priceForMultiplier,
  requiresAvailabilityCheck,
  totalAvailabilityModifier,
  type AvailabilityWorld,
} from "./rules";

const EHEX = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const ehexValue = (value: string) => {
  const parsed = EHEX.indexOf(value.toUpperCase());
  return parsed < 0 ? 0 : parsed;
};

const parseLocation = (location: string | null) => {
  if (!location) return null;
  const split = location.indexOf(":");
  if (split < 1 || split === location.length - 1) return null;
  return { sector: location.slice(0, split), hex: location.slice(split + 1) };
};

const normalizedSkillLevel = (
  skills: readonly { name: string; level: number }[],
) => {
  const levels = skills
    .filter(({ name }) => {
      const normalized = name.trim().toLowerCase();
      return normalized === "broker" || normalized === "streetwise";
    })
    .map(({ level }) => level);
  return levels.length ? Math.max(...levels) : -3;
};

export const loadEquipmentPurchaseContext = async (
  userId: string,
  requestedPurchaserCrewId?: string | null,
) => {
  const ship = await prisma.ship.findUnique({
    where: { userId },
    select: {
      id: true,
      name: true,
      currentLocation: true,
      crew: {
        select: {
          id: true,
          characterId: true,
          npcName: true,
          isOwnerOperator: true,
          keySkillName: true,
          keySkillLevel: true,
        },
      },
      user: { select: { currentTurn: true } },
    },
  });
  if (!ship) throw new Error("No active ship");

  const location = parseLocation(ship.currentLocation);
  if (!location) throw new Error("The ship is not at a world");

  const world = await prisma.world.findFirst({
    where: {
      hex: location.hex,
      sector: { abbreviation: location.sector },
    },
    select: {
      name: true,
      starport: true,
      population: true,
      lawLevel: true,
      techLevel: true,
      remarks: true,
    },
  });
  if (!world) throw new Error("Current world was not found");

  const ownerCrew = ship.crew.find((member) => member.isOwnerOperator && member.characterId);
  if (!ownerCrew?.characterId) throw new Error("The ship has no owner-operator character");

  const characterIds = ship.crew.flatMap((member) => member.characterId ? [member.characterId] : []);
  const characters = characterIds.length
    ? await characterPrisma.character.findMany({
        where: { id: { in: characterIds } },
        select: {
          id: true,
          name: true,
          credits: true,
          intelligence: true,
          skills: { select: { name: true, level: true } },
        },
      })
    : [];
  const characterById = new Map(characters.map((character) => [character.id, character]));
  const owner = characterById.get(ownerCrew.characterId);
  if (!owner) throw new Error("The owner-operator character was not found");

  const crew = ship.crew.map((member) => {
    const character = member.characterId ? characterById.get(member.characterId) : null;
    const npcSkills = member.keySkillName
      ? [{ name: member.keySkillName, level: member.keySkillLevel }]
      : [];
    const skills = character?.skills ?? npcSkills;
    return {
      id: member.id,
      name: character?.name ?? member.npcName ?? "Crew",
      skillLevel: normalizedSkillLevel(skills),
      characteristicDM: character ? characteristicModifier(character.intelligence) : 0,
    };
  });
  const purchaser = crew.find((member) => member.id === requestedPurchaserCrewId) ?? crew[0] ?? null;
  if (!purchaser) throw new Error("The ship has no crew available to make a purchase");

  const availabilityWorld: AvailabilityWorld = {
    lawLevel: ehexValue(world.lawLevel),
    techLevel: ehexValue(world.techLevel),
    population: ehexValue(world.population),
    starport: world.starport,
    tradeCodes: world.remarks,
  };

  return {
    ship: { id: ship.id, name: ship.name },
    location: ship.currentLocation!,
    currentTurn: ship.user?.currentTurn ?? 1,
    world: {
      name: world.name,
      ...availabilityWorld,
    },
    owner: { id: owner.id, credits: owner.credits },
    crew,
    purchaser,
  };
};

export const buildEquipmentMarket = async (
  context: Awaited<ReturnType<typeof loadEquipmentPurchaseContext>>,
  priceMultiplier: 1 | 2 | 3,
) => {
  const attempts = await characterPrisma.equipmentAvailabilityAttempt.findMany({
    where: {
      shipId: context.ship.id,
      purchaserCrewId: context.purchaser.id,
      worldLocation: context.location,
    },
    orderBy: { attemptedTurn: "desc" },
  });
  const currentMonth = monthForTurn(context.currentTurn);

  return equipmentCatalog
    .filter((item) => isEquipmentLegal(item, context.world))
    .map((item) => {
      const availabilityRequired = requiresAvailabilityCheck(item, context.world);
      const itemAttempts = attempts.filter((attempt) => attempt.catalogItemId === item.id);
      const priorAttemptsThisMonth = itemAttempts.filter(
        (attempt) => !attempt.succeeded && monthForTurn(attempt.attemptedTurn) === currentMonth,
      ).length;
      const modifierLines = availabilityModifiers({
        item,
        world: context.world,
        skillLevel: context.purchaser.skillLevel,
        characteristicDM: context.purchaser.characteristicDM,
        priceMultiplier,
        priorAttemptsThisMonth,
      });
      const lastFailedAttempt = itemAttempts.find((attempt) => !attempt.succeeded) ?? null;
      return {
        ...item,
        availabilityRequired,
        purchasePrice: availabilityRequired ? priceForMultiplier(item, priceMultiplier) : item.price,
        modifierLines: availabilityRequired ? modifierLines : [],
        totalModifier: availabilityRequired ? totalAvailabilityModifier(modifierLines) : 0,
        retryAvailable: !availabilityRequired || !lastFailedAttempt || lastFailedAttempt.attemptedTurn < context.currentTurn,
        retryTurn: availabilityRequired && lastFailedAttempt && lastFailedAttempt.attemptedTurn >= context.currentTurn
          ? lastFailedAttempt.attemptedTurn + 1
          : null,
      };
    });
};

export const purchaseEquipment = async ({
  userId,
  purchaserCrewId,
  catalogItemId,
  priceMultiplier,
}: {
  userId: string;
  purchaserCrewId: string;
  catalogItemId: string;
  priceMultiplier: 1 | 2 | 3;
}) => {
  const context = await loadEquipmentPurchaseContext(userId, purchaserCrewId);
  const item = equipmentCatalogById.get(catalogItemId);
  if (!item || !isEquipmentLegal(item, context.world)) {
    throw new Error("That equipment is not legally available here");
  }
  const availabilityRequired = requiresAvailabilityCheck(item, context.world);
  const purchasePrice = availabilityRequired ? priceForMultiplier(item, priceMultiplier) : item.price;
  if (context.owner.credits < purchasePrice) {
    throw new Error("The owner-operator does not have enough credits");
  }

  if (!availabilityRequired) {
    const lockerItem = await characterPrisma.$transaction(async (transaction) => {
      const debit = await transaction.character.updateMany({
        where: {
          id: context.owner.id,
          credits: { gte: purchasePrice },
        },
        data: { credits: { decrement: purchasePrice } },
      });
      if (debit.count !== 1) throw new Error("The owner-operator does not have enough credits");
      return transaction.shipLockerItem.create({
        data: {
          shipId: context.ship.id,
          catalogItemId: item.id,
          purchasePrice,
          purchasedAtTurn: context.currentTurn,
          purchasedAtLocation: context.location,
          purchaserCrewId: context.purchaser.id,
        },
      });
    });
    return {
      succeeded: true,
      availabilityRequired: false,
      item: { id: item.id, name: item.name },
      purchaserName: context.purchaser.name,
      price: purchasePrice,
      dice: null,
      rawRoll: null,
      modifierLines: [],
      totalModifier: null,
      total: null,
      lockerItemId: lockerItem.id,
    };
  }

  const attempts = await characterPrisma.equipmentAvailabilityAttempt.findMany({
    where: {
      shipId: context.ship.id,
      purchaserCrewId: context.purchaser.id,
      catalogItemId: item.id,
      worldLocation: context.location,
    },
    orderBy: { attemptedTurn: "desc" },
  });
  const lastFailedAttempt = attempts.find((attempt) => !attempt.succeeded) ?? null;
  if (lastFailedAttempt && lastFailedAttempt.attemptedTurn >= context.currentTurn) {
    throw new Error(`This purchaser can retry on turn ${lastFailedAttempt.attemptedTurn + 1}`);
  }

  const currentMonth = monthForTurn(context.currentTurn);
  const priorAttemptsThisMonth = attempts.filter(
    (attempt) => !attempt.succeeded && monthForTurn(attempt.attemptedTurn) === currentMonth,
  ).length;
  const modifierLines = availabilityModifiers({
    item,
    world: context.world,
    skillLevel: context.purchaser.skillLevel,
    characteristicDM: context.purchaser.characteristicDM,
    priceMultiplier,
    priorAttemptsThisMonth,
  });
  const totalModifier = totalAvailabilityModifier(modifierLines);
  const dice = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ] as const;
  const rawRoll = dice[0] + dice[1];
  const total = rawRoll + totalModifier;
  const succeeded = total >= 8;
  const lockerItem = await characterPrisma.$transaction(async (transaction) => {
    let createdItem = null;
    if (succeeded) {
      const debit = await transaction.character.updateMany({
        where: {
          id: context.owner.id,
          credits: { gte: purchasePrice },
        },
        data: { credits: { decrement: purchasePrice } },
      });
      if (debit.count !== 1) throw new Error("The owner-operator does not have enough credits");
      createdItem = await transaction.shipLockerItem.create({
        data: {
          shipId: context.ship.id,
          catalogItemId: item.id,
          purchasePrice,
          purchasedAtTurn: context.currentTurn,
          purchasedAtLocation: context.location,
          purchaserCrewId: context.purchaser.id,
        },
      });
    }
    await transaction.equipmentAvailabilityAttempt.create({
      data: {
        shipId: context.ship.id,
        purchaserCrewId: context.purchaser.id,
        catalogItemId: item.id,
        worldLocation: context.location,
        attemptedTurn: context.currentTurn,
        succeeded,
        priceMultiplier,
        rawRoll,
        totalModifier,
      },
    });
    return createdItem;
  });

  return {
    succeeded,
    availabilityRequired: true,
    item: { id: item.id, name: item.name },
    purchaserName: context.purchaser.name,
    price: succeeded ? purchasePrice : 0,
    dice,
    rawRoll,
    modifierLines,
    totalModifier,
    total,
    lockerItemId: lockerItem?.id ?? null,
  };
};
