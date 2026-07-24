import { equipmentCatalogById } from "../catalog";
import {
  availabilityModifiers,
  characteristicModifier,
  isEquipmentLegal,
  monthForTurn,
  priceForMultiplier,
  requiresAvailabilityCheck,
  totalAvailabilityModifier,
  type AvailabilityWorld,
} from "../rules";

const world: AvailabilityWorld = {
  lawLevel: 0,
  techLevel: 8,
  population: 8,
  starport: "C",
  tradeCodes: [],
};

describe("equipment availability rules", () => {
  const laserRifle = equipmentCatalogById.get("weapon-laser-rifle")!;

  it("hides equipment prohibited by world law and all equipment at population zero", () => {
    expect(isEquipmentLegal(laserRifle, world)).toBe(true);
    expect(isEquipmentLegal(laserRifle, { ...world, lawLevel: 2 })).toBe(false);
    expect(isEquipmentLegal(laserRifle, { ...world, population: 0 })).toBe(false);
    expect(isEquipmentLegal(equipmentCatalogById.get("weapon-body-pistol")!, world)).toBe(true);
    expect(isEquipmentLegal(equipmentCatalogById.get("weapon-body-pistol")!, { ...world, lawLevel: 1 })).toBe(false);
  });

  it("applies listed, double, and triple prices without changing catalog data", () => {
    expect(priceForMultiplier(laserRifle, 1)).toBe(3500);
    expect(priceForMultiplier(laserRifle, 2)).toBe(7000);
    expect(priceForMultiplier(laserRifle, 3)).toBe(10500);
  });

  it("uses the four-turn month for cumulative retry penalties", () => {
    expect(monthForTurn(1)).toBe(0);
    expect(monthForTurn(4)).toBe(0);
    expect(monthForTurn(5)).toBe(1);
    expect(monthForTurn(8)).toBe(1);
  });

  it("uses Traveller characteristic DMs and only checks restricted or above-TL equipment", () => {
    expect(characteristicModifier(5)).toBe(-1);
    expect(characteristicModifier(8)).toBe(0);
    expect(characteristicModifier(9)).toBe(1);
    expect(characteristicModifier(12)).toBe(2);
    expect(requiresAvailabilityCheck(equipmentCatalogById.get("weapon-autopistol")!, world)).toBe(false);
    expect(requiresAvailabilityCheck(equipmentCatalogById.get("weapon-autopistol")!, { ...world, techLevel: 4 })).toBe(true);
    expect(requiresAvailabilityCheck(equipmentCatalogById.get("weapon-laser-rifle")!, world)).toBe(true);
  });

  it("applies the CSC skill, item, TL, price, port, trade, population, and retry DMs", () => {
    const lines = availabilityModifiers({
      item: laserRifle,
      world: {
        lawLevel: 0,
        techLevel: 4,
        population: 10,
        starport: "A",
        tradeCodes: ["Hi", "In"],
      },
      skillLevel: 2,
      characteristicDM: 1,
      priceMultiplier: 3,
      priorAttemptsThisMonth: 2,
    });

    expect(lines).toEqual([
      { label: "Broker/Streetwise", value: 2 },
      { label: "Intelligence", value: 1 },
      { label: "Specialised item", value: -1 },
      { label: "Above world TL", value: -1 },
      { label: "TL difference 5–9", value: -2 },
      { label: "3× listed price", value: 2 },
      { label: "Starport A", value: 1 },
      { label: "Favourable trade classification", value: 2 },
      { label: "Population 10", value: 2 },
      { label: "Prior attempts this month", value: -2 },
    ]);
    expect(totalAvailabilityModifier(lines)).toBe(4);
  });

  it("applies each positive or negative trade-code group only once", () => {
    const lines = availabilityModifiers({
      item: equipmentCatalogById.get("weapon-autopistol")!,
      world: {
        ...world,
        tradeCodes: ["Hi", "Ht", "Lt", "Ni"],
      },
      skillLevel: 0,
      characteristicDM: 0,
      priceMultiplier: 1,
      priorAttemptsThisMonth: 0,
    });
    expect(lines.filter((line) => line.label === "Favourable trade classification")).toHaveLength(1);
    expect(lines.filter((line) => line.label === "Unfavourable trade classification")).toHaveLength(1);
  });
});
