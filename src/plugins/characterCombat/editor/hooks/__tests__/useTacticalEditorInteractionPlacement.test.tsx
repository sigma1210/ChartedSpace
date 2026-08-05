/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import type { TacticalTerrainPlacement } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import { defaultTacticalInteractiveHumanCombatProfile } from "@/plugins/characterCombat/tacticalInteractiveHuman";
import { useTacticalEditorInteractionPlacement } from "../useTacticalEditorInteractionPlacement";

const placement = (
  terrainDefinitionId = "console-1x1",
  objectSettings: TacticalTerrainPlacement["objectSettings"] = undefined,
): TacticalTerrainPlacement => ({
  id: "placement-1",
  terrainDefinitionId,
  origin: { x: 3, y: 4 },
  rotation: 0,
  objectSettings,
});

const renderInteractionPlacement = (initialPlacement: TacticalTerrainPlacement | null) => renderHook(() => {
  const [placements, setPlacements] = useState<TacticalTerrainPlacement[]>(
    initialPlacement ? [initialPlacement] : [],
  );
  const selectedPlacement = placements.find((candidate) => candidate.id === initialPlacement?.id) ?? null;
  const updatePlacements = (nextPlacements: TacticalTerrainPlacement[]) => {
    setPlacements(nextPlacements);
    return true;
  };
  return {
    ...useTacticalEditorInteractionPlacement({
      placements,
      selectedPlacement,
      updatePlacements,
    }),
    placements,
  };
});

describe("useTacticalEditorInteractionPlacement", () => {
  it("derives terminal eligibility and the interaction type", () => {
    const consoleHook = renderInteractionPlacement(placement());
    const humanHook = renderInteractionPlacement(placement("interactive-human"));
    const ordinaryHook = renderInteractionPlacement(placement("crate-1x1"));

    expect(consoleHook.result.current).toMatchObject({
      selectedHasTerminal: true,
      selectedIsInteractiveHuman: false,
    });
    expect(humanHook.result.current).toMatchObject({
      selectedHasTerminal: true,
      selectedIsInteractiveHuman: true,
    });
    expect(ordinaryHook.result.current).toMatchObject({
      selectedHasTerminal: false,
      selectedIsInteractiveHuman: false,
    });
  });

  it("updates terminal settings while preserving other placement settings", () => {
    const { result } = renderInteractionPlacement(placement("console-1x1", {
      terminal: { label: "Old name", terminalKind: "generic", operational: true },
      custom: { label: "Preserved" },
    }));

    act(() => result.current.updateSelectedTerminal({
      label: "Navigation",
      terminalKind: "navigation",
      facing: 90,
      operational: false,
    }));

    expect(result.current.placements[0]).toMatchObject({
      objectSettings: {
        terminal: {
          label: "Navigation",
          terminalKind: "navigation",
          facing: 90,
          operational: false,
        },
        custom: { label: "Preserved" },
      },
    });
  });

  it("uses the default human combat profile without mutating it", () => {
    const { result } = renderInteractionPlacement(placement("interactive-human"));
    const defaultSkills = defaultTacticalInteractiveHumanCombatProfile.skills;

    act(() => result.current.updateSelectedHumanCombatProfile({
      weaponSkill: 2,
      skills: [{ name: "Persuade", level: 1 }],
    }));

    const profile = result.current.placements[0].objectSettings?.terminal?.combatProfile;
    expect(profile).toMatchObject({
      weaponId: defaultTacticalInteractiveHumanCombatProfile.weaponId,
      weaponSkill: 2,
      skills: [{ name: "Persuade", level: 1 }],
    });
    expect(profile).not.toBe(defaultTacticalInteractiveHumanCombatProfile);
    expect(profile?.skills).not.toBe(defaultSkills);
    expect(defaultTacticalInteractiveHumanCombatProfile.skills).toEqual([]);
  });

  it("clones retained skills when updating an existing combat profile", () => {
    const skills = [{ name: "Leadership", level: 2 }];
    const combatProfile = {
      ...defaultTacticalInteractiveHumanCombatProfile,
      skills,
    };
    const { result } = renderInteractionPlacement(placement("interactive-human", {
      terminal: { combatProfile },
    }));

    act(() => result.current.updateSelectedHumanCombatProfile({ moraleFactor: 9 }));

    const updated = result.current.placements[0].objectSettings?.terminal?.combatProfile;
    expect(updated).toMatchObject({ moraleFactor: 9, skills });
    expect(updated?.skills).not.toBe(skills);
    expect(updated?.skills[0]).not.toBe(skills[0]);
  });

  it("does not update a placement without interaction support", () => {
    const initial = placement("crate-1x1");
    const { result } = renderInteractionPlacement(initial);

    let updated = true;
    act(() => {
      updated = result.current.updateSelectedTerminal({ label: "Ignored" });
    });

    expect(updated).toBe(false);
    expect(result.current.placements).toEqual([initial]);
  });
});
