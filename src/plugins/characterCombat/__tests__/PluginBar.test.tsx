/** @jest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { CharacterCombatPluginBar } from "../PluginBar";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("CharacterCombatPluginBar", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("opens the tactical combat route", () => {
    render(<CharacterCombatPluginBar />);

    fireEvent.click(screen.getByRole("button", { name: "Open Character Combat" }));

    expect(mockPush).toHaveBeenCalledWith("/system/tactical");
  });
});
