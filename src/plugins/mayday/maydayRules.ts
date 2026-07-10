export type MaydaySide = "player" | "opponent";
export type OpponentBehavior = "coast" | "pursue" | "evade" | "intercept";
export type ObjectiveStatus = "in-progress" | "success" | "failed";
export type ObjectiveKind = "range-band" | "escape-range" | "intercept-range" | "approach-contact" | "combat-disable";
export type MaydayCombatPhase = "movement" | "laser" | "ordnance";
export type MaydayTargetType = "ship" | "craft" | "missile";
export type MaydayDamageResult = "none" | "m-drive" | "j-drive" | "weapon" | "computer" | "detonate";

export interface MaydayVector {
  q: number;
  r: number;
}

export interface MaydayShip {
  id: string;
  name: string;
  side: MaydaySide;
  position: MaydayVector;
  velocity: MaydayVector;
  thrustRating: number;
  lasers: number;
  missiles?: number;
  sandcasters?: number;
  sand?: number;
  targetType: MaydayTargetType;
  damage?: MaydayDamageState;
}

export interface MaydayDamageState {
  mDriveDisabled: boolean;
  jDriveDisabled: boolean;
  weaponsDisabled: boolean;
  computerDisabled: boolean;
  detonated: boolean;
}

export interface MaydayEncounter {
  turn: number;
  ships: MaydayShip[];
  missiles?: MaydayMissile[];
}

export interface MaydayMissile {
  id: string;
  ownerId: string;
  targetId: string;
  position: MaydayVector;
  velocity: MaydayVector;
  age: number;
}

export interface MaydayScenario {
  id: string;
  label: string;
  detail: string;
  objective: {
    kind: ObjectiveKind;
    label: string;
  };
  encounter: MaydayEncounter;
}

export interface MaydayCustomSetup {
  range: number;
  playerLasers: number;
  playerMissiles: number;
  playerSand: number;
  playerThrust: number;
  playerVelocityQ: number;
  playerVelocityR: number;
  opponentLasers: number;
  opponentMissiles: number;
  opponentSand: number;
  opponentThrust: number;
  opponentVelocityQ: number;
  opponentVelocityR: number;
}

export type MaydayShipTemplateId = "free-trader" | "corsair" | "patrol-craft" | "unarmed-target";

export interface MaydayShipTemplate {
  id: MaydayShipTemplateId;
  label: string;
  thrust: number;
  lasers: number;
  missiles: number;
  sand: number;
}

export interface ObjectiveProgress {
  rangeBandTurns: number;
}

export interface ObjectiveResult {
  status: ObjectiveStatus;
  progress: string;
}

export interface LaserFireResult {
  id: string;
  turn: number;
  phase: "laser" | "return";
  attackerId: string;
  targetId: string;
  targetType: MaydayTargetType;
  attacker: string;
  target: string;
  range: number;
  roll: number;
  modifier: number;
  adjustedRoll: number;
  hit: boolean;
  damageRoll: number | null;
  damageResult: MaydayDamageResult | null;
}

export interface MaydayOrdnanceEvent {
  id: string;
  turn: number;
  label: string;
  detail?: string;
}

export interface MissileImpactResult {
  id: string;
  turn: number;
  targetId: string;
  target: string;
  damageRoll: number | null;
  damageResult: MaydayDamageResult | null;
  sandRoll: number | null;
  stoppedBySand: boolean;
}

export interface AdvanceEncounterResult {
  encounter: MaydayEncounter;
  missileImpacts: MissileImpactResult[];
}

export interface MaydayLaserTarget {
  id: string;
  name: string;
  position: MaydayVector;
  targetType: MaydayTargetType;
}

export interface MaydayLaserTargetOption {
  selectId: string;
  label: string;
  target: MaydayLaserTarget;
}

export interface OpponentOrdnanceCloseoutResult {
  encounter: MaydayEncounter;
  activeSandShipIds: string[];
  events: MaydayOrdnanceEvent[];
}

export const hexDirections: { label: string; vector: MaydayVector }[] = [
  { label: "E", vector: { q: 1, r: 0 } },
  { label: "NE", vector: { q: 1, r: -1 } },
  { label: "NW", vector: { q: 0, r: -1 } },
  { label: "W", vector: { q: -1, r: 0 } },
  { label: "SW", vector: { q: -1, r: 1 } },
  { label: "SE", vector: { q: 0, r: 1 } },
];

