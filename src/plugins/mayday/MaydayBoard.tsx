"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import { StepForward } from "lucide-react";
import { HudHeader, HudPanel } from "@/components/world/HudPrimitives";
import { selectActiveShip } from "@/plugins/ship";
import { useAppSelector } from "@/store/hooks";
import { buildMaydayScenarioForPlayerShip } from "./playerShipAdapter";
import { summarizeMaydayPlayerCombatResult } from "./combatResult";
import { buildVisibleMaydayHexes, maydayPanToCenter } from "./maydayGrid";
import {
  advanceGrandPrixState,
  chooseGrandPrixThrust,
  completedGrandPrixLegs,
  createGrandPrixState,
  grandPrixCheckpoints,
  grandPrixMarkerState,
  grandPrixLandingPreview,
  grandPrixScenario,
  grandPrixScenarioId,
  nextGrandPrixCheckpoint,
  type GrandPrixState,
} from "./grandPrixRules";
import {
  addVector,
  advanceEncounter,
  applyShipTemplateToCustomSetup,
  applyLaserDamage,
  buildMissile,
  buildCustomScenario,
  chooseOpponentThrust,
  customScenarioId,
  damageResultLabel,
  damageStatusLabel,
  defaultCustomSetup,
  encounterMissiles,
  expandedMaydayBoardRadius,
  hexDirections,
  hexRange,
  initialObjectiveProgress,
  maydayShipTemplates,
  maydayInitialBoardRadius,
  nextObjectiveProgress,
  objectiveResult,
  rangeForEncounter,
  removeDestroyedMissiles,
  resolveLaserFire,
  resolveOpponentOrdnanceCloseout,
  sameVector,
  shipCombatDisabled,
  shipCanLaunchMissile,
  shipCanLaunchSand,
  shipCanThrust,
  subtractVector,
  vectorLabel,
  type LaserFireResult,
  type MaydayCombatPhase,
  type MaydayCustomSetup,
  type MaydayEncounter,
  type MaydayLaserTargetOption,
  type MaydayOrdnanceEvent,
  type MaydayScenario,
  type MaydayShipTemplateId,
  type MaydayVector,
  type ObjectiveProgress,
  type ObjectiveStatus,
  type OpponentBehavior,
} from "./maydayRules";

interface MaydayTurnHistoryEntry {
  turn: number;
  playerThrust: string;
  opponentThrust: string;
  playerFrom: MaydayVector | null;
  playerTo: MaydayVector | null;
  rangeBefore: number | null;
  rangeAfter: number | null;
  objectiveStatus: ObjectiveStatus;
}

interface BoardPan {
  x: number;
  y: number;
}

interface BoardDrag {
  pointerId: number;
  clientX: number;
  clientY: number;
  pan: BoardPan;
}

type MaydayHudId =
  | "action"
  | "status"
  | "events"
  | "ships"
  | "setup";

type MaydayWorkflowState = "setup" | "playing";
type MaydayShipMode = "training" | "current-ship";

interface MaydayHudLayout {
  visible: boolean;
  pinned: boolean;
  position: BoardPan;
}

interface HudSize {
  width: number;
  height: number;
}

interface MaydayHudDrag {
  startX: number;
  startY: number;
  origin: BoardPan;
}

const maydayScenarios: MaydayScenario[] = [
  grandPrixScenario,
  {
    id: "laser-duel",
    label: "Laser Duel",
    detail: "Close combat test with both ships already in laser range.",
    objective: {
      kind: "combat-disable",
      label: "Disable the Corsair before the Free Trader is disabled.",
    },
    encounter: {
      turn: 1,
      ships: [
        {
          id: "free-trader",
          name: "Free Trader",
          side: "player",
          position: { q: -1, r: 0 },
          velocity: { q: 0, r: 0 },
          thrustRating: 1,
          lasers: 1,
          missiles: 2,
          sandcasters: 1,
          sand: 2,
          targetType: "ship",
        },
        {
          id: "corsair",
          name: "Corsair",
          side: "opponent",
          position: { q: 1, r: 0 },
          velocity: { q: 0, r: 0 },
          thrustRating: 1,
          lasers: 1,
          missiles: 2,
          sandcasters: 1,
          sand: 2,
          targetType: "ship",
        },
      ],
    },
  },
  {
    id: "duel",
    label: "Range Duel",
    detail: "Balanced crossing drill with both ships already under way.",
    objective: {
      kind: "range-band",
      label: "Hold range 1-4 for 3 turns before turn 12.",
    },
    encounter: {
      turn: 1,
      ships: [
        {
          id: "free-trader",
          name: "Free Trader",
          side: "player",
          position: { q: -2, r: 1 },
          velocity: { q: 1, r: 0 },
          thrustRating: 1,
          lasers: 1,
          missiles: 2,
          sandcasters: 1,
          sand: 2,
          targetType: "ship",
        },
        {
          id: "corsair",
          name: "Corsair",
          side: "opponent",
          position: { q: 4, r: -2 },
          velocity: { q: -1, r: 1 },
          thrustRating: 1,
          lasers: 1,
          missiles: 2,
          sandcasters: 1,
          sand: 2,
          targetType: "ship",
        },
      ],
    },
  },
  {
    id: "pursuit",
    label: "Pursuit",
    detail: "The Corsair is closing from astern while the trader tries to widen the gap.",
    objective: {
      kind: "escape-range",
      label: "Escape to range 10 or greater before the Corsair reaches range 1.",
    },
    encounter: {
      turn: 1,
      ships: [
        {
          id: "free-trader",
          name: "Free Trader",
          side: "player",
          position: { q: -3, r: 0 },
          velocity: { q: 1, r: 0 },
          thrustRating: 1,
          lasers: 1,
          missiles: 2,
          sandcasters: 1,
          sand: 2,
          targetType: "ship",
        },
        {
          id: "corsair",
          name: "Corsair",
          side: "opponent",
          position: { q: -7, r: 1 },
          velocity: { q: 2, r: 0 },
          thrustRating: 1,
          lasers: 1,
          missiles: 2,
          sandcasters: 1,
          sand: 2,
          targetType: "ship",
        },
      ],
    },
  },
  {
    id: "intercept",
    label: "Intercept",
    detail: "Two ships cross at high relative velocity near the center of the board.",
    objective: {
      kind: "intercept-range",
      label: "Pass within range 2 before turn 6.",
    },
    encounter: {
      turn: 1,
      ships: [
        {
          id: "free-trader",
          name: "Free Trader",
          side: "player",
          position: { q: -6, r: 2 },
          velocity: { q: 2, r: -1 },
          thrustRating: 1,
          lasers: 1,
          missiles: 2,
          sandcasters: 1,
          sand: 2,
          targetType: "ship",
        },
        {
          id: "corsair",
          name: "Corsair",
          side: "opponent",
          position: { q: 5, r: -4 },
          velocity: { q: -2, r: 1 },
          thrustRating: 1,
          lasers: 1,
          missiles: 2,
          sandcasters: 1,
          sand: 2,
          targetType: "ship",
        },
      ],
    },
  },
  {
    id: "drift",
    label: "Drift Test",
    detail: "Movement practice with a passive marker and low starting velocity.",
    objective: {
      kind: "approach-contact",
      label: "Approach to range 1 of the Nav Buoy.",
    },
    encounter: {
      turn: 1,
      ships: [
        {
          id: "free-trader",
          name: "Free Trader",
          side: "player",
          position: { q: 0, r: 0 },
          velocity: { q: 0, r: 0 },
          thrustRating: 1,
          lasers: 1,
          missiles: 2,
          sandcasters: 1,
          sand: 2,
          targetType: "ship",
        },
        {
          id: "navigation-buoy",
          name: "Nav Buoy",
          side: "opponent",
          position: { q: 4, r: -1 },
          velocity: { q: 0, r: 0 },
          thrustRating: 0,
          lasers: 0,
          targetType: "ship",
        },
      ],
    },
  },
];

const defaultScenario = maydayScenarios[0];

const maneuverOptions: { label: string; title: string; vector: MaydayVector }[] = [
  { label: "Coast", title: "Coast this turn", vector: { q: 0, r: 0 } },
  ...hexDirections.map((direction) => ({
    label: direction.label,
    title: `Thrust ${direction.label}`,
    vector: direction.vector,
  })),
];

const opponentBehaviors: { id: OpponentBehavior; label: string }[] = [
  { id: "coast", label: "Coast" },
  { id: "pursue", label: "Pursue" },
  { id: "evade", label: "Evade" },
  { id: "intercept", label: "Intercept" },
];

const hexRadius = 28;
const maneuverHexRadius = 26;
const boardWidth = 760;
const boardHeight = 560;
const boardCenter = { x: boardWidth / 2, y: boardHeight / 2 };
const hudScreenMargin = 8;

