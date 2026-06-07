import spin from "../../../Galaxy/sectors/Spin.json";
import type { SectorDetail, World } from "../../types";
import {
  calculateWorldPairSalePrice,
  deriveTradeClassifications,
} from "../trade";

const sector = spin as unknown as SectorDetail;
const regina = sector.worlds.find((world) => world.hex === "1910") as World;
const ruie = sector.worlds.find((world) => world.hex === "1809") as World;

describe("trade sale pricing", () => {
  it("derives expected trade classifications for Regina and Ruie", () => {
    expect(deriveTradeClassifications(regina.uwp)).toEqual(["Ga", "Ht", "Ri"]);
    expect(deriveTradeClassifications(ruie.uwp)).toEqual(["Hi", "In"]);
  });

  it("calculates world-pair sale price using Regina as source and Ruie as target", () => {
    expect(calculateWorldPairSalePrice(regina.uwp, ruie.uwp)).toBe(10500);
  });

  it("calculates world-pair sale price using Ruie as source and Regina as target", () => {
    expect(calculateWorldPairSalePrice(ruie.uwp, regina.uwp)).toBe(4500);
  });

  it("uses only the source world and target world for same-world price baselines", () => {
    expect(calculateWorldPairSalePrice(regina.uwp, regina.uwp)).toBe(6000);
    expect(calculateWorldPairSalePrice(ruie.uwp, ruie.uwp)).toBe(8000);
  });
});