export const opponentMissileLaunchRange = 8;
export const sandStopTarget = 4;
export const customScenarioId = "custom";
export const defaultCustomSetup: MaydayCustomSetup = {
  range: 4,
  playerLasers: 1,
  playerMissiles: 2,
  playerSand: 2,
  playerThrust: 1,
  playerVelocityQ: 0,
  playerVelocityR: 0,
  opponentLasers: 1,
  opponentMissiles: 2,
  opponentSand: 2,
  opponentThrust: 1,
  opponentVelocityQ: 0,
  opponentVelocityR: 0,
};
export const maydayShipTemplates: MaydayShipTemplate[] = [
  {
    id: "free-trader",
    label: "Free Trader",
    thrust: 1,
    lasers: 1,
    missiles: 2,
    sand: 2,
  },
  {
    id: "corsair",
    label: "Corsair",
    thrust: 2,
    lasers: 2,
    missiles: 4,
    sand: 2,
  },
  {
    id: "patrol-craft",
    label: "Patrol Craft",
    thrust: 3,
    lasers: 2,
    missiles: 6,
    sand: 4,
  },
  {
    id: "unarmed-target",
    label: "Unarmed Target",
    thrust: 0,
    lasers: 0,
    missiles: 0,
    sand: 0,
  },
];

export const vectorLabel = (vector: MaydayVector) => `${vector.q}, ${vector.r}`;

export const hexRange = (from: MaydayVector, to: MaydayVector) => {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
};

export const addVector = (left: MaydayVector, right: MaydayVector): MaydayVector => ({
  q: left.q + right.q,
  r: left.r + right.r,
});

export const subtractVector = (left: MaydayVector, right: MaydayVector): MaydayVector => ({
  q: left.q - right.q,
  r: left.r - right.r,
});

export const clampSetupValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.trunc(Number.isFinite(value) ? value : min)));

export const applyShipTemplateToCustomSetup = (
  setup: MaydayCustomSetup,
  side: MaydaySide,
  templateId: MaydayShipTemplateId,
): MaydayCustomSetup => {
  const template = maydayShipTemplates.find((item) => item.id === templateId);
  if (!template) return setup;

  if (side === "player") {
    return {
      ...setup,
      playerThrust: template.thrust,
      playerLasers: template.lasers,
      playerMissiles: template.missiles,
      playerSand: template.sand,
    };
  }

  return {
    ...setup,
    opponentThrust: template.thrust,
    opponentLasers: template.lasers,
    opponentMissiles: template.missiles,
    opponentSand: template.sand,
  };
};

export const buildCustomScenario = (setup: MaydayCustomSetup): MaydayScenario => {
  const range = clampSetupValue(setup.range, 1, 14);
  return {
    id: customScenarioId,
    label: "Custom",
    detail: "Custom two-ship Mayday setup.",
    objective: {
      kind: "combat-disable",
      label: "Disable the opposing ship.",
    },
    encounter: {
      turn: 1,
      ships: [
        {
          id: "free-trader",
          name: "Free Trader",
          side: "player",
          position: { q: 0, r: 0 },
          velocity: {
            q: clampSetupValue(setup.playerVelocityQ, -6, 6),
            r: clampSetupValue(setup.playerVelocityR, -6, 6),
          },
          thrustRating: clampSetupValue(setup.playerThrust, 0, 6),
          lasers: clampSetupValue(setup.playerLasers, 0, 6),
          missiles: clampSetupValue(setup.playerMissiles, 0, 12),
          sandcasters: setup.playerSand > 0 ? 1 : 0,
          sand: clampSetupValue(setup.playerSand, 0, 12),
          targetType: "ship",
        },
        {
          id: "corsair",
          name: "Corsair",
          side: "opponent",
          position: { q: range, r: 0 },
          velocity: {
            q: clampSetupValue(setup.opponentVelocityQ, -6, 6),
            r: clampSetupValue(setup.opponentVelocityR, -6, 6),
          },
          thrustRating: clampSetupValue(setup.opponentThrust, 0, 6),
          lasers: clampSetupValue(setup.opponentLasers, 0, 6),
          missiles: clampSetupValue(setup.opponentMissiles, 0, 12),
          sandcasters: setup.opponentSand > 0 ? 1 : 0,
          sand: clampSetupValue(setup.opponentSand, 0, 12),
          targetType: "ship",
        },
      ],
    },
  };
};

