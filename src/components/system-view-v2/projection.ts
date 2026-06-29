import type { StarSystemRenderableBody, StarSystemStarModel, StarSystemViewModel } from "@/lib/starSystemViewModel";

export interface SystemTopDownProjectionConfig {
  width: number;
  height: number;
  padding?: number;
}

export interface SystemTopDownPoint {
  x: number;
  y: number;
}

export interface SystemTopDownProjectedBody extends SystemTopDownPoint {
  body: StarSystemRenderableBody;
  radius: number;
}

export interface SystemTopDownProjectedStar extends SystemTopDownPoint {
  star: StarSystemStarModel;
  radius: number;
}

export interface SystemTopDownProjection {
  width: number;
  height: number;
  center: SystemTopDownPoint;
  scale: number;
  orbitRadii: Map<string, number>;
  orbitCenters: Map<string, SystemTopDownPoint>;
  stars: SystemTopDownProjectedStar[];
  bodies: SystemTopDownProjectedBody[];
}

const bodyRadiusPx = (body: StarSystemRenderableBody) => {
  if (body.kind === "gasGiant") return 5.5;
  if (body.kind === "belt") return 3.5;
  return body.isMainWorld ? 5 : 4;
};

export const projectSystemTopDown = (
  model: StarSystemViewModel,
  config: SystemTopDownProjectionConfig,
): SystemTopDownProjection => {
  const padding = config.padding ?? 24;
  const center = {
    x: config.width / 2,
    y: config.height / 2,
  };
  const sceneAnchors = new Map<string, SystemTopDownPoint>([
    ["system:center", { x: 0, y: 0 }],
  ]);
  const sceneStars = model.stars.map((star) => {
    const point = {
      x: Math.cos(star.orbit.angle0) * star.orbit.sceneRadius,
      y: Math.sin(star.orbit.angle0) * star.orbit.sceneRadius,
    };
    sceneAnchors.set(star.id, point);
    return { star, ...point };
  });
  const sceneBodies = model.bodies.map((body) => {
    const parent = sceneAnchors.get(body.parentId) ?? { x: 0, y: 0 };
    const point = {
      x: parent.x + Math.cos(body.scene.angle0) * body.scene.orbitRadius,
      y: parent.y + Math.sin(body.scene.angle0) * body.scene.orbitRadius,
    };
    sceneAnchors.set(body.id, point);
    return { body, ...point };
  });
  const sceneOrbitCenters = new Map<string, SystemTopDownPoint>();
  for (const orbit of model.orbits) {
    sceneOrbitCenters.set(orbit.id, sceneAnchors.get(orbit.parentId) ?? { x: 0, y: 0 });
  }

  const outermost = Math.max(
    model.scene.outermostOrbitRadius,
    ...sceneStars.map((star) => Math.hypot(star.x, star.y)),
    ...sceneBodies.map((body) => Math.hypot(body.x, body.y)),
    ...model.orbits.map((orbit) => {
      const orbitCenter = sceneOrbitCenters.get(orbit.id) ?? { x: 0, y: 0 };
      return Math.hypot(orbitCenter.x, orbitCenter.y) + orbit.sceneRadius;
    }),
    1,
  );
  const availableRadius = Math.max(1, Math.min(config.width, config.height) / 2 - padding);
  const scale = availableRadius / outermost;
  const orbitRadii = new Map<string, number>();
  const orbitCenters = new Map<string, SystemTopDownPoint>();

  for (const orbit of model.orbits) {
    orbitRadii.set(orbit.id, orbit.sceneRadius * scale);
    const orbitCenter = sceneOrbitCenters.get(orbit.id) ?? { x: 0, y: 0 };
    orbitCenters.set(orbit.id, {
      x: center.x + orbitCenter.x * scale,
      y: center.y + orbitCenter.y * scale,
    });
  }

  const anchors = new Map<string, SystemTopDownPoint>([["system:center", center]]);
  const stars = sceneStars.map(({ star, x, y }): SystemTopDownProjectedStar => {
    const point = {
      x: center.x + x * scale,
      y: center.y + y * scale,
    };
    anchors.set(star.id, point);
    return {
      star,
      radius: Math.max(7, star.sceneRadius * 18),
      ...point,
    };
  });

  const bodies: SystemTopDownProjectedBody[] = [];
  for (const { body, x, y } of sceneBodies) {
    const point = {
      x: center.x + x * scale,
      y: center.y + y * scale,
    };
    anchors.set(body.id, point);
    bodies.push({
      body,
      radius: bodyRadiusPx(body),
      ...point,
    });
  }

  return {
    width: config.width,
    height: config.height,
    center,
    scale,
    orbitRadii,
    orbitCenters,
    stars,
    bodies,
  };
};
