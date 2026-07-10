import {
  advanceEncounter,
  applyShipTemplateToCustomSetup,
  buildCustomScenario,
  buildMissile,
  defaultCustomSetup,
  expandedMaydayBoardRadius,
  maydayInitialBoardRadius,
  removeDestroyedMissiles,
  resolveLaserFire,
  resolveOpponentOrdnanceCloseout,
  type LaserFireResult,
  type MaydayEncounter,
  type MaydayShip,
} from "../maydayRules";

const playerShip = (overrides: Partial<MaydayShip> = {}): MaydayShip => ({
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
  ...overrides,
});

const opponentShip = (overrides: Partial<MaydayShip> = {}): MaydayShip => ({
  id: "corsair",
  name: "Corsair",
  side: "opponent",
  position: { q: 3, r: 0 },
  velocity: { q: 0, r: 0 },
  thrustRating: 1,
  lasers: 1,
  missiles: 2,
  sandcasters: 1,
  sand: 2,
  targetType: "ship",
  ...overrides,
});

const encounter = (ships: MaydayShip[] = [playerShip(), opponentShip()]): MaydayEncounter => ({
  turn: 1,
  ships,
  missiles: [],
});

describe("maydayRules", () => {
  it("keeps the initial board radius when positions are away from the edge", () => {
    expect(expandedMaydayBoardRadius(maydayInitialBoardRadius, [
      { q: 10, r: 0 },
      { q: -8, r: 4 },
    ])).toBe(maydayInitialBoardRadius);
  });

  it("expands the board when a position approaches the edge", () => {
    expect(expandedMaydayBoardRadius(maydayInitialBoardRadius, [
      { q: 15, r: 0 },
    ])).toBe(24);
  });

  it("adds enough rings when a position moves beyond the current edge", () => {
    expect(expandedMaydayBoardRadius(maydayInitialBoardRadius, [
      { q: 28, r: 0 },
    ])).toBe(36);
  });

  it("never shrinks an expanded board", () => {
    expect(expandedMaydayBoardRadius(30, [
      { q: 2, r: 0 },
    ])).toBe(30);
  });

  it("builds a missile with initial tracking toward its target", () => {
    const launcher = playerShip();
    const target = opponentShip({ position: { q: 3, r: 0 } });

    const missile = buildMissile({ turn: 1, launcher, target, index: 0 });

    expect(missile.velocity).toEqual({ q: 1, r: 0 });
    expect(missile.targetId).toBe(target.id);
  });

  it("advances a missile toward its target without impact when still out of range", () => {
    const launcher = playerShip();
    const target = opponentShip({ position: { q: 3, r: 0 } });
    const missile = buildMissile({ turn: 1, launcher, target, index: 0 });

    const result = advanceEncounter(
      { ...encounter([launcher, target]), missiles: [missile] },
      { q: 0, r: 0 },
      { q: 0, r: 0 },
      new Set(),
    );

    expect(result.encounter.missiles).toHaveLength(1);
    expect(result.encounter.missiles?.[0].position).toEqual({ q: 1, r: 0 });
    expect(result.missileImpacts).toHaveLength(0);
  });

  it("removes a missile and records impact when it reaches its target", () => {
    const target = opponentShip({ position: { q: 1, r: 0 } });
    const missile = buildMissile({ turn: 1, launcher: playerShip(), target, index: 0 });

    const result = advanceEncounter(
      { ...encounter([playerShip(), target]), missiles: [missile] },
      { q: 0, r: 0 },
      { q: 0, r: 0 },
      new Set(),
      () => 6,
    );

    expect(result.encounter.missiles).toHaveLength(0);
    expect(result.missileImpacts[0]).toMatchObject({
      targetId: target.id,
      stoppedBySand: false,
      damageRoll: 6,
      damageResult: "weapon",
    });
    expect(result.encounter.ships.find((ship) => ship.id === target.id)?.damage?.weaponsDisabled).toBe(true);
  });

  it("lets active sand stop a missile before damage is applied", () => {
    const target = playerShip({ position: { q: 1, r: 0 } });
    const missile = buildMissile({ turn: 1, launcher: opponentShip({ position: { q: 0, r: 0 } }), target, index: 0 });

    const result = advanceEncounter(
      { ...encounter([target, opponentShip({ position: { q: 0, r: 0 } })]), missiles: [missile] },
      { q: 0, r: 0 },
      { q: 0, r: 0 },
      new Set([target.id]),
      () => 4,
    );

    expect(result.encounter.missiles).toHaveLength(0);
    expect(result.missileImpacts[0]).toMatchObject({
      stoppedBySand: true,
      sandRoll: 4,
      damageRoll: null,
      damageResult: null,
    });
    expect(result.encounter.ships.find((ship) => ship.id === target.id)?.damage).toBeUndefined();
  });

  it("removes a missile destroyed by laser fire", () => {
    const missile = buildMissile({ turn: 1, launcher: opponentShip(), target: playerShip(), index: 0 });
    const laserResult: LaserFireResult = {
      id: "laser",
      turn: 1,
      phase: "laser",
      attackerId: "free-trader",
      targetId: missile.id,
      targetType: "missile",
      attacker: "Free Trader",
      target: "Missile M0",
      range: 1,
      roll: 7,
      modifier: 1,
      adjustedRoll: 8,
      hit: true,
      damageRoll: 1,
      damageResult: "none",
    };

    const result = removeDestroyedMissiles(
      { ...encounter(), missiles: [missile] },
      [laserResult],
    );

    expect(result.missiles).toHaveLength(0);
  });

  it("resolves a laser hit against a missile target", () => {
    const result = resolveLaserFire({
      attacker: playerShip(),
      target: {
        id: "incoming",
        name: "Missile M0",
        position: { q: 1, r: 0 },
        targetType: "missile",
      },
      turn: 1,
      phase: "laser",
      rollAttack: () => 8,
      rollDamage: () => 1,
    });

    expect(result).toMatchObject({
      hit: true,
      targetType: "missile",
      adjustedRoll: 8,
    });
  });

  it("applies Gunnery skill and a range penalty to laser fire", () => {
    const result = resolveLaserFire({
      attacker: playerShip({ gunnery: 2 }),
      target: {
        id: "corsair",
        name: "Corsair",
        position: { q: 4, r: 0 },
        targetType: "ship",
      },
      turn: 1,
      phase: "laser",
      rollAttack: () => 9,
      rollDamage: () => 1,
    });

    expect(result).toMatchObject({
      range: 4,
      roll: 9,
      modifier: -1,
      adjustedRoll: 8,
      hit: true,
    });
  });

  it("uses Gunnery 0 when no skill is present", () => {
    const result = resolveLaserFire({
      attacker: playerShip(),
      target: {
        id: "corsair",
        name: "Corsair",
        position: { q: 3, r: 0 },
        targetType: "ship",
      },
      turn: 1,
      phase: "laser",
      rollAttack: () => 9,
      rollDamage: () => 1,
    });

    expect(result).toMatchObject({
      modifier: -2,
      adjustedRoll: 7,
      hit: false,
    });
  });

  it("opponent launches sand when a player missile is incoming", () => {
    const player = playerShip();
    const opponent = opponentShip();
    const missile = buildMissile({ turn: 1, launcher: player, target: opponent, index: 0 });

    const result = resolveOpponentOrdnanceCloseout(
      { ...encounter([player, opponent]), missiles: [missile] },
      [],
    );

    expect(result.activeSandShipIds).toContain(opponent.id);
    expect(result.encounter.ships.find((ship) => ship.id === opponent.id)?.sand).toBe(1);
    expect(result.events.some((event) => event.label.includes("launched sand"))).toBe(true);
  });

  it("opponent does not launch a second missile while one is already tracking the player", () => {
    const player = playerShip();
    const opponent = opponentShip();
    const existingMissile = buildMissile({ turn: 1, launcher: opponent, target: player, index: 0 });

    const result = resolveOpponentOrdnanceCloseout(
      { ...encounter([player, opponent]), missiles: [existingMissile] },
      [],
    );

    const opponentMissiles = result.encounter.missiles?.filter((missile) => missile.ownerId === opponent.id);
    expect(opponentMissiles).toHaveLength(1);
  });

  it("builds custom scenarios with thrust and starting velocity", () => {
    const result = buildCustomScenario({
      ...defaultCustomSetup,
      range: 6,
      playerThrust: 2,
      playerVelocityQ: 1,
      playerVelocityR: -1,
      opponentThrust: 3,
      opponentVelocityQ: -2,
      opponentVelocityR: 1,
    });

    const player = result.encounter.ships.find((ship) => ship.side === "player");
    const opponent = result.encounter.ships.find((ship) => ship.side === "opponent");

    expect(player).toMatchObject({
      thrustRating: 2,
      velocity: { q: 1, r: -1 },
    });
    expect(opponent).toMatchObject({
      position: { q: 6, r: 0 },
      thrustRating: 3,
      velocity: { q: -2, r: 1 },
    });
  });

  it("clamps custom movement setup values", () => {
    const result = buildCustomScenario({
      ...defaultCustomSetup,
      range: 99,
      playerThrust: 99,
      playerVelocityQ: 99,
      playerVelocityR: -99,
      opponentThrust: -99,
      opponentVelocityQ: -99,
      opponentVelocityR: 99,
    });

    const player = result.encounter.ships.find((ship) => ship.side === "player");
    const opponent = result.encounter.ships.find((ship) => ship.side === "opponent");

    expect(player).toMatchObject({
      thrustRating: 6,
      velocity: { q: 6, r: -6 },
    });
    expect(opponent).toMatchObject({
      position: { q: 14, r: 0 },
      thrustRating: 0,
      velocity: { q: -6, r: 6 },
    });
  });

  it("applies ship templates to the player side without changing movement", () => {
    const setup = {
      ...defaultCustomSetup,
      playerVelocityQ: 2,
      playerVelocityR: -1,
    };

    const result = applyShipTemplateToCustomSetup(setup, "player", "patrol-craft");

    expect(result).toMatchObject({
      playerThrust: 3,
      playerLasers: 2,
      playerMissiles: 6,
      playerSand: 4,
      playerVelocityQ: 2,
      playerVelocityR: -1,
    });
    expect(result.opponentThrust).toBe(setup.opponentThrust);
  });

  it("applies ship templates to the opponent side", () => {
    const result = applyShipTemplateToCustomSetup(defaultCustomSetup, "opponent", "unarmed-target");

    expect(result).toMatchObject({
      opponentThrust: 0,
      opponentLasers: 0,
      opponentMissiles: 0,
      opponentSand: 0,
    });
    expect(result.playerMissiles).toBe(defaultCustomSetup.playerMissiles);
  });
});