export const undamagedShip = (): MaydayDamageState => ({
  mDriveDisabled: false,
  jDriveDisabled: false,
  weaponsDisabled: false,
  computerDisabled: false,
  detonated: false,
});

export const shipDamage = (ship: MaydayShip): MaydayDamageState => ship.damage ?? undamagedShip();

export const shipCanThrust = (ship: MaydayShip) => !shipDamage(ship).mDriveDisabled && !shipDamage(ship).detonated;

export const shipCanFireLasers = (ship: MaydayShip) =>
  ship.lasers > 0 && !shipDamage(ship).weaponsDisabled && !shipDamage(ship).detonated;

export const shipCanLaunchMissile = (ship: MaydayShip) =>
  (ship.missiles ?? 0) > 0 && !shipDamage(ship).detonated;

export const shipCanLaunchSand = (ship: MaydayShip) =>
  (ship.sandcasters ?? 0) > 0
  && (ship.sand ?? 0) > 0
  && !shipDamage(ship).weaponsDisabled
  && !shipDamage(ship).detonated;

export const effectiveThrustRating = (ship: MaydayShip) => shipCanThrust(ship) ? ship.thrustRating : 0;

export const shipCombatDisabled = (ship: MaydayShip) =>
  shipDamage(ship).detonated || !shipCanThrust(ship) || !shipCanFireLasers(ship);

export const encounterMissiles = (encounter: MaydayEncounter) => encounter.missiles ?? [];

const missileGuidanceVectors = [
  { q: 0, r: 0 },
  ...hexDirections.map((direction) => direction.vector),
];

export const missileTrackVelocity = (position: MaydayVector, targetPosition: MaydayVector): MaydayVector =>
  missileGuidanceVectors.reduce((best, vector) => {
    const bestRange = hexRange(addVector(position, best), targetPosition);
    const candidateRange = hexRange(addVector(position, vector), targetPosition);
    return candidateRange < bestRange ? vector : best;
  }, missileGuidanceVectors[0]);

export const buildMissile = ({
  turn,
  launcher,
  target,
  index,
}: {
  turn: number;
  launcher: MaydayShip;
  target: MaydayShip;
  index: number;
}): MaydayMissile => ({
  id: `${turn}:missile:${launcher.id}:${target.id}:${index}`,
  ownerId: launcher.id,
  targetId: target.id,
  position: launcher.position,
  velocity: missileTrackVelocity(launcher.position, target.position),
  age: 0,
});

export const clampAttackRoll = (roll: number) => Math.max(2, Math.min(12, roll));

export const rollTwoDice = () =>
  1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6);

export const rollOneDie = () => 1 + Math.floor(Math.random() * 6);

const laserAttackTable: Record<MaydayTargetType, Set<number>> = {
  ship: new Set([7, 8, 9, 10, 11]),
  craft: new Set([8, 9, 10, 11]),
  missile: new Set([8, 9, 10, 11]),
};

export const damageTableResult = (targetType: MaydayTargetType, roll: number): MaydayDamageResult => {
  if (targetType !== "ship") return "none";
  if (roll === 1) return "m-drive";
  if (roll === 2) return "j-drive";
  if (roll === 5) return "computer";
  if (roll === 6) return "weapon";
  return "none";
};

export const applyDamageResult = (ship: MaydayShip, result: MaydayDamageResult): MaydayShip => {
  const damage = shipDamage(ship);
  const nextDamage = {
    ...damage,
    mDriveDisabled: damage.mDriveDisabled || result === "m-drive",
    jDriveDisabled: damage.jDriveDisabled || result === "j-drive",
    weaponsDisabled: damage.weaponsDisabled || result === "weapon",
    computerDisabled: damage.computerDisabled || result === "computer",
    detonated: damage.detonated || result === "detonate",
  };
  return {
    ...ship,
    damage: nextDamage,
  };
};

