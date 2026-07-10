import type { ShipSummary } from "@/plugins/ship";
import {
  maydayShipTemplates,
  type MaydayScenario,
  type MaydayShip,
  type MaydayShipTemplate,
} from "./maydayRules";

const normalizeShipType = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const findMaydayTemplate = (shipType: string): MaydayShipTemplate | null => {
  const normalizedType = normalizeShipType(shipType);

  return maydayShipTemplates.find((template) =>
    template.id === normalizedType || normalizeShipType(template.label) === normalizedType
  ) ?? null;
};

export const buildMaydayPlayerShip = (
  ship: Pick<ShipSummary, "id" | "name" | "type"> & {
    crew?: Array<Pick<
      ShipSummary["crew"][number],
      "role" | "characterName" | "npcName" | "keySkillName" | "keySkillLevel" | "skills"
    >>;
  },
): MaydayShip | null => {
  const template = findMaydayTemplate(ship.type);
  if (!template) return null;

  const gunner = ship.crew
    ?.filter((member) => member.role === "unassigned")
    .map((member) => ({
      name: member.characterName ?? member.npcName ?? "Unassigned crew",
      level: Math.max(
        0,
        member.skills?.find((skill) => skill.name === "Gunnery")?.level
          ?? (member.keySkillName === "Gunnery" ? member.keySkillLevel : 0),
      ),
    }))
    .reduce<{ name: string; level: number } | null>(
      (best, candidate) => !best || candidate.level > best.level ? candidate : best,
      null,
    ) ?? null;

  return {
    id: ship.id,
    name: ship.name,
    side: "player",
    position: { q: 0, r: 0 },
    velocity: { q: 0, r: 0 },
    thrustRating: template.thrust,
    lasers: template.lasers,
    gunnery: gunner?.level ?? 0,
    gunneryOperator: gunner?.name ?? null,
    missiles: template.missiles,
    sandcasters: template.sand > 0 ? 1 : 0,
    sand: template.sand,
    targetType: "ship",
  };
};

export const buildMaydayScenarioForPlayerShip = (
  scenario: MaydayScenario,
  ship: Pick<ShipSummary, "id" | "name" | "type"> & {
    crew?: Array<Pick<
      ShipSummary["crew"][number],
      "role" | "characterName" | "npcName" | "keySkillName" | "keySkillLevel" | "skills"
    >>;
  },
): MaydayScenario | null => {
  const mappedShip = buildMaydayPlayerShip(ship);
  if (!mappedShip) return null;

  const scenarioPlayer = scenario.encounter.ships.find((item) => item.side === "player");
  if (!scenarioPlayer) return null;

  return {
    ...scenario,
    encounter: {
      ...scenario.encounter,
      ships: scenario.encounter.ships.map((item) =>
        item.side === "player"
          ? {
              ...mappedShip,
              position: { ...scenarioPlayer.position },
              velocity: { ...scenarioPlayer.velocity },
            }
          : {
              ...item,
              position: { ...item.position },
              velocity: { ...item.velocity },
              damage: item.damage ? { ...item.damage } : undefined,
            },
      ),
      missiles: scenario.encounter.missiles?.map((missile) => ({
        ...missile,
        position: { ...missile.position },
        velocity: { ...missile.velocity },
      })),
    },
  };
};