const defaultMaydayHudLayouts: Record<MaydayHudId, MaydayHudLayout> = {
  action: {
    visible: true,
    pinned: false,
    position: { x: 12, y: 124 },
  },
  status: {
    visible: true,
    pinned: false,
    position: { x: 12, y: 44 },
  },
  events: {
    visible: true,
    pinned: false,
    position: { x: 900, y: 360 },
  },
  ships: {
    visible: true,
    pinned: false,
    position: { x: 360, y: 560 },
  },
  setup: {
    visible: true,
    pinned: false,
    position: { x: 12, y: 500 },
  },
};

const clampMaydayHudPosition = (
  position: BoardPan,
  viewport: HudSize,
  panel: HudSize,
): BoardPan => {
  if (!viewport.width || !viewport.height) {
    return {
      x: Math.max(hudScreenMargin, position.x),
      y: Math.max(hudScreenMargin, position.y),
    };
  }

  const panelWidth = panel.width || 160;
  const panelHeight = panel.height || 28;
  const maxX = Math.max(hudScreenMargin, viewport.width - panelWidth - hudScreenMargin);
  const maxY = Math.max(hudScreenMargin, viewport.height - panelHeight - hudScreenMargin);

  return {
    x: Math.max(hudScreenMargin, Math.min(maxX, position.x)),
    y: Math.max(hudScreenMargin, Math.min(maxY, position.y)),
  };
};

const sameOffset = (a: BoardPan, b: BoardPan) =>
  Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;

const maydayHudTitles: Record<MaydayHudId, string> = {
  action: "Current Action",
  status: "Status",
  events: "Events",
  ships: "Ships",
  setup: "Custom Setup",
};

const axialToPixel = ({ q, r }: MaydayVector) => ({
  x: boardCenter.x + hexRadius * Math.sqrt(3) * (q + r / 2),
  y: boardCenter.y + hexRadius * 1.5 * r,
});

const hexPoints = (center: { x: number; y: number }) =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 180 * (60 * index - 30);
    return `${center.x + hexRadius * Math.cos(angle)},${center.y + hexRadius * Math.sin(angle)}`;
  }).join(" ");

const polygonPoints = (center: { x: number; y: number }, radius: number) =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 180 * (60 * index - 30);
    return `${center.x + radius * Math.cos(angle)},${center.y + radius * Math.sin(angle)}`;
  }).join(" ");

const thrustLabel = (vector: MaydayVector) =>
  maneuverOptions.find((option) => sameVector(option.vector, vector))?.label ?? vectorLabel(vector);

const maneuverHexCenter = ({ q, r }: MaydayVector) => ({
  x: 76 + maneuverHexRadius * Math.sqrt(3) * (q + r / 2),
  y: 76 + maneuverHexRadius * 1.5 * r,
});

