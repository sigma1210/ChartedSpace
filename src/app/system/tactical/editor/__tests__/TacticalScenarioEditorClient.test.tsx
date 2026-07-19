import { renderToStaticMarkup } from "react-dom/server";
import TacticalScenarioEditorClient from "../TacticalScenarioEditorClient";

jest.mock("../../TacticalMapPageClient", () => ({ __esModule: true, default: () => null }));

describe("TacticalScenarioEditorClient", () => {
  it("offers fire as a placement tool in the floating terrain palette", () => {
    const markup = renderToStaticMarkup(<TacticalScenarioEditorClient />);

    expect(markup).toContain("Terrain Palette");
    expect(markup).toContain(">Fire</button>");
    expect(markup).toContain(">Iris Valve</button>");
    expect(markup).toContain(">Hatch 1x1</button>");
    expect(markup).toContain(">Liquid Hydrogen 2x2</button>");
    expect(markup).toContain(">Liquid Hydrogen 3x3</button>");
    expect(markup).toContain(">Liquid Hydrogen 4x4</button>");
  });

  it("offers file loading and non-overwriting Save As controls", () => {
    const markup = renderToStaticMarkup(<TacticalScenarioEditorClient />);

    expect(markup).toContain("Scenario files");
    expect(markup).toContain("Load scenario");
    expect(markup).toContain("Save as new scenario");
    expect(markup).toContain("never overwrites an existing scenario");
    expect(markup).toContain("immutable source");
  });
});
