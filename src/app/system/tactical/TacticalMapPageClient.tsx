"use client";

import { Canvas, events as createCanvasEvents } from "@react-three/fiber";
import { useMemo, type ComponentProps } from "react";
import { selectTacticalTerrainObject, updateTacticalNavigationHud } from "@/plugins/characterCombat/slice";
import { DEFAULT_TACTICAL_NAVIGATION_HUD_LAYOUT } from "@/plugins/characterCombat/tacticalHudDefaults";
import { pointKey, tacticalCrewVisibilityMask } from "@/plugins/characterCombat/geometry";
import { buildTacticalMovementPreview } from "@/plugins/characterCombat/tacticalMovementPreview";
import type { TacticalScenarioDefinitionFile } from "@/plugins/characterCombat/tacticalScenarioDefinitions";
import type { TacticalConsoleVictoryDefinitionFile } from "@/plugins/characterCombat/tacticalConsoleVictory";
import {
  selectCharacters,
  selectCharactersStatus,
  selectSelectedProfileCharacter,
  setSelectedProfileCharacter,
} from "@/plugins/characters";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectActiveShip, selectShipStatus } from "@/plugins/ship";
import { TacticalActionHud } from "./TacticalActionHud";
import { TacticalCharacterInformationHud } from "./TacticalCharacterInformationHud";
import { TacticalCharacterRosterHud } from "./TacticalCharacterRosterHud";
import { TacticalDeploymentHud } from "./TacticalDeploymentHud";
import { TacticalEnemyRosterHud } from "./TacticalEnemyRosterHud";
import { TacticalEventsHud } from "./TacticalEventsHud";
import { TacticalHudLayer } from "./TacticalHudLayer";
import { TacticalMapLifecycle } from "./TacticalMapLifecycle";
import { TacticalNavigationHud } from "./TacticalNavigationHud";
import { DEFAULT_TACTICAL_SCENARIO_HUD_LAYOUT, TacticalScenarioHud } from "./TacticalScenarioHud";
import { TacticalScene } from "./TacticalScene";
import { DEFAULT_TACTICAL_MAP } from "./tacticalMapDefaults";

const safeCanvasEvents: NonNullable<ComponentProps<typeof Canvas>["events"]> = (store) => {
  const manager = createCanvasEvents(store);
  const connect = manager.connect;
  return { ...manager, connect: (target) => { if (target) connect?.(target); } };
};

