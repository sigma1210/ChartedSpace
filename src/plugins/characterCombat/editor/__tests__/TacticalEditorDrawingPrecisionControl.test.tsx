/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import TacticalEditorDrawingPrecisionControl from "../TacticalEditorDrawingPrecisionControl";
import {
  TacticalEditorViewportProvider,
  useTacticalEditorViewport,
} from "../TacticalEditorViewport";

const PrecisionProbe = () => {
  const viewport = useTacticalEditorViewport();
  return <output aria-label="Selected precision">{viewport?.snapMode}</output>;
};

const renderControl = () => render(
  <TacticalEditorViewportProvider map={{ width: 72, height: 48 }}>
    <TacticalEditorDrawingPrecisionControl />
    <PrecisionProbe />
  </TacticalEditorViewportProvider>,
);

describe("TacticalEditorDrawingPrecisionControl", () => {
  it("starts with grid precision", () => {
    renderControl();

    expect((screen.getByLabelText("Drawing precision") as HTMLSelectElement).value).toBe("grid");
    expect(screen.getByLabelText("Selected precision").textContent).toBe("grid");
  });

  it("offers every drawing precision", () => {
    renderControl();

    expect(screen.getAllByRole("option").map((option) => ({
      value: (option as HTMLOptionElement).value,
      label: option.textContent,
    }))).toEqual([
      { value: "grid", label: "Grid · 1 square" },
      { value: "half-grid", label: "Half grid · 0.5" },
      { value: "quarter-grid", label: "Quarter grid · 0.25" },
      { value: "freeform", label: "Freeform" },
    ]);
  });

  it.each(["half-grid", "quarter-grid", "freeform"] as const)(
    "changes the viewport precision to %s",
    (precision) => {
      renderControl();

      fireEvent.change(screen.getByLabelText("Drawing precision"), {
        target: { value: precision },
      });

      expect(screen.getByLabelText("Selected precision").textContent).toBe(precision);
    },
  );
});
