import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/devAuth";
import { calculateSalary, ROLE_REQUIRED_SKILL } from "@/lib/crew";
import { roll2d6 } from "@/lib/dice";
import {
  clearCharacterShipAssignment,
  getCharacterCreditsForUser,
  setCharacterCreditsForUser,
} from "@/plugins/characters/server/characterService";
import { reopenCrewAvailablePosting } from "@/plugins/characters/server/postingService";
import shipTypes from "@/data/classic/ships.json";

export const hireCrewMember = async (req: Request) => {
  try {
    const body = await req.json() as {
      role:         string;
      npcName:      string;
      keySkillLevel: number;
      replaceCrewId?: string;
    };

    const { role, npcName, keySkillLevel, replaceCrewId } = body;
    if (!role || !npcName) {
      return NextResponse.json({ error: "role and npcName required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        type: true,
        crew: {
          select: {
            id: true,
          },
        },
      },
    });
    if (!ship) return NextResponse.json({ error: "No ship found" }, { status: 404 });

    const typeData = (shipTypes as Array<{ type: string; stateroomsTotal?: number }>)
      .find(s => s.type === ship.type);
    const crewCapacity = typeData?.stateroomsTotal ?? 0;
    if (crewCapacity > 0 && ship.crew.length >= crewCapacity) {
      return NextResponse.json({ error: "Crew pool is at stateroom capacity" }, { status: 409 });
    }

    const keySkillName  = ROLE_REQUIRED_SKILL[role] ?? null;
    const monthlySalary = calculateSalary(role, keySkillLevel);

    await prisma.$transaction(async (tx) => {
      if (replaceCrewId) {
        const existing = await tx.shipCrew.findUnique({ where: { id: replaceCrewId } });
        if (existing && existing.shipId === ship.id && !existing.isOwnerOperator) {
          await tx.shipCrew.update({
            where: { id: replaceCrewId },
            data: { role: "unassigned" },
          });
        }
      }

      await tx.shipCrew.create({
        data: {
          shipId:          ship.id,
          characterId:     null,
          npcName,
          role,
          isOwnerOperator: false,
          monthlySalary,
          keySkillName,
          keySkillLevel,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST crew hire]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

type CrewMemberParams = { params: Promise<{ crewId: string }> };

const parseText = (value: unknown) =>
  typeof value === "string" ? value.trim() : null;

export const fireCrewMember = async (req: Request, { params }: CrewMemberParams) => {
  try {
    const { crewId } = await params;
    const url = new URL(req.url);
    const currentCharacterId = parseText(url.searchParams.get("currentCharacterId"));

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({
      where: { userId: user.id },
      select: {
        id: true,
        currentLocation: true,
      },
    });
    if (!ship) return NextResponse.json({ error: "No ship found" }, { status: 404 });

    const crew = await prisma.shipCrew.findUnique({ where: { id: crewId } });

    if (!crew || crew.shipId !== ship.id) {
      return NextResponse.json({ error: "Crew member not found" }, { status: 404 });
    }
    if (crew.isOwnerOperator) {
      return NextResponse.json({ error: "Cannot fire the owner-operator" }, { status: 400 });
    }
    if (currentCharacterId && crew.characterId === currentCharacterId) {
      return NextResponse.json({ error: "Cannot remove the current character from crew" }, { status: 400 });
    }

    await prisma.shipCrew.delete({ where: { id: crewId } });
    if (crew.characterId) {
      await clearCharacterShipAssignment({
        characterId: crew.characterId,
        userId: user.id,
        location: ship.currentLocation,
      });
      await reopenCrewAvailablePosting({
        characterId: crew.characterId,
        userId: user.id,
        location: ship.currentLocation,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE crew member]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const updateCrewMember = async (req: Request, { params }: CrewMemberParams) => {
  try {
    const { crewId } = await params;
    const body = await req.json() as { role?: string };

    if (!body.role) {
      return NextResponse.json({ error: "role is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({ where: { userId: user.id } });
    if (!ship) return NextResponse.json({ error: "No ship found" }, { status: 404 });

    const crew = await prisma.shipCrew.findUnique({ where: { id: crewId } });

    if (!crew || crew.shipId !== ship.id) {
      return NextResponse.json({ error: "Crew member not found" }, { status: 404 });
    }
    if (!crew.isOwnerOperator) {
      return NextResponse.json({ error: "Only the owner-operator's role can be changed this way" }, { status: 400 });
    }
    if (crew.role === body.role) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      const displaced = await tx.shipCrew.findFirst({
        where: { shipId: ship.id, role: body.role, isOwnerOperator: false },
      });
      if (displaced) {
        await tx.shipCrew.update({
          where: { id: displaced.id },
          data: { role: "unassigned" },
        });
      }

      await tx.shipCrew.update({ where: { id: crewId }, data: { role: body.role } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH crew member]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

export const settleCrewWages = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const ship = await prisma.ship.findFirst({
      where: { userId: user.id },
      select: {
        id:          true,
        type:        true,
        isMortgaged: true,
        crew: {
          select: {
            id:              true,
            npcName:         true,
            characterId:     true,
            isOwnerOperator: true,
            monthlySalary:   true,
            unpaidTurns:     true,
          },
        },
      },
    });

    if (!ship) return NextResponse.json({ error: "No ship found" }, { status: 404 });

    const ownerEntry = ship.crew.find(c => c.isOwnerOperator);
    if (!ownerEntry?.characterId) {
      return NextResponse.json({ error: "No owner-operator found" }, { status: 400 });
    }

    const owner = await getCharacterCreditsForUser(user.id, ownerEntry.characterId);
    if (!owner) return NextResponse.json({ error: "Owner character not found" }, { status: 404 });

    const typeData = (shipTypes as Array<{ type: string; monthlyMortgage?: number }>)
      .find(s => s.type === ship.type);
    const mortgage = ship.isMortgaged ? (typeData?.monthlyMortgage ?? 0) : 0;
    const salaries = ship.crew.reduce((sum, c) => sum + c.monthlySalary, 0);
    const total    = mortgage + salaries;

    if (total === 0) {
      return NextResponse.json({ total: 0, newCredits: owner.credits, quit: [], unpaidCrew: [] });
    }

    const canPay     = owner.credits >= total;
    const newCredits = owner.credits - total;

    const npcCrew = ship.crew.filter(c => !c.isOwnerOperator);
    const quitIds:   string[] = [];
    const quitNames: string[] = [];

    if (!canPay) {
      for (const npc of npcCrew) {
        const threshold = npc.unpaidTurns + 2;
        const roll = roll2d6();
        if (roll <= threshold) {
          quitIds.push(npc.id);
          quitNames.push(npc.npcName ?? "Unknown");
        }
      }
    }

    const unpaidNames = canPay
      ? []
      : npcCrew
          .filter(c => !quitIds.includes(c.id))
          .map(c => c.npcName ?? "Unknown");

    await prisma.$transaction(async (tx) => {
      if (canPay) {
        if (npcCrew.length > 0) {
          await tx.shipCrew.updateMany({
            where: { id: { in: npcCrew.map(c => c.id) } },
            data:  { unpaidTurns: 0 },
          });
        }
      } else {
        if (quitIds.length > 0) {
          await tx.shipCrew.deleteMany({ where: { id: { in: quitIds } } });
        }
        const stayedIds = npcCrew.filter(c => !quitIds.includes(c.id)).map(c => c.id);
        if (stayedIds.length > 0) {
          await tx.shipCrew.updateMany({
            where: { id: { in: stayedIds } },
            data:  { unpaidTurns: { increment: 1 } },
          });
        }
      }
    });

    const updatedOwner = await setCharacterCreditsForUser({
      userId:      user.id,
      characterId: ownerEntry.characterId,
      credits:     newCredits,
    });
    if (!updatedOwner) return NextResponse.json({ error: "Owner character not found" }, { status: 404 });

    return NextResponse.json({
      total,
      newCredits:  updatedOwner.credits,
      quit:       quitNames,
      unpaidCrew: unpaidNames,
    });
  } catch (err) {
    console.error("[POST crew settle wages]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