export const resolveLaserFire = ({
  attacker,
  target,
  turn,
  phase,
  rollAttack = rollTwoDice,
  rollDamage = rollOneDie,
}: {
  attacker: MaydayShip;
  target: MaydayLaserTarget;
  turn: number;
  phase: LaserFireResult["phase"];
  rollAttack?: () => number;
  rollDamage?: () => number;
}): LaserFireResult | null => {
  if (!shipCanFireLasers(attacker)) return null;

  const range = hexRange(attacker.position, target.position);
  const roll = rollAttack();
  const modifier = range;
  const adjustedRoll = clampAttackRoll(roll + modifier);
  const hit = laserAttackTable[target.targetType].has(adjustedRoll);
  const damageRoll = hit ? rollDamage() : null;
  const damageResult = damageRoll === null ? null : damageTableResult(target.targetType, damageRoll);

  return {
    id: `${turn}:${phase}:${attacker.id}:${target.id}:${roll}:${adjustedRoll}`,
    turn,
    phase,
    attackerId: attacker.id,
    targetId: target.id,
    targetType: target.targetType,
    attacker: attacker.name,
    target: target.name,
    range,
    roll,
    modifier,
    adjustedRoll,
    hit,
    damageRoll,
    damageResult,
  };
};

export const applyLaserDamage = (
  encounter: MaydayEncounter,
  results: LaserFireResult[],
): MaydayEncounter => ({
  ...encounter,
  ships: encounter.ships.map((ship) => {
    const damageResults = results
      .filter((result) =>
        result.targetType === "ship" && result.hit && result.targetId === ship.id && result.damageResult
      )
      .map((result) => result.damageResult as MaydayDamageResult);

    return damageResults.reduce(
      (damagedShip, result) => applyDamageResult(damagedShip, result),
      ship,
    );
  }),
});

export const removeDestroyedMissiles = (
  encounter: MaydayEncounter,
  results: LaserFireResult[],
): MaydayEncounter => {
  const destroyedMissileIds = new Set(
    results
      .filter((result) => result.targetType === "missile" && result.hit)
      .map((result) => result.targetId),
  );

  return {
    ...encounter,
    missiles: encounterMissiles(encounter).filter((missile) => !destroyedMissileIds.has(missile.id)),
  };
};

export const damageResultLabel = (result: MaydayDamageResult | null) => {
  if (result === "m-drive") return "M-Drive";
  if (result === "j-drive") return "J-Drive";
  if (result === "weapon") return "Weapon";
  if (result === "computer") return "Computer";
  if (result === "detonate") return "Detonate";
  return "NE";
};

export const damageStatusLabel = (ship: MaydayShip) => {
  const damage = shipDamage(ship);
  const labels = [
    damage.mDriveDisabled ? "M-Drive" : "",
    damage.jDriveDisabled ? "J-Drive" : "",
    damage.weaponsDisabled ? "Weapon" : "",
    damage.computerDisabled ? "Computer" : "",
    damage.detonated ? "Destroyed" : "",
  ].filter(Boolean);
  return labels.length > 0 ? labels.join(", ") : "Nominal";
};

export const initialObjectiveProgress = (): ObjectiveProgress => ({
  rangeBandTurns: 0,
});

export const sameVector = (left: MaydayVector, right: MaydayVector) =>
  left.q === right.q && left.r === right.r;

export const candidateThrusts = (thrustRating: number) =>
  thrustRating > 0
    ? [{ q: 0, r: 0 }, ...hexDirections.map((direction) => direction.vector)]
    : [{ q: 0, r: 0 }];

export const chooseOpponentThrust = ({
  behavior,
  opponent,
  player,
  projectedPlayerVelocity,
  thrustLabel,
}: {
  behavior: OpponentBehavior;
  opponent: MaydayShip;
  player: MaydayShip;
  projectedPlayerVelocity: MaydayVector;
  thrustLabel: (vector: MaydayVector) => string;
}) => {
  const playerNextPosition = addVector(player.position, projectedPlayerVelocity);
  const choices = candidateThrusts(effectiveThrustRating(opponent));
  if (behavior === "coast") return { vector: { q: 0, r: 0 }, label: "Coast" };

  const ranked = choices.map((vector) => {
    const velocity = addVector(opponent.velocity, vector);
    const position = addVector(opponent.position, velocity);
    const target = behavior === "pursue"
      ? player.position
      : playerNextPosition;
    return {
      vector,
      range: hexRange(position, target),
    };
  });

  const best = ranked.reduce((selected, candidate) => {
    if (behavior === "evade") {
      return candidate.range > selected.range ? candidate : selected;
    }
    return candidate.range < selected.range ? candidate : selected;
  }, ranked[0]);

  return {
    vector: best.vector,
    label: thrustLabel(best.vector),
  };
};

