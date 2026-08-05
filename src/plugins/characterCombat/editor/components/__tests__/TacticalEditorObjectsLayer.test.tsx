/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";
import TacticalEditorObjectsLayer, {
  type TacticalEditorObjectsLayerProps,
} from "../TacticalEditorObjectsLayer";

const objects: TacticalEditorObjectsLayerProps["objects"] = [
  {
    id: "hatch",
    kind: "hatch",
    position: { x: 1, y: 1 },
    open: false,
    integrity: 2,
    blocking: true,
    targetable: true,
  },
  {
    id: "console",
    kind: "terminal",
    position: { x: 3, y: 1 },
    terminalKind: "navigation",
    label: "Navigation console",
    facing: 0,
    operational: true,
    integrity: 2,
    blocking: true,
    targetable: true,
    visualKind: "console",
  },
  {
    id: "human",
    kind: "terminal",
    position: { x: 5, y: 1 },
    terminalKind: "generic",
    label: "Broker",
    facing: 90,
    operational: true,
    integrity: 2,
    blocking: true,
    targetable: true,
    visualKind: "human",
  },
];

describe("TacticalEditorObjectsLayer", () => {
  it("renders a hatch with its framed cross", () => {
    const { container } = render(<svg><TacticalEditorObjectsLayer objects={objects} /></svg>);

    expect(container.querySelector('rect[x="1.12"][y="1.12"]')?.getAttribute("stroke")).toBe("#fbbf24");
    expect(container.querySelectorAll('line[stroke="#94a3b8"]')).toHaveLength(2);
  });

  it("renders a labeled console", () => {
    render(<svg><TacticalEditorObjectsLayer objects={objects} /></svg>);

    const consoleObject = screen.getByLabelText("Navigation console");
    expect(consoleObject.querySelector("rect")?.getAttribute("fill")).toBe("#22d3ee");
  });

  it("renders a labeled interactive human with its facing indicator", () => {
    render(<svg><TacticalEditorObjectsLayer objects={objects} /></svg>);

    const human = screen.getByLabelText("Broker · facing East");
    expect(human.querySelector("path")?.getAttribute("fill")).toBe("#a855f7");
    const facingLine = human.querySelector("line");
    expect(facingLine?.getAttribute("x1")).toBe("5.5");
    expect(facingLine?.getAttribute("y1")).toBe("1.5");
    expect(Number(facingLine?.getAttribute("x2"))).toBeCloseTo(5.9);
    expect(Number(facingLine?.getAttribute("y2"))).toBeCloseTo(1.5);
  });
});
