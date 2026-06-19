import type { ShipTradeCapabilitiesProvider } from "@/plugins/shipTradeCapabilities";
import { shipPluginId } from "./metadata";

const TRADE_SKILL_NAMES = {
  Broker: "broker",
  Streetwise: "streetwise",
  Admin: "admin",
  Steward: "steward",
} as const;

type TradeSkillName = keyof typeof TRADE_SKILL_NAMES;

const isTradeSkillName = (name: string | null): name is TradeSkillName =>
  name !== null && name in TRADE_SKILL_NAMES;

export const shipTradeCapabilitiesProvider = {
  id: "ship.tradeCapabilities",
  pluginId: shipPluginId,
  priority: 100,
  selectCapabilities: (state) => {
    const ship = state.plugins.shipPlugin.ship;
    if (!ship) return null;

    const usedCargoTons = ship.cargo.reduce((sum, lot) => sum + lot.tons, 0);
    const crewTradeSkills = {
      broker: 0,
      streetwise: 0,
      admin: 0,
      steward: 0,
    };

    for (const member of ship.crew) {
      if (!isTradeSkillName(member.keySkillName)) continue;
      const skillKey = TRADE_SKILL_NAMES[member.keySkillName];
      crewTradeSkills[skillKey] = Math.max(crewTradeSkills[skillKey], member.keySkillLevel);
    }

    return {
      shipId: ship.id,
      status: ship.status,
      isDocked: ship.status === "docked",
      currentWorld: {
        location: ship.currentLocation,
        name: ship.worldName,
        sectorAbbr: ship.sectorAbbr,
        hex: ship.hex,
      },
      cargoCapacity: ship.cargoCapacity,
      usedCargoTons,
      remainingCargoTons: Math.max(0, ship.cargoCapacity - usedCargoTons),
      cargo: ship.cargo,
      crewTradeSkills,
    };
  },
} satisfies ShipTradeCapabilitiesProvider;