export const primaryShips = (encounter: MaydayEncounter) => {
  const player = encounter.ships.find((ship) => ship.side === "player") ?? null;
  const contact = encounter.ships.find((ship) => ship.side === "opponent") ?? null;
  return { player, contact };
};

export const rangeForEncounter = (encounter: MaydayEncounter) => {
  const { player, contact } = primaryShips(encounter);
  return player && contact ? hexRange(player.position, contact.position) : null;
};

export const nextObjectiveProgress = (
  scenario: MaydayScenario,
  encounter: MaydayEncounter,
  current: ObjectiveProgress,
): ObjectiveProgress => {
  const range = rangeForEncounter(encounter);
  if (scenario.objective.kind !== "range-band" || range === null) return current;

  return {
    ...current,
    rangeBandTurns: range >= 1 && range <= 4 ? current.rangeBandTurns + 1 : 0,
  };
};

export const objectiveResult = (
  scenario: MaydayScenario,
  encounter: MaydayEncounter,
  progress: ObjectiveProgress,
): ObjectiveResult => {
  const { player, contact } = primaryShips(encounter);
  if (scenario.objective.kind === "combat-disable") {
    if (!player || !contact) return { status: "failed", progress: "No contact" };
    if (shipCombatDisabled(contact)) {
      return { status: "success", progress: `${contact.name} disabled` };
    }
    if (shipCombatDisabled(player)) {
      return { status: "failed", progress: `${player.name} disabled` };
    }
    return { status: "in-progress", progress: `${contact.name}: ${damageStatusLabel(contact)}` };
  }

  const range = rangeForEncounter(encounter);
  if (range === null) {
    return { status: "failed", progress: "No contact" };
  }

  switch (scenario.objective.kind) {
    case "range-band": {
      if (progress.rangeBandTurns >= 3) {
        return { status: "success", progress: "Held range band for 3 turns" };
      }
      if (encounter.turn > 12) {
        return { status: "failed", progress: `${progress.rangeBandTurns}/3 turns held` };
      }
      return { status: "in-progress", progress: `${progress.rangeBandTurns}/3 turns held` };
    }
    case "escape-range":
      if (range >= 10) return { status: "success", progress: `Range ${range}` };
      if (range <= 1) return { status: "failed", progress: `Range ${range}` };
      return { status: "in-progress", progress: `Range ${range}/10` };
    case "intercept-range":
      if (range <= 2) return { status: "success", progress: `Range ${range}` };
      if (encounter.turn > 6) return { status: "failed", progress: `Range ${range}; turn ${encounter.turn}` };
      return { status: "in-progress", progress: `Range ${range}; turn ${encounter.turn}/6` };
    case "approach-contact":
      if (range <= 1) return { status: "success", progress: `Range ${range}` };
      return { status: "in-progress", progress: `Range ${range}/1` };
  }
};

