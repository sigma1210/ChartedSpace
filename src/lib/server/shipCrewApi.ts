import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/devAuth";
import { calculateSalary, ROLE_REQUIRED_SKILL } from "@/lib/crew";
import shipTypes from "@/data/classic/ships.json";
import { characterPrisma } from "@/plugins/characters/server/characterPrisma";

type ShipTypeDefinition = {
  type: string;
  requiredCrew?: string[];
  stateroomsTotal?: number;
};

const UNASSIGNED_CREW_ROLE = "unassigned";
const CREW_POOL_SALARY_ROLE = "crew";

const parseText = (value: unknown) =>
  typeof value === "string" ? value.trim() : null;

const skillLevelForRole = (
  skills: Array<{ name: string; level: number }>,
  role: string,
) => {
  const skillName = ROLE_REQUIRED_SKILL[role] ?? null;
  if (!skillName) return { skillName: null, skillLevel: 0 };
  const skillLevel = skills.find((skill) => skill.name === skillName)?.level ?? -1;
  return { skillName, skillLevel };
};

const upsertCrewRelationship = async ({
  fromCharacterId,
  toCharacterId,
}: {
  fromCharacterId: string | null;
  toCharacterId: string;
}) => {
  if (!fromCharacterId || fromCharacterId === toCharacterId) return;

  const existing = await characterPrisma.characterRelationship.findFirst({
    where: {
      fromCharacterId,
      toCharacterId,
      type: "crew",
      source: "ship-crew-assignment",
    },
    select: { id: true },
  });

  if (existing) {
    await characterPrisma.characterRelationship.update({
      where: { id: existing.id },
      data: {
        attitude: 10,
        notes: "Ship crew assignment",
      },
    });
    return;
  }

  await characterPrisma.characterRelationship.create({
    data: {
      fromCharacterId,
      toCharacterId,
      type: "crew",
      attitude: 10,
      notes: "Ship crew assignment",
      source: "ship-crew-assignment",
    },
  });
};

