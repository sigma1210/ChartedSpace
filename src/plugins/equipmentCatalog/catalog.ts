export type EquipmentKind = "weapon" | "armor";

export interface EquipmentCatalogItem {
  id: string;
  combatEquipmentId: string;
  name: string;
  kind: EquipmentKind;
  techLevel: number;
  price: number;
  bannedAtLawLevel: number;
  specialised?: boolean;
  military?: boolean;
  sourceName: string;
}

export const equipmentCatalog = [
  { id: "weapon-body-pistol", combatEquipmentId: "bodyPistol", name: "Body Pistol", kind: "weapon", techLevel: 8, price: 500, bannedAtLawLevel: 1, specialised: true, sourceName: "CSC Update 2023" },
  { id: "weapon-holdout-pistol", combatEquipmentId: "holdoutPistol", name: "Holdout Pistol", kind: "weapon", techLevel: 8, price: 500, bannedAtLawLevel: 5, specialised: true, sourceName: "CSC Body Pistol" },
  { id: "weapon-autopistol", combatEquipmentId: "autopistol", name: "Autopistol", kind: "weapon", techLevel: 5, price: 200, bannedAtLawLevel: 5, sourceName: "CSC Auto Pistol" },
  { id: "weapon-shotgun", combatEquipmentId: "shotgun", name: "Shotgun", kind: "weapon", techLevel: 4, price: 200, bannedAtLawLevel: 7, sourceName: "CSC Update 2023" },
  { id: "weapon-smg", combatEquipmentId: "smg", name: "Submachine Gun", kind: "weapon", techLevel: 6, price: 400, bannedAtLawLevel: 4, sourceName: "CSC Update 2023" },
  { id: "weapon-laser-rifle", combatEquipmentId: "laserRifle", name: "Laser Rifle", kind: "weapon", techLevel: 9, price: 3500, bannedAtLawLevel: 2, specialised: true, sourceName: "CSC Update 2023" },
  { id: "weapon-gauss-rifle", combatEquipmentId: "gaussRifle", name: "Gauss Rifle", kind: "weapon", techLevel: 12, price: 1500, bannedAtLawLevel: 3, military: true, sourceName: "CSC Update 2023" },
  { id: "weapon-plasma-gun", combatEquipmentId: "plasmaGun", name: "Plasma Gun", kind: "weapon", techLevel: 12, price: 20000, bannedAtLawLevel: 2, military: true, sourceName: "CSC PGHP-12" },
  { id: "weapon-fusion-gun", combatEquipmentId: "fusionGun", name: "Fusion Gun", kind: "weapon", techLevel: 14, price: 100000, bannedAtLawLevel: 2, military: true, sourceName: "CSC FGHP-14" },
  { id: "weapon-4cm-ram", combatEquipmentId: "actionRam", name: "4cm RAM", kind: "weapon", techLevel: 8, price: 800, bannedAtLawLevel: 3, military: true, sourceName: "CSC RAM Grenade Launcher" },
  { id: "weapon-light-assault-gun", combatEquipmentId: "lightAssaultGun", name: "Light Assault Gun", kind: "weapon", techLevel: 8, price: 4000, bannedAtLawLevel: 3, military: true, sourceName: "CSC Update 2023" },
  { id: "armor-flak-vest", combatEquipmentId: "flakVest", name: "Flak Vest", kind: "armor", techLevel: 8, price: 500, bannedAtLawLevel: 3, specialised: true, sourceName: "CSC Ballistic Vest" },
  { id: "armor-combat-armor", combatEquipmentId: "combatArmor", name: "Combat Armor", kind: "armor", techLevel: 10, price: 96000, bannedAtLawLevel: 2, military: true, sourceName: "CSC Combat Armour, Basic" },
  { id: "armor-battle-dress", combatEquipmentId: "battleDress", name: "Battle Dress", kind: "armor", techLevel: 13, price: 200000, bannedAtLawLevel: 1, military: true, sourceName: "CSC Battle Dress, Basic" },
] as const satisfies readonly EquipmentCatalogItem[];

export const equipmentCatalogById: ReadonlyMap<string, EquipmentCatalogItem> = new Map(
  equipmentCatalog.map((item) => [item.id, item]),
);
