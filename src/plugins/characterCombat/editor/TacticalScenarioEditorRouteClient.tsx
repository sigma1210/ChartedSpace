"use client";

import TacticalMapPageClient from "@/plugins/characterCombat/TacticalMapPageClient";
import TacticalScenarioEditorClient from "./TacticalScenarioEditorClient";

const TacticalScenarioEditorRouteClient = () => (
  <TacticalScenarioEditorClient PlaytestComponent={TacticalMapPageClient} />
);

export default TacticalScenarioEditorRouteClient;