export const assignShipCrewMember = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = parseText(body.action);
    const addToPool = action === "add-to-pool";
    const role = parseText(body.role);
    const characterId = parseText(body.characterId);
    const postingId = parseText(body.postingId);

    if (!characterId || (!addToPool && !role)) {
      return NextResponse.json({ error: "characterId and role are required" }, { status: 400 });
    }

    const ship = await prisma.ship.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        currentLocation: true,
        crew: {
          select: {
            id: true,
            role: true,
            characterId: true,
            isOwnerOperator: true,
            monthlySalary: true,
            npcName: true,
            keySkillName: true,
            keySkillLevel: true,
          },
        },
      },
    });
    if (!ship) return NextResponse.json({ error: "No ship found" }, { status: 404 });

    const shipType = (shipTypes as ShipTypeDefinition[]).find((item) => item.type === ship.type);
    const requiredCrew = shipType?.requiredCrew ?? [];
    if (!addToPool && (!role || !requiredCrew.includes(role))) {
      return NextResponse.json({ error: "Role is not required for this ship" }, { status: 400 });
    }
    const crewCapacity = shipType?.stateroomsTotal ?? 0;

    const character = await characterPrisma.character.findFirst({
      where: {
        id: characterId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        skills: {
          select: {
            name: true,
            level: true,
          },
        },
      },
    });
    if (!character) return NextResponse.json({ error: "Character not found" }, { status: 404 });

    if (postingId) {
      const posting = await characterPrisma.characterPosting.findFirst({
        where: {
          id: postingId,
          userId: user.id,
          characterId,
          type: "crew_available",
          status: "open",
        },
        select: {
          id: true,
          location: true,
        },
      });
      if (!posting) return NextResponse.json({ error: "Crew posting not found" }, { status: 404 });
      if (posting.location !== ship.currentLocation) {
        return NextResponse.json({ error: "Crew posting is not local to this ship" }, { status: 400 });
      }
    }

    const existingForCharacter = ship.crew.find((member) => member.characterId === characterId) ?? null;

    if (!existingForCharacter && crewCapacity > 0 && ship.crew.length >= crewCapacity) {
      return NextResponse.json({ error: "Crew pool is at stateroom capacity" }, { status: 409 });
    }

    if (addToPool) {
      const crew = existingForCharacter ?? await prisma.shipCrew.create({
        data: {
          shipId: ship.id,
          characterId,
          npcName: character.name,
          role: UNASSIGNED_CREW_ROLE,
          isOwnerOperator: false,
          monthlySalary: calculateSalary(CREW_POOL_SALARY_ROLE, 0),
          keySkillName: null,
          keySkillLevel: 0,
        },
        select: {
          id: true,
          role: true,
          isOwnerOperator: true,
          monthlySalary: true,
          characterId: true,
          npcName: true,
          keySkillName: true,
          keySkillLevel: true,
        },
      });

      await characterPrisma.$transaction(async (tx) => {
        await tx.character.update({
          where: { id: characterId },
          data: {
            currentShipId: ship.id,
            currentShipRole: existingForCharacter?.role === UNASSIGNED_CREW_ROLE
              ? null
              : existingForCharacter?.role ?? null,
            ...(ship.currentLocation ? { currentLocation: ship.currentLocation } : {}),
          },
        });

        if (ship.currentLocation) {
          await tx.locationLog.create({
            data: {
              characterId,
              location: ship.currentLocation,
            },
          });
        }

        if (postingId) {
          await tx.characterPosting.update({
            where: { id: postingId },
            data: { status: "hired" },
          });
        }
      });

      const ownerCharacterId =
        ship.crew.find((member) => member.isOwnerOperator)?.characterId ?? null;
      await upsertCrewRelationship({
        fromCharacterId: ownerCharacterId,
        toCharacterId: characterId,
      });

      return NextResponse.json({
        ok: true,
        crew: {
          ...crew,
          characterName: character.name,
        },
      });
    }

    const assignmentRole = role;
    if (!assignmentRole) {
      return NextResponse.json({ error: "role is required" }, { status: 400 });
    }

    const { skillName, skillLevel } = skillLevelForRole(character.skills, assignmentRole);
    const payableSkillLevel = Math.max(0, skillLevel);
    const existingForRole = ship.crew.find((member) => member.role === assignmentRole) ?? null;

    const monthlySalary = existingForCharacter?.isOwnerOperator
      ? 0
      : calculateSalary(role, payableSkillLevel);

    const { crew, displacedCharacterId } = await prisma.$transaction(async (tx) => {
      let displacedCharacterId: string | null = null;
      if (existingForRole && existingForRole.id !== existingForCharacter?.id) {
        displacedCharacterId = existingForRole.characterId;
        await tx.shipCrew.update({
          where: { id: existingForRole.id },
          data: { role: UNASSIGNED_CREW_ROLE },
        });
      }

      if (existingForCharacter) {
        const crew = await tx.shipCrew.update({
          where: { id: existingForCharacter.id },
          data: {
            role: assignmentRole,
            monthlySalary,
            keySkillName: skillName,
            keySkillLevel: skillLevel,
          },
          select: {
            id: true,
            role: true,
            isOwnerOperator: true,
            monthlySalary: true,
            characterId: true,
            npcName: true,
            keySkillName: true,
            keySkillLevel: true,
          },
        });
        return { crew, displacedCharacterId };
      }

      const crew = await tx.shipCrew.create({
        data: {
          shipId: ship.id,
          characterId,
          npcName: character.name,
          role: assignmentRole,
          isOwnerOperator: false,
          monthlySalary,
          keySkillName: skillName,
          keySkillLevel: skillLevel,
        },
        select: {
          id: true,
          role: true,
          isOwnerOperator: true,
          monthlySalary: true,
          characterId: true,
          npcName: true,
          keySkillName: true,
          keySkillLevel: true,
        },
      });
      return { crew, displacedCharacterId };
    });

    await characterPrisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: characterId },
        data: {
          currentShipId: ship.id,
          currentShipRole: assignmentRole,
          ...(ship.currentLocation ? { currentLocation: ship.currentLocation } : {}),
        },
      });

      if (ship.currentLocation) {
        await tx.locationLog.create({
          data: {
            characterId,
            location: ship.currentLocation,
          },
        });
      }

      if (postingId) {
        await tx.characterPosting.update({
          where: { id: postingId },
          data: { status: "hired" },
        });
      }

      if (displacedCharacterId) {
        await tx.character.update({
          where: { id: displacedCharacterId },
          data: { currentShipRole: null },
        });
      }
    });

    const ownerCharacterId =
      ship.crew.find((member) => member.isOwnerOperator)?.characterId ?? null;
    await upsertCrewRelationship({
      fromCharacterId: ownerCharacterId,
      toCharacterId: characterId,
    });

    return NextResponse.json({
      ok: true,
      crew: {
        ...crew,
        characterName: character.name,
      },
    });
  } catch (err) {
    console.error("[POST /api/ship/crew]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