const MaydayFloatingHud = ({
  id,
  title,
  layout,
  viewport,
  className = "",
  children,
  onLayoutChange,
}: {
  id: MaydayHudId;
  title: string;
  layout: MaydayHudLayout;
  viewport: HudSize;
  className?: string;
  children: ReactNode;
  onLayoutChange: (
    id: MaydayHudId,
    updater: (layout: MaydayHudLayout) => MaydayHudLayout,
  ) => void;
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<MaydayHudDrag | null>(null);
  const dragPositionRef = useRef<BoardPan | null>(null);
  const [panelSize, setPanelSize] = useState<HudSize>({ width: 0, height: 0 });
  const [dragPosition, setDragPosition] = useState<BoardPan | null>(null);

  useLayoutEffect(() => {
    const element = panelRef.current;
    if (!element) return;

    const updatePanelSize = () => {
      setPanelSize({ width: element.offsetWidth, height: element.offsetHeight });
    };

    updatePanelSize();
    const resizeObserver = new ResizeObserver(updatePanelSize);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  const activePosition = dragPosition ?? layout.position;
  const safePosition = useMemo(
    () => clampMaydayHudPosition(activePosition, viewport, panelSize),
    [activePosition, panelSize, viewport],
  );

  useEffect(() => {
    if (dragRef.current) return;
    const clampedPosition = clampMaydayHudPosition(layout.position, viewport, panelSize);
    if (!sameOffset(clampedPosition, layout.position)) {
      onLayoutChange(id, (currentLayout) => ({
        ...currentLayout,
        position: clampedPosition,
      }));
    }
  }, [id, layout.position, onLayoutChange, panelSize, viewport]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current || layout.pinned) return;
      const dx = event.clientX - dragRef.current.startX;
      const dy = event.clientY - dragRef.current.startY;
      const nextPosition = clampMaydayHudPosition(
        {
          x: dragRef.current.origin.x + dx,
          y: dragRef.current.origin.y + dy,
        },
        viewport,
        panelSize,
      );
      dragPositionRef.current = nextPosition;
      setDragPosition(nextPosition);
    };

    const handleUp = () => {
      if (!dragRef.current) return;
      const finalPosition = dragPositionRef.current;
      dragRef.current = null;
      dragPositionRef.current = null;
      setDragPosition(null);
      if (finalPosition) {
        onLayoutChange(id, (currentLayout) => ({
          ...currentLayout,
          position: finalPosition,
        }));
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [id, layout.pinned, onLayoutChange, panelSize, viewport]);

  const startDrag = useCallback<PointerEventHandler<HTMLDivElement>>(
    (event) => {
      if (layout.pinned || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        origin: safePosition,
      };
      dragPositionRef.current = safePosition;
      setDragPosition(safePosition);
    },
    [layout.pinned, safePosition],
  );

  if (!layout.visible) return null;

  return (
    <div
      ref={panelRef}
      className="pointer-events-none absolute z-20"
      style={{
        left: safePosition.x,
        top: safePosition.y,
      }}
    >
      <HudPanel className={className}>
        <HudHeader
          title={title}
          pinned={layout.pinned}
          onTogglePinned={() => onLayoutChange(id, (currentLayout) => ({
            ...currentLayout,
            pinned: !currentLayout.pinned,
          }))}
          onClose={() => onLayoutChange(id, (currentLayout) => ({
            ...currentLayout,
            visible: false,
          }))}
          onDragStart={startDrag}
          closeTitle={`Collapse ${title}`}
        />
        {children}
      </HudPanel>
    </div>
  );
};

export const MaydayBoard = () => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const activeShip = useAppSelector(selectActiveShip);
  const [maydayWorkflow, setMaydayWorkflow] = useState<MaydayWorkflowState>("setup");
  const [shipMode, setShipMode] = useState<MaydayShipMode>("training");
  const [startedScenario, setStartedScenario] = useState<MaydayScenario | null>(null);
  const [scenarioId, setScenarioId] = useState(defaultScenario.id);
  const [customScenario, setCustomScenario] = useState<MaydayScenario>(() => buildCustomScenario(defaultCustomSetup));
  const [customSetup, setCustomSetup] = useState<MaydayCustomSetup>(defaultCustomSetup);
  const [playerTemplateId, setPlayerTemplateId] = useState<MaydayShipTemplateId>("free-trader");
  const [opponentTemplateId, setOpponentTemplateId] = useState<MaydayShipTemplateId>("corsair");
  const [encounter, setEncounter] = useState<MaydayEncounter>(defaultScenario.encounter);
  const [pendingThrust, setPendingThrust] = useState<MaydayVector>({ q: 0, r: 0 });
  const [combatPhase, setCombatPhase] = useState<MaydayCombatPhase>("movement");
  const [objectiveProgress, setObjectiveProgress] = useState<ObjectiveProgress>(initialObjectiveProgress);
  const [grandPrixState, setGrandPrixState] = useState<GrandPrixState | null>(null);
  const [raceEvents, setRaceEvents] = useState<MaydayOrdnanceEvent[]>([]);
  const [opponentBehavior, setOpponentBehavior] = useState<OpponentBehavior>("coast");
  const [selectedLaserTargetId, setSelectedLaserTargetId] = useState<string>("");
  const [turnHistory, setTurnHistory] = useState<MaydayTurnHistoryEntry[]>([]);
  const [laserLog, setLaserLog] = useState<LaserFireResult[]>([]);
  const [missileLog, setMissileLog] = useState<MaydayOrdnanceEvent[]>([]);
  const [activeSandShipIds, setActiveSandShipIds] = useState<string[]>([]);
  const [pan, setPan] = useState<BoardPan>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<BoardDrag | null>(null);
  const [hudViewport, setHudViewport] = useState<HudSize>({ width: 0, height: 0 });
  const [hudLayouts, setHudLayouts] = useState<Record<MaydayHudId, MaydayHudLayout>>(defaultMaydayHudLayouts);
  const [boardRadius, setBoardRadius] = useState(maydayInitialBoardRadius);
  const hexes = useMemo(() => buildVisibleMaydayHexes({
    width: boardWidth,
    height: boardHeight,
    origin: boardCenter,
    pan,
    hexRadius,
    boardRadius,
    padding: hexRadius * 2.5,
  }), [boardRadius, pan]);
  const selectedScenario = scenarioId === customScenarioId
    ? customScenario
    : maydayScenarios.find((scenario) => scenario.id === scenarioId) ?? defaultScenario;
  const isCustomScenario = scenarioId === customScenarioId;
  const currentShipScenario = activeShip
    ? buildMaydayScenarioForPlayerShip(selectedScenario, activeShip)
    : null;
  const currentShipUnavailableReason = !activeShip
    ? "No current ship available."
    : !currentShipScenario
      ? `${activeShip.type} is not supported in Mayday yet.`
      : null;
  const playerShip = encounter.ships.find((ship) => ship.side === "player") ?? null;
  const primaryContact = encounter.ships.find((ship) => ship.side === "opponent") ?? null;
  const effectivePendingThrust = playerShip && shipCanThrust(playerShip) ? pendingThrust : { q: 0, r: 0 };
  const projectedPlayerVelocity = playerShip
    ? {
        q: playerShip.velocity.q + effectivePendingThrust.q,
        r: playerShip.velocity.r + effectivePendingThrust.r,
      }
    : null;
  const projectedPlayerDestination = playerShip && projectedPlayerVelocity
    ? {
        q: playerShip.position.q + projectedPlayerVelocity.q,
        r: playerShip.position.r + projectedPlayerVelocity.r,
      }
    : null;
  const projectedOpponentThrust = playerShip && primaryContact && projectedPlayerVelocity
    ? chooseOpponentThrust({
        behavior: opponentBehavior,
        opponent: primaryContact,
        player: playerShip,
        projectedPlayerVelocity,
        thrustLabel,
      })
    : null;
  const contactRange = playerShip && primaryContact
    ? hexRange(playerShip.position, primaryContact.position)
    : null;
  const relativeVelocity = playerShip && primaryContact
    ? subtractVector(primaryContact.velocity, playerShip.velocity)
    : null;
  const incomingMissiles = playerShip
    ? encounterMissiles(encounter).filter((missile) => missile.targetId === playerShip.id)
    : [];
  const laserTargetOptions: MaydayLaserTargetOption[] = [
    ...(primaryContact
      ? [{
          selectId: `ship:${primaryContact.id}`,
          label: primaryContact.name,
          target: {
            id: primaryContact.id,
            name: primaryContact.name,
            position: primaryContact.position,
            targetType: primaryContact.targetType,
          },
        }]
      : []),
    ...incomingMissiles.map((missile) => ({
      selectId: `missile:${missile.id}`,
      label: `Missile M${missile.age} R${playerShip ? hexRange(playerShip.position, missile.position) : "-"}`,
      target: {
        id: missile.id,
        name: `Missile M${missile.age}`,
        position: missile.position,
        targetType: "missile" as const,
      },
    })),
  ];
  const selectedLaserTargetOption = laserTargetOptions.find((option) => option.selectId === selectedLaserTargetId)
    ?? laserTargetOptions[0]
    ?? null;
  const projectedContactRange = playerShip && primaryContact && projectedPlayerVelocity
    ? hexRange(
        addVector(playerShip.position, projectedPlayerVelocity),
        addVector(
          primaryContact.position,
          addVector(primaryContact.velocity, projectedOpponentThrust?.vector ?? { q: 0, r: 0 }),
        ),
      )
    : null;
  const contactTrend = contactRange !== null && projectedContactRange !== null
    ? projectedContactRange < contactRange
      ? "Closing"
      : projectedContactRange > contactRange
        ? "Opening"
        : "Steady"
    : null;
  const latestEvents = [
    ...raceEvents.slice(0, 4),
    ...laserLog.slice(0, 3).map((entry) => ({
      id: `laser:${entry.id}`,
      label: `${entry.phase} ${entry.attacker}: ${entry.hit ? "hit" : "miss"} ${entry.target} ${entry.adjustedRoll}${entry.hit ? ` ${entry.targetType === "missile" ? "Destroyed" : damageResultLabel(entry.damageResult)}` : ""}`,
    })),
    ...missileLog.slice(0, 2).map((entry) => ({
      id: `missile:${entry.id}`,
      label: entry.label,
    })),
    ...turnHistory.slice(0, 2).map((entry) => ({
      id: `turn:${entry.turn}`,
      label: `T${entry.turn} thrust ${entry.playerThrust}/${entry.opponentThrust} R${entry.rangeBefore ?? "-"}-${entry.rangeAfter ?? "-"}`,
    })),
  ].slice(0, 5);
  const combatLog = [
    ...laserLog.slice(0, 4).map((entry) => ({
      id: `laser-detail:${entry.id}`,
      label: `T${entry.turn} ${entry.phase} ${entry.attacker} -> ${entry.target}`,
      detail: `2D ${entry.roll} ${entry.modifier >= 0 ? "+" : "-"} DM${Math.abs(entry.modifier)} = ${entry.adjustedRoll} ${entry.hit ? "hit" : "miss"}${entry.damageRoll !== null ? `; dmg ${entry.damageRoll} ${damageResultLabel(entry.damageResult)}` : ""}`,
    })),
    ...missileLog
      .filter((entry) => entry.detail)
      .slice(0, 4)
      .map((entry) => ({
        id: `ordnance-detail:${entry.id}`,
        label: entry.label,
        detail: entry.detail ?? "",
      })),
  ].slice(0, 6);
  const isGrandPrix = selectedScenario.id === grandPrixScenarioId;
  const playerRaceProgress = grandPrixState?.racers.find((racer) => racer.side === "player") ?? null;
  const playerRaceCheckpoint = playerShip && grandPrixState
    ? nextGrandPrixCheckpoint(grandPrixState, playerShip.id)
    : null;
  const raceLandingPreview = isGrandPrix && playerShip && playerRaceCheckpoint
    ? grandPrixLandingPreview(playerShip, effectivePendingThrust, playerRaceCheckpoint)
    : null;
  const objective = isGrandPrix && grandPrixState
    ? {
        status: grandPrixState.winner === "player" ? "success" as const : grandPrixState.winner ? "failed" as const : "in-progress" as const,
        progress: grandPrixState.winner
          ? grandPrixState.winner === "player" ? "Grand Prix won" : "Opponent won the Grand Prix"
          : `Next: ${playerRaceCheckpoint?.label ?? "Finish"} · ${Math.max(0, (playerRaceProgress?.nextCheckpointIndex ?? 1) - 1)}/4 landings`,
      }
    : objectiveResult(selectedScenario, encounter, objectiveProgress);
  const scenarioActive = maydayWorkflow === "playing";
  const scenarioComplete = scenarioActive && objective.status !== "in-progress";
  const currentShipCombatResult = shipMode === "current-ship" && startedScenario
    ? summarizeMaydayPlayerCombatResult(startedScenario, encounter, objective.status)
    : null;
  const currentAction = !scenarioActive
    ? {
        label: "Scenario setup",
        detail: "Choose a scenario, then start.",
      }
    : scenarioComplete
    ? {
        label: objective.status === "success" ? "Scenario complete" : "Scenario failed",
        detail: "Restart to play again.",
      }
    : combatPhase === "movement"
      ? {
          label: "Movement phase",
          detail: "Choose thrust, then advance.",
        }
      : combatPhase === "laser"
        ? {
            label: "Laser phase",
            detail: "Select target and fire lasers.",
          }
        : {
            label: "Ordnance phase",
            detail: "Launch ordnance or end ordnance.",
          };

  useLayoutEffect(() => {
    const element = boardRef.current;
    if (!element) return;

    const updateViewport = () => {
      setHudViewport({ width: element.offsetWidth, height: element.offsetHeight });
    };

    updateViewport();
    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  const updateHudLayout = useCallback((
    id: MaydayHudId,
    updater: (layout: MaydayHudLayout) => MaydayHudLayout,
  ) => {
    setHudLayouts((currentLayouts) => ({
      ...currentLayouts,
      [id]: updater(currentLayouts[id] ?? defaultMaydayHudLayouts[id]),
    }));
  }, []);

  const getHudLayout = useCallback(
    (id: MaydayHudId) => hudLayouts[id] ?? defaultMaydayHudLayouts[id],
    [hudLayouts],
  );

  const resetHudLayouts = useCallback(() => {
    setHudLayouts(defaultMaydayHudLayouts);
  }, []);

  const expandBoardToFitEncounter = (nextEncounter: MaydayEncounter) => {
    const positions = [
      ...nextEncounter.ships.flatMap((ship) => [
        ship.position,
        addVector(ship.position, ship.velocity),
      ]),
      ...encounterMissiles(nextEncounter).flatMap((missile) => [
        missile.position,
        addVector(missile.position, missile.velocity),
      ]),
    ];

    setBoardRadius((currentRadius) => expandedMaydayBoardRadius(currentRadius, positions));
  };

  const resetEncounter = (scenario: MaydayScenario = selectedScenario) => {
    setEncounter(scenario.encounter);
    setPendingThrust({ q: 0, r: 0 });
    setCombatPhase("movement");
    setObjectiveProgress(initialObjectiveProgress());
    setGrandPrixState(scenario.id === grandPrixScenarioId ? createGrandPrixState(scenario.encounter) : null);
    setRaceEvents([]);
    setSelectedLaserTargetId("");
    setTurnHistory([]);
    setLaserLog([]);
    setMissileLog([]);
    setActiveSandShipIds([]);
    setBoardRadius(maydayInitialBoardRadius);
    setPan({ x: 0, y: 0 });
    setDrag(null);
  };

  const selectScenario = (nextScenarioId: string) => {
    const scenario = nextScenarioId === customScenarioId
      ? customScenario
      : maydayScenarios.find((item) => item.id === nextScenarioId) ?? defaultScenario;
    setScenarioId(scenario.id);
    setStartedScenario(null);
    setMaydayWorkflow("setup");
    resetEncounter(scenario);
  };

  const updateCustomSetup = (key: keyof MaydayCustomSetup, value: number) => {
    setCustomSetup((currentSetup) => ({
      ...currentSetup,
      [key]: value,
    }));
  };

  const applyCustomTemplate = (side: "player" | "opponent", templateId: MaydayShipTemplateId) => {
    if (side === "player") {
      setPlayerTemplateId(templateId);
    } else {
      setOpponentTemplateId(templateId);
    }
    setCustomSetup((currentSetup) => applyShipTemplateToCustomSetup(currentSetup, side, templateId));
  };

  const startCustomScenario = () => {
    const trainingScenario = buildCustomScenario(customSetup);
    const scenario = shipMode === "current-ship"
      ? activeShip
        ? buildMaydayScenarioForPlayerShip(trainingScenario, activeShip)
        : null
      : trainingScenario;
    if (!scenario) return;

    setCustomScenario(scenario);
    setScenarioId(customScenarioId);
    setStartedScenario(scenario);
    resetEncounter(scenario);
    setMaydayWorkflow("playing");
  };

  const startSelectedScenario = () => {
    if (scenarioId === customScenarioId) {
      startCustomScenario();
      return;
    }

    const scenario = shipMode === "current-ship" ? currentShipScenario : selectedScenario;
    if (!scenario) return;

    setStartedScenario(scenario);
    resetEncounter(scenario);
    setMaydayWorkflow("playing");
  };

  const restartScenario = () => {
    resetEncounter(startedScenario ?? selectedScenario);
    setMaydayWorkflow("playing");
  };

  const chooseNewScenario = () => {
    resetEncounter(selectedScenario);
    setMaydayWorkflow("setup");
  };

  const startPan = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      pan,
    });
  };

  const movePan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const scaleX = boardWidth / bounds.width;
    const scaleY = boardHeight / bounds.height;
    setPan({
      x: drag.pan.x + (event.clientX - drag.clientX) * scaleX,
      y: drag.pan.y + (event.clientY - drag.clientY) * scaleY,
    });
  };

  const stopPan = (event: React.PointerEvent<SVGSVGElement>) => {
    if (drag?.pointerId === event.pointerId) setDrag(null);
  };

  const centerBoardOn = (position: MaydayVector) => {
    setPan(maydayPanToCenter(position, { width: boardWidth, height: boardHeight }, boardCenter, hexRadius));
    setDrag(null);
  };

  const advanceTurn = () => {
    if (!scenarioActive || scenarioComplete || combatPhase !== "movement") return;

    const playerBefore = encounter.ships.find((ship) => ship.side === "player") ?? null;
    const opponentBefore = encounter.ships.find((ship) => ship.side === "opponent") ?? null;
    const playerProjectedVelocity = playerBefore
      ? {
          q: playerBefore.velocity.q + (shipCanThrust(playerBefore) ? pendingThrust.q : 0),
          r: playerBefore.velocity.r + (shipCanThrust(playerBefore) ? pendingThrust.r : 0),
        }
      : null;
    const opponentRaceCheckpoint = opponentBefore && grandPrixState
      ? nextGrandPrixCheckpoint(grandPrixState, opponentBefore.id)
      : null;
    const opponentThrust = isGrandPrix && opponentBefore && opponentRaceCheckpoint
      ? { vector: chooseGrandPrixThrust(opponentBefore, opponentRaceCheckpoint), label: "Race" }
      : playerBefore && opponentBefore && playerProjectedVelocity
      ? chooseOpponentThrust({
          behavior: opponentBehavior,
          opponent: opponentBefore,
          player: playerBefore,
          projectedPlayerVelocity: playerProjectedVelocity,
          thrustLabel,
        })
      : { vector: { q: 0, r: 0 }, label: "Coast" };

    const { encounter: nextEncounter, missileImpacts } = advanceEncounter(
      encounter,
      effectivePendingThrust,
      opponentThrust.vector,
      new Set(activeSandShipIds),
    );
    const nextProgress = nextObjectiveProgress(selectedScenario, nextEncounter, objectiveProgress);
    const nextRaceState = isGrandPrix && grandPrixState ? advanceGrandPrixState(grandPrixState, nextEncounter) : null;
    const completedRaceLegs = nextRaceState && grandPrixState
      ? completedGrandPrixLegs(grandPrixState, nextRaceState)
      : [];
    const nextObjective = nextRaceState
      ? { status: nextRaceState.winner === "player" ? "success" as const : nextRaceState.winner ? "failed" as const : "in-progress" as const }
      : objectiveResult(selectedScenario, nextEncounter, nextProgress);
    const playerAfter = nextEncounter.ships.find((ship) => ship.side === "player") ?? null;
    expandBoardToFitEncounter(nextEncounter);
    setEncounter(nextEncounter);
    setObjectiveProgress(nextProgress);
    if (nextRaceState) setGrandPrixState(nextRaceState);
    if (completedRaceLegs.length > 0) {
      setRaceEvents((currentEvents) => [
        ...completedRaceLegs.map((event) => ({
          id: `race:${nextEncounter.turn}:${event.shipId}:${event.checkpoint.id}`,
          turn: nextEncounter.turn,
          label: event.side === "player"
            ? `Landed at ${event.checkpoint.label}${event.nextCheckpoint ? ` — next destination ${event.nextCheckpoint.label}` : " — race complete"}`
            : `Opponent landed at ${event.checkpoint.label}`,
        })),
        ...currentEvents,
      ].slice(0, 8));
    }
    setTurnHistory((currentHistory) => [
      {
        turn: encounter.turn,
        playerThrust: thrustLabel(effectivePendingThrust),
        opponentThrust: opponentThrust.label,
        playerFrom: playerBefore?.position ?? null,
        playerTo: playerAfter?.position ?? null,
        rangeBefore: rangeForEncounter(encounter),
        rangeAfter: rangeForEncounter(nextEncounter),
        objectiveStatus: nextObjective.status,
      },
      ...currentHistory,
    ].slice(0, 5));
    if (missileImpacts.length > 0) {
      setMissileLog((currentLog) => [
        ...missileImpacts.map((impact) => ({
          id: impact.id,
          turn: impact.turn,
          label: impact.stoppedBySand
            ? `T${impact.turn} sand stopped missile at ${impact.target} (${impact.sandRoll})`
            : `T${impact.turn} missile hit ${impact.target}: ${damageResultLabel(impact.damageResult)} (${impact.damageRoll})${impact.sandRoll !== null ? ` sand ${impact.sandRoll}` : ""}`,
          detail: impact.stoppedBySand
            ? `sand ${impact.sandRoll} >= 4; missile stopped`
            : `sand ${impact.sandRoll ?? "none"}; damage ${impact.damageRoll} ${damageResultLabel(impact.damageResult)}`,
        })),
        ...currentLog,
      ].slice(0, 6));
    }
    setActiveSandShipIds([]);
    setPendingThrust({ q: 0, r: 0 });
    setCombatPhase(isGrandPrix ? "movement" : "laser");
  };

  const chooseThrust = (direction: MaydayVector) => {
    if (!scenarioActive) return;
    if (playerShip && !shipCanThrust(playerShip)) return;
    if (playerShip) {
      const projectedDestination = addVector(
        playerShip.position,
        addVector(playerShip.velocity, direction),
      );
      setBoardRadius((currentRadius) =>
        expandedMaydayBoardRadius(currentRadius, [projectedDestination])
      );
    }
    setPendingThrust(direction);
  };

  const fireLasers = () => {
    if (!scenarioActive || scenarioComplete || combatPhase !== "laser") return;

    const attacker = encounter.ships.find((ship) => ship.side === "player") ?? null;
    const target = selectedLaserTargetOption?.target ?? null;
    const returnTarget = encounter.ships.find((ship) => ship.side === "opponent") ?? null;
    if (!attacker || !target || !returnTarget) return;

    const playerFire = resolveLaserFire({
      attacker,
      target,
      turn: encounter.turn,
      phase: "laser",
    });
    const returnFire = resolveLaserFire({
      attacker: returnTarget,
      target: attacker,
      turn: encounter.turn,
      phase: "return",
    });
    const laserResults = [playerFire, returnFire].filter(
      (entry): entry is LaserFireResult => entry !== null,
    );

    setLaserLog((currentLog) => [
      ...laserResults,
      ...currentLog,
    ].slice(0, 6));
    const damagedEncounter = applyLaserDamage(encounter, laserResults);
    const nextEncounter = removeDestroyedMissiles(damagedEncounter, laserResults);
    setEncounter(nextEncounter);
    if (nextEncounter.missiles?.length !== damagedEncounter.missiles?.length) setSelectedLaserTargetId("");
    setCombatPhase("ordnance");
  };

  const launchMissile = () => {
    if (!scenarioActive || scenarioComplete || combatPhase !== "ordnance") return;

    const launcher = encounter.ships.find((ship) => ship.side === "player") ?? null;
    const target = encounter.ships.find((ship) => ship.side === "opponent") ?? null;
    if (!launcher || !target || !shipCanLaunchMissile(launcher)) return;

    const missile = buildMissile({
      turn: encounter.turn,
      launcher,
      target,
      index: encounterMissiles(encounter).length,
    });

    setEncounter({
      ...encounter,
      missiles: [...encounterMissiles(encounter), missile],
      ships: encounter.ships.map((ship) =>
        ship.id === launcher.id
          ? { ...ship, missiles: Math.max(0, (ship.missiles ?? 0) - 1) }
          : ship,
      ),
    });
    setMissileLog((currentLog) => [
      {
        id: missile.id,
        turn: encounter.turn,
        label: `T${encounter.turn} ${launcher.name} launched at ${target.name}`,
      },
      ...currentLog,
    ].slice(0, 4));
  };

  const launchSand = () => {
    if (!scenarioActive || scenarioComplete || combatPhase !== "ordnance") return;

    const ship = encounter.ships.find((item) => item.side === "player") ?? null;
    if (!ship || !shipCanLaunchSand(ship) || activeSandShipIds.includes(ship.id)) return;

    setEncounter({
      ...encounter,
      ships: encounter.ships.map((item) =>
        item.id === ship.id
          ? { ...item, sand: Math.max(0, (item.sand ?? 0) - 1) }
          : item,
      ),
    });
    setActiveSandShipIds((currentIds) => [...currentIds, ship.id]);
    setMissileLog((currentLog) => [
      {
        id: `${encounter.turn}:sand:${ship.id}:${ship.sand ?? 0}`,
        turn: encounter.turn,
        label: `T${encounter.turn} ${ship.name} launched sand`,
      },
      ...currentLog,
    ].slice(0, 6));
  };

  const endOrdnance = () => {
    if (!scenarioActive || combatPhase !== "ordnance") return;

    const {
      encounter: nextEncounter,
      activeSandShipIds: nextActiveSandShipIds,
      events: ordnanceEvents,
    } = resolveOpponentOrdnanceCloseout(encounter, activeSandShipIds);

    setEncounter(nextEncounter);
    setActiveSandShipIds(nextActiveSandShipIds);
    if (ordnanceEvents.length > 0) {
      setMissileLog((currentLog) => [
        ...ordnanceEvents,
        ...currentLog,
      ].slice(0, 6));
    }
    setCombatPhase("movement");
  };

  return (
    <div
      ref={boardRef}
      className="relative h-full min-h-0 overflow-hidden border border-(--hud-border-subtle) bg-black/20 font-mono text-[8px] uppercase tracking-wider text-(--hud-text)"
    >
      <div className="absolute inset-0">
        <svg
          viewBox={`0 0 ${boardWidth} ${boardHeight}`}
          className={["h-full w-full touch-none", drag ? "cursor-grabbing" : "cursor-grab"].join(" ")}
          role="img"
          aria-label="Mayday tactical hex board"
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={stopPan}
          onPointerCancel={stopPan}
          onLostPointerCapture={() => setDrag(null)}
        >
          <rect width={boardWidth} height={boardHeight} fill="rgba(2, 7, 12, 0.72)" />
          <g transform={`translate(${pan.x} ${pan.y})`}>
            {hexes.map((hex) => {
              const center = axialToPixel(hex);
              const isAxis = hex.q === 0 || hex.r === 0 || hex.q + hex.r === 0;
              return (
                <g key={`${hex.q}:${hex.r}`}>
                  <polygon
                    points={hexPoints(center)}
                    fill="transparent"
                    stroke={isAxis ? "rgba(216,226,223,0.22)" : "rgba(216,226,223,0.11)"}
                    strokeWidth={isAxis ? 1.1 : 0.7}
                  />
                  {(hex.q === 0 && hex.r === 0) && (
                    <circle cx={center.x} cy={center.y} r="2" fill="rgba(216,226,223,0.55)" />
                  )}
                </g>
              );
            })}

            {isGrandPrix && grandPrixCheckpoints.slice(0, 4).map((checkpoint, checkpointIndex) => {
              const center = axialToPixel(checkpoint.position);
              const marker = grandPrixState
                ? grandPrixMarkerState(grandPrixState, checkpointIndex)
                : { completed: checkpointIndex === 0, playerTarget: false, opponentTarget: false };
              return (
                <g key={checkpoint.id}>
                  {marker.playerTarget && (
                    <circle cx={center.x} cy={center.y} r="17" fill="none" stroke="#a7f3d0" strokeWidth="2" strokeDasharray="4 3" />
                  )}
                  {marker.opponentTarget && (
                    <circle cx={center.x} cy={center.y} r="14" fill="none" stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="2 3" />
                  )}
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r="11"
                    fill={marker.completed ? "rgba(52,211,153,0.24)" : "rgba(125,211,252,0.20)"}
                    stroke={marker.completed ? "#a7f3d0" : "#bae6fd"}
                    strokeWidth="2"
                  />
                  {marker.completed && <path d={`M ${center.x - 5} ${center.y} l 3 3 l 7 -7`} fill="none" stroke="#d1fae5" strokeWidth="2" />}
                  <text x={center.x} y={center.y - 16} textAnchor="middle" className="fill-(--hud-text)" fontSize="9" letterSpacing="0">
                    {checkpoint.label}
                  </text>
                </g>
              );
            })}

            {projectedPlayerDestination && (
              <g>
                {(() => {
                  const projectedCenter = axialToPixel(projectedPlayerDestination);
                  return (
                    <>
                      <circle
                        cx={projectedCenter.x}
                        cy={projectedCenter.y}
                        r="16"
                        fill="rgba(216,226,223,0.08)"
                        stroke="var(--hud-accent)"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                      />
                      <text
                        x={projectedCenter.x}
                        y={projectedCenter.y + 28}
                        textAnchor="middle"
                        className="fill-(--hud-accent)"
                        fontSize="9"
                        letterSpacing="0"
                      >
                        Projected
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {playerShip && primaryContact && contactRange !== null && (
              <g>
                {(() => {
                  const playerCenter = axialToPixel(playerShip.position);
                  const contactCenter = axialToPixel(primaryContact.position);
                  const labelCenter = {
                    x: (playerCenter.x + contactCenter.x) / 2,
                    y: (playerCenter.y + contactCenter.y) / 2,
                  };
                  return (
                    <>
                      <line
                        x1={playerCenter.x}
                        y1={playerCenter.y}
                        x2={contactCenter.x}
                        y2={contactCenter.y}
                        stroke="rgba(216,226,223,0.32)"
                        strokeWidth="1.5"
                        strokeDasharray="2 5"
                      />
                      <rect
                        x={labelCenter.x - 26}
                        y={labelCenter.y - 9}
                        width="52"
                        height="16"
                        fill="rgba(2,7,12,0.76)"
                        stroke="rgba(216,226,223,0.22)"
                      />
                      <text
                        x={labelCenter.x}
                        y={labelCenter.y + 2}
                        textAnchor="middle"
                        className="fill-(--hud-text-dim)"
                        fontSize="8"
                        letterSpacing="0"
                      >
                        Range {contactRange}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {encounter.ships.map((ship) => {
              const center = axialToPixel(ship.position);
              const displayedVelocity = ship.side === "player"
                ? {
                    q: ship.velocity.q + effectivePendingThrust.q,
                    r: ship.velocity.r + effectivePendingThrust.r,
                  }
                : ship.side === "opponent"
                  ? {
                      q: ship.velocity.q + (projectedOpponentThrust?.vector.q ?? 0),
                      r: ship.velocity.r + (projectedOpponentThrust?.vector.r ?? 0),
                    }
                : ship.velocity;
              const next = axialToPixel({
                q: ship.position.q + displayedVelocity.q,
                r: ship.position.r + displayedVelocity.r,
              });
              const player = ship.side === "player";
              const disabled = shipCombatDisabled(ship);
              return (
                <g key={ship.id}>
                  <line
                    x1={center.x}
                    y1={center.y}
                    x2={next.x}
                    y2={next.y}
                    stroke={player ? "#a7f3d0" : "#fca5a5"}
                    strokeWidth="2"
                    strokeDasharray="5 4"
                    opacity="0.78"
                  />
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r="13"
                    fill={player ? "rgba(16,185,129,0.24)" : "rgba(248,113,113,0.24)"}
                    stroke={player ? "#a7f3d0" : "#fca5a5"}
                    strokeWidth="2"
                  />
                  {disabled && (
                    <>
                      <line
                        x1={center.x - 12}
                        y1={center.y - 12}
                        x2={center.x + 12}
                        y2={center.y + 12}
                        stroke="#fca5a5"
                        strokeWidth="2.5"
                      />
                      <line
                        x1={center.x + 12}
                        y1={center.y - 12}
                        x2={center.x - 12}
                        y2={center.y + 12}
                        stroke="#fca5a5"
                        strokeWidth="2.5"
                      />
                    </>
                  )}
                  <path
                    d={`M ${center.x} ${center.y - 8} L ${center.x + 8} ${center.y + 8} L ${center.x} ${center.y + 4} L ${center.x - 8} ${center.y + 8} Z`}
                    fill={player ? "#d1fae5" : "#fee2e2"}
                    opacity="0.92"
                  />
                  <text
                    x={center.x}
                    y={center.y - 18}
                    textAnchor="middle"
                    className="fill-(--hud-text)"
                    fontSize="10"
                    letterSpacing="0"
                  >
                    {ship.name}
                  </text>
                </g>
              );
            })}
            {encounterMissiles(encounter).map((missile) => {
              const center = axialToPixel(missile.position);
              const next = axialToPixel(addVector(missile.position, missile.velocity));
              return (
                <g key={missile.id}>
                  <line
                    x1={center.x}
                    y1={center.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="#fde68a"
                    strokeWidth="1.5"
                    strokeDasharray="2 3"
                    opacity="0.85"
                  />
                  <polygon
                    points={`${center.x},${center.y - 7} ${center.x + 7},${center.y} ${center.x},${center.y + 7} ${center.x - 7},${center.y}`}
                    fill="rgba(253,230,138,0.26)"
                    stroke="#fde68a"
                    strokeWidth="1.5"
                  />
                  <text
                    x={center.x}
                    y={center.y + 18}
                    textAnchor="middle"
                    className="fill-(--hud-text)"
                    fontSize="8"
                    letterSpacing="0"
                  >
                    M{missile.age}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute left-2 top-2 z-40 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={resetHudLayouts}
            className="border border-(--hud-border) bg-(--hud-bg)/80 px-2 py-1 text-[8px] text-(--hud-text-dim) shadow-[0_0_18px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
          >
            Reset HUDs
          </button>
          {(Object.keys(defaultMaydayHudLayouts) as MaydayHudId[])
            .filter((id) => !getHudLayout(id).visible && (id !== "setup" || isCustomScenario))
            .map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => updateHudLayout(id, (currentLayout) => ({
                  ...currentLayout,
                  visible: true,
                  position: defaultMaydayHudLayouts[id].position,
                }))}
                className="border border-(--hud-border-subtle) bg-(--hud-bg)/72 px-2 py-1 text-[8px] text-(--hud-text-dim) shadow-[0_0_18px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
              >
                {maydayHudTitles[id]}
              </button>
            ))}
        </div>

        <MaydayFloatingHud
          id="status"
          title="Status"
          layout={getHudLayout("status")}
          viewport={hudViewport}
          onLayoutChange={updateHudLayout}
          className="w-[min(44rem,calc(100vw-28rem))]"
        >
          <div className="grid grid-cols-[9rem_minmax(0,1fr)_3rem_4.5rem_3.5rem_3.5rem] gap-2">
            <label className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[7px] tracking-widest text-(--hud-text-dim)">Scenario</span>
              <select
                value={scenarioId}
                onChange={(event) => selectScenario(event.target.value)}
                className="h-6 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
              >
                {maydayScenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
                <option value={customScenarioId}>Custom</option>
              </select>
            </label>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[7px] tracking-widest text-(--hud-text-dim)">Objective</span>
                <span
                  className={[
                    "text-[7px] font-bold",
                    objective.status === "success" ? "text-emerald-200" : "",
                    objective.status === "failed" ? "text-red-200" : "",
                    objective.status === "in-progress" ? "text-(--hud-accent)" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {objective.status === "success"
                    ? "Complete"
                    : objective.status === "failed"
                      ? "Failed"
                      : "Active"}
                </span>
              </div>
              <div className="truncate normal-case tracking-normal text-(--hud-text-dim)">
                {selectedScenario.objective.label}
              </div>
            </div>
            <div>
              <div className="text-[7px] tracking-widest text-(--hud-text-dim)">Turn</div>
              <div>{encounter.turn}</div>
            </div>
            <div>
              <div className="text-[7px] tracking-widest text-(--hud-text-dim)">Phase</div>
              <div
                className={[
                  combatPhase === "laser" ? "text-red-200" : "",
                  combatPhase === "ordnance" ? "text-yellow-200" : "",
                  combatPhase === "movement" ? "text-(--hud-text)" : "",
                ].filter(Boolean).join(" ")}
              >
                {combatPhase}
              </div>
            </div>
            <div>
              <div className="text-[7px] tracking-widest text-(--hud-text-dim)">Range</div>
              <div>{contactRange ?? "-"}</div>
            </div>
            <div>
              <div className="text-[7px] tracking-widest text-(--hud-text-dim)">Next</div>
              <div>{projectedContactRange ?? "-"}</div>
            </div>
          </div>
          <div className="mt-1 truncate text-(--hud-accent)">{objective.progress}</div>
        </MaydayFloatingHud>

        <MaydayFloatingHud
          id="action"
          title="Current Action"
          layout={getHudLayout("action")}
          viewport={hudViewport}
          onLayoutChange={updateHudLayout}
          className="w-72"
        >
          <div className="flex flex-col gap-2">
            <div
              className={[
                "text-[9px] font-bold tracking-widest",
                !scenarioActive
                  ? "text-(--hud-accent)"
                  : scenarioComplete
                  ? objective.status === "success"
                    ? "text-emerald-200"
                    : "text-red-200"
                  : combatPhase === "laser"
                    ? "text-red-200"
                    : combatPhase === "ordnance"
                      ? "text-yellow-200"
                      : "text-(--hud-accent)",
              ].join(" ")}
            >
              {currentAction.label}
            </div>
            <div className="normal-case tracking-normal text-(--hud-text-dim)">
              {currentAction.detail}
            </div>
            {!scenarioActive && (
              <div className="flex flex-col gap-1">
                {!isGrandPrix && <label className="flex flex-col gap-1">
                  <span className="text-[7px] tracking-widest text-(--hud-text-dim)">Scenario</span>
                  <select
                    value={scenarioId}
                    onChange={(event) => selectScenario(event.target.value)}
                    className="h-7 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
                  >
                    {maydayScenarios.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.label}
                      </option>
                    ))}
                    <option value={customScenarioId}>Custom</option>
                  </select>
                </label>}
                <div className="flex flex-col gap-1">
                  <span className="text-[7px] tracking-widest text-(--hud-text-dim)">Ship</span>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setShipMode("training")}
                      className={[
                        "h-7 border text-[8px] transition-colors",
                        shipMode === "training"
                          ? "border-(--hud-accent) bg-(--hud-accent)/10 text-(--hud-text)"
                          : "border-(--hud-border-subtle) text-(--hud-text-dim) hover:border-(--hud-accent)",
                      ].join(" ")}
                    >
                      Training
                    </button>
                    <button
                      type="button"
                      onClick={() => setShipMode("current-ship")}
                      disabled={!currentShipScenario}
                      className={[
                        "h-7 border text-[8px] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                        shipMode === "current-ship"
                          ? "border-(--hud-accent) bg-(--hud-accent)/10 text-(--hud-text)"
                          : "border-(--hud-border-subtle) text-(--hud-text-dim) hover:border-(--hud-accent)",
                      ].join(" ")}
                    >
                      Current Ship
                    </button>
                  </div>
                  {shipMode === "current-ship" && activeShip && currentShipScenario && (
                    <div className="normal-case tracking-normal text-(--hud-accent)">
                      {activeShip.name} · {activeShip.type}
                    </div>
                  )}
                  {currentShipUnavailableReason && (
                    <div className="normal-case tracking-normal text-(--hud-text-dim)">
                      {currentShipUnavailableReason}
                    </div>
                  )}
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-[7px] tracking-widest text-(--hud-text-dim)">Opponent tactic</span>
                  <select
                    value={opponentBehavior}
                    onChange={(event) => setOpponentBehavior(event.target.value as OpponentBehavior)}
                    className="h-7 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
                  >
                    {opponentBehaviors.map((behavior) => (
                      <option key={behavior.id} value={behavior.id}>
                        {behavior.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={startSelectedScenario}
                  disabled={shipMode === "current-ship" && !currentShipScenario}
                  className="h-8 border border-(--hud-accent) bg-(--hud-accent)/10 text-[8px] font-bold text-(--hud-text) transition-colors hover:bg-(--hud-accent)/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Start Scenario
                </button>
              </div>
            )}
            {scenarioActive && !scenarioComplete && combatPhase === "movement" && (
              <div className="flex flex-col gap-1">
                {isGrandPrix && raceEvents.find((event) => event.label.startsWith("Landed at")) && (
                  <div className="border border-emerald-200/60 bg-emerald-200/10 px-2 py-1 normal-case tracking-normal text-emerald-100">
                    {raceEvents.find((event) => event.label.startsWith("Landed at"))?.label}
                  </div>
                )}
                <svg
                  viewBox="0 0 152 152"
                  className="mx-auto block h-28 w-28"
                  role="group"
                  aria-label="Select thrust direction"
                >
                  {maneuverOptions.map((option) => {
                    const center = maneuverHexCenter(option.vector);
                    const selected = effectivePendingThrust.q === option.vector.q
                      && effectivePendingThrust.r === option.vector.r;
                    const disabled = !playerShip || !shipCanThrust(playerShip);

                    return (
                      <g key={`${option.vector.q}:${option.vector.r}`}>
                        <polygon
                          points={polygonPoints(center, maneuverHexRadius - 1)}
                          fill={selected ? "rgba(216,226,223,0.24)" : "rgba(8,13,19,0.72)"}
                          stroke={selected ? "var(--hud-accent)" : "var(--hud-border-subtle)"}
                          strokeWidth={selected ? 2 : 1}
                        />
                        <text
                          x={center.x}
                          y={center.y + 3}
                          textAnchor="middle"
                          className={selected ? "fill-(--hud-text)" : "fill-(--hud-text-dim)"}
                          fontSize={option.label === "Coast" ? "7" : "9"}
                          letterSpacing="0"
                        >
                          {option.label}
                        </text>
                        <polygon
                          points={polygonPoints(center, maneuverHexRadius - 1)}
                          fill="transparent"
                          className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
                          onClick={() => {
                            if (!disabled) chooseThrust(option.vector);
                          }}
                        >
                          <title>{option.title}</title>
                        </polygon>
                      </g>
                    );
                  })}
                </svg>
                <div className="grid grid-cols-2 gap-x-2 text-(--hud-text-dim)">
                  <span>Thrust</span>
                  <span className="text-right text-(--hud-accent)">{thrustLabel(effectivePendingThrust)}</span>
                  <span>{isGrandPrix ? "Next world" : "Projected range"}</span>
                  <span className="text-right text-(--hud-text)">{isGrandPrix ? playerRaceCheckpoint?.label ?? "Finish" : projectedContactRange ?? "-"}</span>
                  {isGrandPrix && <><span>Progress</span><span className="text-right text-(--hud-accent)">{Math.max(0, (playerRaceProgress?.nextCheckpointIndex ?? 1) - 1)}/4</span></>}
                  {raceLandingPreview && <>
                    <span>Range</span><span className="text-right text-(--hud-text)">{raceLandingPreview.currentRange}</span>
                    <span>Velocity</span><span className="text-right text-(--hud-text)">{vectorLabel(playerShip?.velocity ?? { q: 0, r: 0 })}</span>
                    <span>Projected range</span><span className="text-right text-(--hud-text)">{raceLandingPreview.projectedRange}</span>
                    <span>Arrival velocity</span><span className="text-right text-(--hud-text)">{vectorLabel(raceLandingPreview.projectedVelocity)}</span>
                  </>}
                </div>
                {raceLandingPreview?.status === "landing-confirmed" && (
                  <div className="border border-emerald-200/60 bg-emerald-200/10 px-2 py-1 text-center font-bold text-emerald-100">Landing confirmed</div>
                )}
                {raceLandingPreview?.status === "too-fast" && (
                  <div className="border border-yellow-200/60 bg-yellow-200/10 px-2 py-1 text-center font-bold text-yellow-100">Too fast to land</div>
                )}
                {isGrandPrix && (
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => playerRaceCheckpoint && centerBoardOn(playerRaceCheckpoint.position)}
                      disabled={!playerRaceCheckpoint}
                      className="h-7 border border-(--hud-border) text-[8px] text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Center Next World
                    </button>
                    <button
                      type="button"
                      onClick={() => playerShip && centerBoardOn(playerShip.position)}
                      disabled={!playerShip}
                      className="h-7 border border-(--hud-border) text-[8px] text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text) disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Center Ship
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={advanceTurn}
                  className="flex h-8 items-center justify-center gap-1 border border-(--hud-accent) bg-(--hud-accent)/10 text-[8px] font-bold text-(--hud-text) transition-colors hover:bg-(--hud-accent)/20"
                >
                  <StepForward size={11} aria-hidden="true" />
                  Confirm Maneuver
                </button>
              </div>
            )}
            {scenarioActive && !scenarioComplete && combatPhase === "laser" && (
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-2 gap-x-2 text-(--hud-text-dim)">
                  <span>Operator</span>
                  <span className="truncate text-right text-(--hud-text)">
                    {playerShip?.gunneryOperator ?? "No qualified crew"}
                  </span>
                  <span>Gunnery</span>
                  <span className="text-right text-(--hud-accent)">+{Math.max(0, playerShip?.gunnery ?? 0)}</span>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-[7px] tracking-widest text-(--hud-text-dim)">Target</span>
                  <select
                    value={selectedLaserTargetOption?.selectId ?? ""}
                    onChange={(event) => setSelectedLaserTargetId(event.target.value)}
                    disabled={laserTargetOptions.length === 0}
                    className="h-7 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {laserTargetOptions.map((option) => (
                      <option key={option.selectId} value={option.selectId}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={fireLasers}
                  disabled={!selectedLaserTargetOption}
                  className="h-8 border border-red-200 bg-red-200/10 text-[8px] font-bold text-(--hud-text) transition-colors hover:bg-red-200/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Fire Lasers
                </button>
              </div>
            )}
            {scenarioActive && !scenarioComplete && combatPhase === "ordnance" && (
              <div className="flex flex-col gap-1">
                {(playerShip && (shipCanLaunchMissile(playerShip) || (shipCanLaunchSand(playerShip) && !activeSandShipIds.includes(playerShip.id)))) && (
                  <div className="grid grid-cols-2 gap-1">
                    {shipCanLaunchMissile(playerShip) && (
                      <button
                        type="button"
                        onClick={launchMissile}
                        className="h-7 border border-yellow-200/60 text-[8px] text-yellow-100 transition-colors hover:bg-yellow-200/10"
                      >
                        Launch Missile
                      </button>
                    )}
                    {shipCanLaunchSand(playerShip) && !activeSandShipIds.includes(playerShip.id) && (
                      <button
                        type="button"
                        onClick={launchSand}
                        className="h-7 border border-cyan-200/60 text-[8px] text-cyan-100 transition-colors hover:bg-cyan-200/10"
                      >
                        Deploy Sand
                      </button>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={endOrdnance}
                  className="h-8 border border-(--hud-accent) bg-(--hud-accent)/10 text-[8px] font-bold text-(--hud-text) transition-colors hover:bg-(--hud-accent)/20"
                >
                  Finish Turn
                </button>
              </div>
            )}
            {scenarioComplete && (
              <div className="flex flex-col gap-1">
                {currentShipCombatResult && (
                  <div className="border border-(--hud-border-subtle) bg-(--hud-surface)/60 p-1.5 text-(--hud-text-dim)">
                    <div className="mb-1 text-[7px] tracking-widest text-(--hud-text)">
                      Combat Result
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 normal-case tracking-normal">
                      <span>Outcome</span>
                      <span className={currentShipCombatResult.outcome === "victory" ? "text-emerald-200" : "text-red-200"}>
                        {currentShipCombatResult.outcome}
                      </span>
                      <span>Missiles used</span>
                      <span>{currentShipCombatResult.missilesConsumed}</span>
                      <span>Sand used</span>
                      <span>{currentShipCombatResult.sandConsumed}</span>
                      <span>Damage</span>
                      <span>
                        {currentShipCombatResult.destroyed
                          ? "Destroyed"
                          : [
                              currentShipCombatResult.damageSustained.mDriveDisabled ? "M-drive" : null,
                              currentShipCombatResult.damageSustained.jDriveDisabled ? "J-drive" : null,
                              currentShipCombatResult.damageSustained.weaponsDisabled ? "Weapons" : null,
                              currentShipCombatResult.damageSustained.computerDisabled ? "Computer" : null,
                            ].filter(Boolean).join(", ") || "None"}
                      </span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={restartScenario}
                    className="h-7 border border-(--hud-border) text-[8px] text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
                  >
                    Restart
                  </button>
                  <button
                    type="button"
                    onClick={chooseNewScenario}
                    className="h-7 border border-(--hud-border) text-[8px] text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
                  >
                    New Scenario
                  </button>
                </div>
              </div>
            )}
          </div>
        </MaydayFloatingHud>

        <MaydayFloatingHud
          id="events"
          title="Events"
          layout={getHudLayout("events")}
          viewport={hudViewport}
          onLayoutChange={updateHudLayout}
          className="max-h-[40vh] w-80 overflow-hidden"
        >
        <div className="flex min-h-0 flex-col gap-2">
        <div className="min-h-0">
          <div className="mb-1 text-[7px] tracking-widest text-(--hud-text-dim)">
            Events
          </div>
          {latestEvents.length > 0 ? (
            <div className="flex flex-col gap-0.5 text-(--hud-text-dim)">
              {latestEvents.map((event) => (
                <div key={event.id} className="truncate">
                  {event.label}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-(--hud-text-dim)">No events</div>
          )}
        </div>

        <div className="border-t border-(--hud-border) pt-1">
          <div className="mb-1 text-[7px] tracking-widest text-(--hud-text-dim)">
            Readout
          </div>
          {playerShip && projectedPlayerVelocity && projectedPlayerDestination && primaryContact && relativeVelocity ? (
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-(--hud-text-dim)">
              <span>Thrust {vectorLabel(effectivePendingThrust)}</span>
              <span className="text-(--hud-accent)">Dest {vectorLabel(projectedPlayerDestination)}</span>
              <span>Rel Vel {vectorLabel(relativeVelocity)}</span>
              <span
                className={[
                  contactTrend === "Closing" ? "text-red-200" : "",
                  contactTrend === "Opening" ? "text-emerald-200" : "",
                  contactTrend === "Steady" ? "text-(--hud-accent)" : "",
                ].filter(Boolean).join(" ")}
              >
                {contactTrend ?? "No trend"}
              </span>
            </div>
          ) : (
            <div className="text-(--hud-text-dim)">No tactical readout</div>
          )}
          <div className="mt-2 border-t border-(--hud-border-subtle) pt-1">
            <div className="mb-1 text-[7px] tracking-widest text-(--hud-text-dim)">
              Combat Log
            </div>
            {combatLog.length > 0 ? (
              <div className="flex flex-col gap-1 text-(--hud-text-dim)">
                {combatLog.map((entry) => (
                  <div key={entry.id} className="min-w-0">
                    <div className="truncate text-(--hud-text)">{entry.label}</div>
                    <div className="truncate normal-case tracking-normal">{entry.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="text-(--hud-text-dim)">No combat rolls</div>
            )}
          </div>
        </div>
        </div>
        </MaydayFloatingHud>

        {isCustomScenario && (
        <MaydayFloatingHud
          id="setup"
          title="Custom Setup"
          layout={getHudLayout("setup")}
          viewport={hudViewport}
          onLayoutChange={updateHudLayout}
          className="w-[min(48rem,calc(100vw-28rem))]"
        >
          <div className="mb-1 text-[7px] tracking-widest text-(--hud-text-dim)">Setup</div>
          <div className="grid min-w-0 grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(5rem,0.7fr)_6rem] gap-1">
            <label className="flex min-w-0 items-center gap-1">
              <span className="shrink-0 text-[7px] text-(--hud-text-dim)">P Ship</span>
              <select
                value={playerTemplateId}
                onChange={(event) => applyCustomTemplate("player", event.target.value as MaydayShipTemplateId)}
                className="h-6 min-w-0 flex-1 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
              >
                {maydayShipTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-1">
              <span className="shrink-0 text-[7px] text-(--hud-text-dim)">O Ship</span>
              <select
                value={opponentTemplateId}
                onChange={(event) => applyCustomTemplate("opponent", event.target.value as MaydayShipTemplateId)}
                className="h-6 min-w-0 flex-1 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
              >
                {maydayShipTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-1">
              <span className="shrink-0 text-[7px] text-(--hud-text-dim)">Range</span>
              <input
                type="number"
                min={1}
                max={14}
                value={customSetup.range}
                onChange={(event) => updateCustomSetup("range", Number(event.target.value))}
                className="h-6 min-w-0 flex-1 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
              />
            </label>
            <button
              type="button"
              onClick={startCustomScenario}
              className="h-6 border border-(--hud-border) px-2 text-[8px] text-(--hud-text-dim) transition-colors hover:border-(--hud-accent) hover:text-(--hud-text)"
            >
              Start
            </button>
          </div>
          <div className="mt-1 grid min-w-0 grid-cols-6 gap-1">
            {([
              ["playerLasers", "P Laser", 0, 6],
              ["playerMissiles", "P Missile", 0, 12],
              ["playerSand", "P Sand", 0, 12],
              ["opponentLasers", "O Laser", 0, 6],
              ["opponentMissiles", "O Missile", 0, 12],
              ["opponentSand", "O Sand", 0, 12],
            ] as const).map(([key, label, min, max]) => (
              <label key={key} className="flex min-w-0 items-center gap-1">
                <span className="shrink-0 text-[7px] text-(--hud-text-dim)">{label}</span>
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={customSetup[key]}
                  onChange={(event) => updateCustomSetup(key, Number(event.target.value))}
                  className="h-6 min-w-0 flex-1 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
                />
              </label>
            ))}
          </div>
          <div className="mt-1 grid min-w-0 grid-cols-6 gap-1">
            {([
              ["playerThrust", "P Thrust", 0, 6],
              ["playerVelocityQ", "P VQ", -6, 6],
              ["playerVelocityR", "P VR", -6, 6],
              ["opponentThrust", "O Thrust", 0, 6],
              ["opponentVelocityQ", "O VQ", -6, 6],
              ["opponentVelocityR", "O VR", -6, 6],
            ] as const).map(([key, label, min, max]) => (
              <label key={key} className="flex min-w-0 items-center gap-1">
                <span className="shrink-0 text-[7px] text-(--hud-text-dim)">{label}</span>
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={customSetup[key]}
                  onChange={(event) => updateCustomSetup(key, Number(event.target.value))}
                  className="h-6 min-w-0 flex-1 border border-(--hud-border-subtle) bg-(--hud-surface) px-1 text-[8px] text-(--hud-text) outline-none transition-colors focus:border-(--hud-accent)"
                />
              </label>
            ))}
          </div>
        </MaydayFloatingHud>
        )}

        <MaydayFloatingHud
          id="ships"
          title="Ships"
          layout={getHudLayout("ships")}
          viewport={hudViewport}
          onLayoutChange={updateHudLayout}
          className="w-[min(40rem,48vw)]"
        >
          <div className="grid grid-cols-[minmax(7rem,1fr)_3.5rem_3.5rem_3rem_3rem_3rem_minmax(8rem,1fr)] border-b border-(--hud-border-subtle) pb-1 text-[7px] tracking-widest text-(--hud-text-dim)">
            <span>Ship</span>
            <span>Pos</span>
            <span>Vel</span>
            <span>T</span>
            <span>M</span>
            <span>S</span>
            <span>Damage</span>
          </div>
          {encounter.ships.map((ship) => (
            <div
              key={ship.id}
              className="grid grid-cols-[minmax(7rem,1fr)_3.5rem_3.5rem_3rem_3rem_3rem_minmax(8rem,1fr)] py-0.5 text-(--hud-text-dim)"
            >
              <span className={ship.side === "player" ? "truncate text-emerald-200" : "truncate text-red-200"}>
                {ship.name}
              </span>
              <span>{vectorLabel(ship.position)}</span>
              <span>{vectorLabel(ship.velocity)}</span>
              <span>{ship.thrustRating}</span>
              <span>{ship.missiles ?? 0}</span>
              <span className={activeSandShipIds.includes(ship.id) ? "text-cyan-200" : ""}>
                {ship.sand ?? 0}{activeSandShipIds.includes(ship.id) ? "*" : ""}
              </span>
              <span className={damageStatusLabel(ship) === "Nominal" ? "truncate" : "truncate text-red-200"}>
                {damageStatusLabel(ship)}
              </span>
            </div>
          ))}
        </MaydayFloatingHud>
      </div>
    </div>
  );
};

export default MaydayBoard;
