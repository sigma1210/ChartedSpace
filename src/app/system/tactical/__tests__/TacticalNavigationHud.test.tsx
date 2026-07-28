/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { TacticalNavigationHud } from "../TacticalNavigationHud";

jest.mock("@/components/hud/FloatingPluginHud", () => ({
  FloatingPluginHud: ({
    title,
    layout,
    onLayoutChange,
    children,
  }: {
    title: string;
    layout: { visible: boolean; pinned: boolean; position: { x: number; y: number } };
    onLayoutChange: (layout: { visible: boolean; pinned: boolean; position: { x: number; y: number } }) => void;
    children: ReactNode;
  }) => layout.visible ? (
    <section>
      <h2>{title}</h2>
      <button type="button" onClick={() => onLayoutChange({ ...layout, visible: false })}>
        Close
      </button>
      {children}
    </section>
  ) : null,
}));

const layout = {
  visible: true,
  pinned: false,
  position: { x: 920, y: 56 },
};

describe("TacticalNavigationHud", () => {
  it("offers the system and scenario editor destinations during tactical play", () => {
    render(<TacticalNavigationHud layout={layout} mode="tactical" onLayoutChange={jest.fn()} />);

    expect(screen.getByRole("link", { name: "System view" }).getAttribute("href")).toBe("/system");
    expect(screen.getByRole("link", { name: "Scenario editor" }).getAttribute("href")).toBe("/system/tactical/editor");
  });

  it("offers the tactical map destination in editor mode", () => {
    render(<TacticalNavigationHud layout={layout} mode="editor" onLayoutChange={jest.fn()} />);

    expect(screen.getByRole("link", { name: "Return to tactical map" }).getAttribute("href")).toBe("/system/tactical");
  });

  it("returns to the editor from a draft playtest", () => {
    const onReturnToEditor = jest.fn();
    render(
      <TacticalNavigationHud
        layout={layout}
        mode="playtest"
        onLayoutChange={jest.fn()}
        onReturnToEditor={onReturnToEditor}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Return to editor" }));
    expect(onReturnToEditor).toHaveBeenCalledTimes(1);
  });

  it("reports a close through the shared HUD layout callback", () => {
    const onLayoutChange = jest.fn();
    render(<TacticalNavigationHud layout={layout} mode="tactical" onLayoutChange={onLayoutChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onLayoutChange).toHaveBeenCalledWith({ ...layout, visible: false });
  });
});
