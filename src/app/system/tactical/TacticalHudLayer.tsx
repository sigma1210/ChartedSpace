import type { ReactNode } from "react";
import { PluginHudLayer } from "@/components/hud/PluginHudLayer";
import {
  updateTacticalActionHud,
  updateTacticalCharacterHud,
  updateTacticalCharacterInformationHud,
  updateTacticalDeploymentHud,
  updateTacticalEnemyHud,
  updateTacticalEventsHud,
  updateTacticalScenarioHud,
} from "@/plugins/characterCombat/slice";
import type {
  CharacterCombatHudLayout,
  TacticalMapState,
} from "@/plugins/characterCombat/types";
import { useAppDispatch } from "@/store/hooks";

export const TacticalHudLayer = ({
  tacticalMap,
  scenarioHudLayout,
  deploymentHudLayout,
  children,
}: {
  tacticalMap: TacticalMapState;
  scenarioHudLayout: CharacterCombatHudLayout;
  deploymentHudLayout: CharacterCombatHudLayout;
  children: ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const setup = (tacticalMap.scenarioStatus ?? "active") === "setup";
  const hiddenHuds = [
    ...(!tacticalMap.characterHudLayout.visible ? [{ id: "characters", title: "Characters" }] : []),
    ...(!tacticalMap.enemyHudLayout.visible ? [{ id: "enemies", title: "Enemies" }] : []),
    ...(!setup && !tacticalMap.actionHudLayout.visible ? [{ id: "action", title: "Current Action" }] : []),
    ...(setup && !deploymentHudLayout.visible ? [{ id: "deployment", title: "Crew Deployment" }] : []),
    ...(!tacticalMap.characterInformationHudLayout.visible ? [{ id: "character-information", title: "Selected Character" }] : []),
    ...(!tacticalMap.eventsHudLayout.visible ? [{ id: "events", title: "Events" }] : []),
    ...(!scenarioHudLayout.visible ? [{ id: "scenario", title: "Scenario" }] : []),
  ];

  return (
    <PluginHudLayer
      hiddenHuds={hiddenHuds}
      onRestoreHud={(id) => {
        if (id === "action") {
          dispatch(updateTacticalActionHud({ ...tacticalMap.actionHudLayout, visible: true }));
        } else if (id === "deployment") {
          dispatch(updateTacticalDeploymentHud({ ...deploymentHudLayout, visible: true }));
        } else if (id === "enemies") {
          dispatch(updateTacticalEnemyHud({ ...tacticalMap.enemyHudLayout, visible: true }));
        } else if (id === "character-information") {
          dispatch(updateTacticalCharacterInformationHud({
            ...tacticalMap.characterInformationHudLayout,
            visible: true,
          }));
        } else if (id === "events") {
          dispatch(updateTacticalEventsHud({ ...tacticalMap.eventsHudLayout, visible: true }));
        } else if (id === "scenario") {
          dispatch(updateTacticalScenarioHud({ ...scenarioHudLayout, visible: true }));
        } else {
          dispatch(updateTacticalCharacterHud({ ...tacticalMap.characterHudLayout, visible: true }));
        }
      }}
    >
      {children}
    </PluginHudLayer>
  );
};
