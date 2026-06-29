import type {
  StarSystemOrbitModel,
  StarSystemRenderableBody,
  StarSystemStarModel,
  StarSystemViewModel,
} from "@/lib/starSystemViewModel";

export interface SystemScenePoint3D {
  x: number;
  y: number;
  z: number;
}

export interface SystemSceneGraphStar extends SystemScenePoint3D {
  star: StarSystemStarModel;
}

export interface SystemSceneGraphOrbit extends SystemScenePoint3D {
  orbit: StarSystemOrbitModel;
}

export interface SystemSceneGraphBody extends SystemScenePoint3D {
  body: StarSystemRenderableBody;
}

export interface SystemSceneGraph {
  stars: SystemSceneGraphStar[];
  orbits: SystemSceneGraphOrbit[];
  bodies: SystemSceneGraphBody[];
}

const origin: SystemScenePoint3D = { x: 0, y: 0, z: 0 };

export const buildSystemSceneGraph = (model: StarSystemViewModel): SystemSceneGraph => {
  const anchors = new Map<string, SystemScenePoint3D>([
    ["system:center", origin],
  ]);

  const stars = model.stars.map((star): SystemSceneGraphStar => {
    const point = {
      x: Math.cos(star.orbit.angle0) * star.orbit.sceneRadius,
      y: 0,
      z: Math.sin(star.orbit.angle0) * star.orbit.sceneRadius,
    };
    anchors.set(star.id, point);
    return { star, ...point };
  });

  const bodies = model.bodies.map((body): SystemSceneGraphBody => {
    const parent = anchors.get(body.parentId) ?? origin;
    const point = {
      x: parent.x + Math.cos(body.scene.angle0) * body.scene.orbitRadius,
      y: 0,
      z: parent.z + Math.sin(body.scene.angle0) * body.scene.orbitRadius,
    };
    anchors.set(body.id, point);
    return { body, ...point };
  });

  const orbits = model.orbits.map((orbit): SystemSceneGraphOrbit => {
    const parent = anchors.get(orbit.parentId) ?? origin;
    return {
      orbit,
      x: parent.x,
      y: parent.y,
      z: parent.z,
    };
  });

  return { stars, orbits, bodies };
};