export const advanceEncounter = (
  encounter: MaydayEncounter,
  playerThrust: MaydayVector,
  opponentThrust: MaydayVector,
  activeSandShipIds: Set<string>,
  rollDie = rollOneDie,
): AdvanceEncounterResult => {
  let ships = encounter.ships.map((ship) => {
    const allowedPlayerThrust = shipCanThrust(ship) ? playerThrust : { q: 0, r: 0 };
    const allowedOpponentThrust = shipCanThrust(ship) ? opponentThrust : { q: 0, r: 0 };
    const nextVelocity = ship.side === "player"
      ? addVector(ship.velocity, allowedPlayerThrust)
      : ship.side === "opponent"
        ? addVector(ship.velocity, allowedOpponentThrust)
        : ship.velocity;

    return {
      ...ship,
      velocity: nextVelocity,
      position: addVector(ship.position, nextVelocity),
    };
  });
  const missileImpacts: MissileImpactResult[] = [];
  const nextTurn = encounter.turn + 1;

  const missiles = encounterMissiles(encounter).reduce<MaydayMissile[]>((keptMissiles, missile) => {
    const target = ships.find((ship) => ship.id === missile.targetId) ?? null;
    const velocity = target
      ? missileTrackVelocity(missile.position, target.position)
      : missile.velocity;
    const position = addVector(missile.position, velocity);

    if (target && hexRange(position, target.position) === 0) {
      const sandRoll = activeSandShipIds.has(target.id) ? rollDie() : null;
      const stoppedBySand = sandRoll !== null && sandRoll >= sandStopTarget;
      const damageRoll = stoppedBySand ? null : rollDie();
      const damageResult = damageRoll === null ? null : damageTableResult(target.targetType, damageRoll);
      if (damageResult) {
        ships = ships.map((ship) =>
          ship.id === target.id ? applyDamageResult(ship, damageResult) : ship,
        );
      }
      missileImpacts.push({
        id: `${nextTurn}:missile-impact:${missile.id}:${sandRoll ?? "no-sand"}:${damageRoll ?? "stopped"}`,
        turn: nextTurn,
        targetId: target.id,
        target: target.name,
        damageRoll,
        damageResult,
        sandRoll,
        stoppedBySand,
      });
      return keptMissiles;
    }

    keptMissiles.push({
      ...missile,
      age: missile.age + 1,
      velocity,
      position,
    });
    return keptMissiles;
  }, []);

  return {
    encounter: {
      turn: nextTurn,
      ships,
      missiles,
    },
    missileImpacts,
  };
};

export const resolveOpponentOrdnanceCloseout = (
  encounter: MaydayEncounter,
  activeSandShipIds: string[],
): OpponentOrdnanceCloseoutResult => {
  let nextEncounter = encounter;
  const nextActiveSandShipIds = [...activeSandShipIds];
  const events: MaydayOrdnanceEvent[] = [];

  const sandLauncher = nextEncounter.ships.find((ship) => ship.side === "opponent") ?? null;
  const hasPlayerMissileIncoming = sandLauncher
    ? encounterMissiles(nextEncounter).some((missile) => missile.targetId === sandLauncher.id)
    : false;
  if (
    sandLauncher
    && hasPlayerMissileIncoming
    && shipCanLaunchSand(sandLauncher)
    && !nextActiveSandShipIds.includes(sandLauncher.id)
  ) {
    nextEncounter = {
      ...nextEncounter,
      ships: nextEncounter.ships.map((ship) =>
        ship.id === sandLauncher.id
          ? { ...ship, sand: Math.max(0, (ship.sand ?? 0) - 1) }
          : ship,
      ),
    };
    nextActiveSandShipIds.push(sandLauncher.id);
    events.push({
      id: `${encounter.turn}:sand:${sandLauncher.id}:${sandLauncher.sand ?? 0}`,
      turn: encounter.turn,
      label: `T${encounter.turn} ${sandLauncher.name} launched sand`,
    });
  }

  const launcher = nextEncounter.ships.find((ship) => ship.side === "opponent") ?? null;
  const target = nextEncounter.ships.find((ship) => ship.side === "player") ?? null;
  const hasIncomingMissile = launcher && target
    ? encounterMissiles(nextEncounter).some((missile) =>
        missile.ownerId === launcher.id && missile.targetId === target.id
      )
    : false;
  const shouldLaunch = launcher && target
    && shipCanLaunchMissile(launcher)
    && !hasIncomingMissile
    && hexRange(launcher.position, target.position) <= opponentMissileLaunchRange;

  if (shouldLaunch && launcher && target) {
    const missile = buildMissile({
      turn: encounter.turn,
      launcher,
      target,
      index: encounterMissiles(nextEncounter).length,
    });

    nextEncounter = {
      ...nextEncounter,
      missiles: [...encounterMissiles(nextEncounter), missile],
      ships: nextEncounter.ships.map((ship) =>
        ship.id === launcher.id
          ? { ...ship, missiles: Math.max(0, (ship.missiles ?? 0) - 1) }
          : ship,
      ),
    };
    events.push({
      id: missile.id,
      turn: encounter.turn,
      label: `T${encounter.turn} ${launcher.name} launched at ${target.name}`,
    });
  }

  return {
    encounter: nextEncounter,
    activeSandShipIds: nextActiveSandShipIds,
    events,
  };
};