const TacticalMapPageClient = ({ draftPlaytest }: { draftPlaytest?: { definition: TacticalScenarioDefinitionFile; consoleVictory: TacticalConsoleVictoryDefinitionFile; onExit: () => void } }) => {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectCharactersStatus);
  const allCharacters = useAppSelector(selectCharacters);
  const ship = useAppSelector(selectActiveShip);
  const shipStatus = useAppSelector(selectShipStatus);
  const characters = useMemo(() => {
    const charactersById = new Map(allCharacters.map((character) => [character.id, character]));
    return (ship?.crew ?? []).flatMap((member) => member.characterId ? charactersById.get(member.characterId) ?? [] : []).slice(0, 2);
  }, [allCharacters, ship?.crew]);
  const selected = useAppSelector(selectSelectedProfileCharacter);
  const combat = useAppSelector((state) => state.plugins.characterCombat);
  const tacticalMap = combat.tacticalMap ?? DEFAULT_TACTICAL_MAP;
  const tacticalScenarioStatus = tacticalMap.scenarioStatus ?? "active";
  const scenarioHudLayout = tacticalMap.scenarioHudLayout ?? DEFAULT_TACTICAL_SCENARIO_HUD_LAYOUT;
  const deploymentHudLayout = tacticalMap.deploymentHudLayout ?? { visible: true, pinned: false, position: { x: 16, y: 190 } };
  const navigationHudLayout = tacticalMap.navigationHudLayout ?? DEFAULT_TACTICAL_NAVIGATION_HUD_LAYOUT;
  const crewVisibility = useMemo(() => tacticalCrewVisibilityMask(tacticalMap.scenario), [tacticalMap.scenario]);
  const exploredCells = useMemo(() => new Set(tacticalMap.exploredCellKeys ?? []), [tacticalMap.exploredCellKeys]);
  const visibleCellKeys = useMemo(() => [...crewVisibility.keys()], [crewVisibility]);
  const enemies = useMemo(() => tacticalMap.scenario.combatants.filter((unit) => unit.side === "enemy"), [tacticalMap.scenario.combatants]);
  const visibleEnemies = useMemo(() => enemies.filter((enemy) => crewVisibility.has(pointKey(enemy.position))), [crewVisibility, enemies]);
  const visibleEnemyIds = useMemo(() => new Set(visibleEnemies.map((enemy) => enemy.id)), [visibleEnemies]);
  const visibleEnemySightings = useMemo(() => visibleEnemies.map((enemy) => ({ id: enemy.id, position: { ...enemy.position } })), [visibleEnemies]);
  const selectedTacticalCharacterId = tacticalScenarioStatus === "setup" ? tacticalMap.deploymentCharacterId : tacticalMap.activeCharacterId;
  const activeCombatant = tacticalMap.scenario.combatants.find((unit) => unit.id === selectedTacticalCharacterId && unit.side === "player") ?? null;
  const transformedAllies = tacticalMap.scenario.combatants.filter((unit) => unit.side === "player" && unit.id.endsWith(":combatant"));
  const lockerItems = ship?.locker ?? [];
  const movementPreview = buildTacticalMovementPreview(tacticalMap, activeCombatant);

  return <main className="h-screen w-screen overflow-hidden bg-[#050a12] [--hud-accent:#a5f3fc] [--hud-bg:#071019] [--hud-border:#42616e] [--hud-border-subtle:#29434d] [--hud-text:#e2f3f6] [--hud-text-dim:#8faab3]">
    <TacticalMapLifecycle
      characterStatus={status}
      shipStatus={shipStatus}
      characters={characters}
      exploredCells={exploredCells}
      visibleCellKeys={visibleCellKeys}
      visibleEnemySightings={visibleEnemySightings}
      activeCombatant={activeCombatant}
      selectedProfileCharacterId={selected?.id ?? null}
      draftPlaytest={draftPlaytest}
    />
    <TacticalHudLayer tacticalMap={tacticalMap} scenarioHudLayout={scenarioHudLayout} deploymentHudLayout={deploymentHudLayout} navigationHudLayout={navigationHudLayout}>
      <Canvas events={safeCanvasEvents} shadows="basic" frameloop="demand" dpr={[1, 1.5]} onPointerMissed={() => { dispatch(setSelectedProfileCharacter(null)); dispatch(selectTacticalTerrainObject(null)); }}>
        <TacticalScene crewVisibility={crewVisibility} exploredCells={exploredCells} lastKnownEnemyPositions={tacticalMap.lastKnownEnemyPositions ?? {}} reachableMoves={movementPreview.legalMoves} visibleEnemyIds={visibleEnemyIds} />
      </Canvas>
      <div className="pointer-events-none absolute left-4 top-4 border border-cyan-500/50 bg-slate-950/90 px-3 py-2 font-mono text-cyan-100 shadow-lg">
        <div className="text-xs font-bold uppercase tracking-[0.22em]">Tactical Map</div>
        <div className="mt-1 text-[10px] text-slate-400">Turn {tacticalMap.turn} · {tacticalMap.scenario.width}×{tacticalMap.scenario.height} implicit grid · {characters.length}/2 crew members</div>
        <div className="mt-1 text-[9px] uppercase tracking-wider text-slate-500">Drag to rotate · Right-drag to pan · Wheel to zoom</div>
      </div>
      <TacticalNavigationHud
        layout={navigationHudLayout}
        mode={draftPlaytest ? "playtest" : "tactical"}
        onLayoutChange={(layout) => dispatch(updateTacticalNavigationHud(layout))}
        onReturnToEditor={draftPlaytest?.onExit}
      />
      <TacticalScenarioHud tacticalMap={tacticalMap} layout={scenarioHudLayout} />
      <TacticalCharacterRosterHud
        tacticalMap={tacticalMap}
        characters={characters}
        transformedAllies={transformedAllies}
        activeCombatant={activeCombatant}
        characterStatus={status}
        shipStatus={shipStatus}
      />
      <TacticalEnemyRosterHud
        tacticalMap={tacticalMap}
        enemies={enemies}
        visibleEnemies={visibleEnemies}
        activeCombatant={activeCombatant}
      />
      <TacticalCharacterInformationHud tacticalMap={tacticalMap} activeCombatant={activeCombatant} />
      <TacticalEventsHud tacticalMap={tacticalMap} />
      {tacticalScenarioStatus === "setup" && <TacticalDeploymentHud tacticalMap={tacticalMap} activeCombatant={activeCombatant} lockerItems={lockerItems} layout={deploymentHudLayout} />}
      <TacticalActionHud tacticalMap={tacticalMap} activeCombatant={activeCombatant} enemies={enemies} movementPreview={movementPreview} draftPlaytest={draftPlaytest} />
      {(status === "loading" || shipStatus === "loading") && <div className="absolute inset-x-0 bottom-8 text-center font-mono text-xs uppercase tracking-widest text-cyan-200">Loading crew…</div>}
      {(status === "error" || shipStatus === "error") && <div className="absolute inset-x-0 bottom-8 text-center font-mono text-xs uppercase tracking-widest text-rose-300">Crew could not be loaded</div>}
    </TacticalHudLayer>
  </main>;
};

export default TacticalMapPageClient;
