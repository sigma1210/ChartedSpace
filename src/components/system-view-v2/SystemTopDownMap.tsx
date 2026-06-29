import type { StarSystemFocusState, StarSystemRenderableBody, StarSystemViewModel } from "@/lib/starSystemViewModel";
import { projectSystemTopDown } from "./projection";

export interface SystemTopDownMapProps {
  model: StarSystemViewModel;
  width?: number;
  height?: number;
  className?: string;
}

const focusStroke = (state: StarSystemFocusState) => {
  if (state === "focused") return "#f8fafc";
  if (state === "selected") return "#facc15";
  if (state === "targeted") return "#fb7185";
  if (state === "current") return "#38bdf8";
  return "#94a3b8";
};

const bodyFill = (body: StarSystemRenderableBody) => {
  if (body.kind === "gasGiant") return "#93c5fd";
  if (body.kind === "belt") return "#94a3b8";
  if (body.surfaceType === "ice") return "#bae6fd";
  if (body.surfaceType === "desert" || body.surfaceType === "arid") return "#facc15";
  if (body.surfaceType === "ocean") return "#38bdf8";
  if (body.surfaceType === "terran") return "#86efac";
  return "#cbd5e1";
};

export const SystemTopDownMap = ({
  model,
  width = 520,
  height = 520,
  className = "",
}: SystemTopDownMapProps) => {
  const projection = projectSystemTopDown(model, { width, height, padding: 34 });
  const bodyById = new Map(model.bodies.map((body) => [body.id, body]));

  return (
    <svg
      role="img"
      aria-label={`${model.source.worldName} system map`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
    >
      <rect width={width} height={height} fill="#020617" />
      <g opacity="0.82">
        {model.orbits.map((orbit) => {
          const radius = projection.orbitRadii.get(orbit.id) ?? 0;
          const center = projection.orbitCenters.get(orbit.id) ?? projection.center;
          const body = orbit.bodyId ? bodyById.get(orbit.bodyId) : null;
          const isBelt = body?.kind === "belt";
          return (
            <circle
              key={orbit.id}
              cx={center.x}
              cy={center.y}
              r={radius}
              fill="none"
              stroke={isBelt ? "#94a3b8" : orbit.zone === "habitable" ? "#22c55e" : "#334155"}
              strokeDasharray={isBelt ? "1 4" : orbit.orbitKind === "satellite" ? "2 2" : orbit.orbitKind === "companion" ? "3 4" : undefined}
              strokeLinecap={isBelt ? "round" : undefined}
              strokeWidth={isBelt ? 3.2 : orbit.orbitKind === "satellite" ? 0.6 : orbit.zone === "habitable" ? 1.4 : 0.8}
              opacity={isBelt ? 0.72 : undefined}
            />
          );
        })}
      </g>

      <g>
        {projection.stars.map(({ star, x, y, radius }) => (
          <g key={star.id}>
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={star.color}
              stroke="#fef3c7"
              strokeWidth="1"
            />
            <text
              x={x}
              y={y + radius + 12}
              textAnchor="middle"
              fill="#e2e8f0"
              fontFamily="monospace"
              fontSize="8"
            >
              {star.label}
            </text>
            <text
              x={x}
              y={y + radius + 22}
              textAnchor="middle"
              fill="#94a3b8"
              fontFamily="monospace"
              fontSize="7"
            >
              {star.spectral}
            </text>
          </g>
        ))}
      </g>

      <g>
        {projection.bodies.filter(({ body }) => body.kind !== "belt").map(({ body, x, y, radius }) => (
          <g key={body.id}>
            <circle
              cx={x}
              cy={y}
              r={body.focusState === "none" ? radius : radius + 2}
              fill={bodyFill(body)}
              stroke={focusStroke(body.focusState)}
              strokeWidth={body.focusState === "none" ? 1 : 2}
            />
            {body.isMainWorld && (
              <circle
                cx={x}
                cy={y}
                r={radius + 5}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="0.8"
                opacity="0.8"
              />
            )}
            {body.visuals.labelVisible && body.label && (
              <text
                x={x + radius + 5}
                y={y + 2.5}
                fill="#cbd5e1"
                fontFamily="monospace"
                fontSize="8"
              >
                {body.label}
              </text>
            )}
          </g>
        ))}
      </g>

      <text
        x="12"
        y="18"
        fill="#e2e8f0"
        fontFamily="monospace"
        fontSize="11"
      >
        {model.source.worldName}
      </text>
      <text
        x="12"
        y="32"
        fill="#94a3b8"
        fontFamily="monospace"
        fontSize="8"
      >
        {model.source.sectorAbbr ?? "Sector"} {model.source.hex}
      </text>
    </svg>
  );
};

export default SystemTopDownMap;
