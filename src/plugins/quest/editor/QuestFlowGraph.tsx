"use client";

import { Flag, Link2, MapPinned } from "lucide-react";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  activeScenarioChanged,
  graphViewChanged,
  questFlowConnectionCancelled,
  questFlowConnectionSelected,
  questFlowConnectionStarted,
  questFlowConnectionTargetSelected,
  questFlowNodeDragEnded,
  questFlowNodeDragStarted,
  questFlowNodeMoved,
  questFlowNodeSelected,
} from "../questSlice";
import type { QuestFlowNode, QuestScenarioInstance } from "./types";

const flowWidth = 1180;
const flowHeight = 720;
const flowNodeWidth = 240;

const selectQuestEditor = (state: RootState) => state.plugins.quest.editor;

const scenarioForNode = (
  scenarios: QuestScenarioInstance[],
  node: QuestFlowNode,
) => node.kind === "scenario"
  ? scenarios.find((scenario) => scenario.id === node.scenarioInstanceId) ?? null
  : null;

const flowNodeHeight = (node: QuestFlowNode, scenario: QuestScenarioInstance | null) => {
  if (node.kind === "scenario") {
    const victories = scenario?.nodes.filter((candidate) => candidate.kind === "victory").length ?? 0;
    return Math.max(112, 92 + victories * 32);
  }
  return node.kind === "quest-victory" ? 96 : 76;
};

const flowConnectionPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const bend = Math.max(75, Math.abs(to.x - from.x) * 0.46);
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
};

const QuestFlowGraph = () => {
  const dispatch = useAppDispatch();
  const editor = useAppSelector(selectQuestEditor);
  const graph = editor.document.questFlow;
  const graphRef = useRef<HTMLDivElement>(null);

  const pointFromEvent = (event: ReactPointerEvent) => {
    const bounds = graphRef.current?.getBoundingClientRect();
    return bounds
      ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
      : { x: 0, y: 0 };
  };

  const selectNodeOrTarget = (node: QuestFlowNode) => {
    if (editor.questFlowInteraction.pendingConnection) {
      dispatch(questFlowConnectionTargetSelected(node.id));
    } else {
      dispatch(questFlowNodeSelected(node.id));
    }
  };

  return <div
      ref={graphRef}
      data-testid="quest-flow-graph"
      className={`relative border border-slate-800 bg-slate-950/70 ${editor.questFlowInteraction.pendingConnection ? "cursor-crosshair" : ""}`}
      style={{
        width: flowWidth,
        height: flowHeight,
        backgroundImage: "linear-gradient(rgba(51,65,85,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(51,65,85,.18) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
      onClick={() => {
        if (editor.questFlowInteraction.pendingConnection) dispatch(questFlowConnectionCancelled());
        else dispatch(questFlowNodeSelected(null));
      }}
      onPointerMove={(event) => {
        const dragging = editor.questFlowInteraction.draggingNode;
        if (!dragging) return;
        const point = pointFromEvent(event);
        dispatch(questFlowNodeMoved({
          nodeId: dragging.nodeId,
          position: {
            x: Math.max(0, Math.min(flowWidth - flowNodeWidth, point.x - dragging.offset.x)),
            y: Math.max(0, Math.min(flowHeight - 100, point.y - dragging.offset.y)),
          },
        }));
      }}
      onPointerUp={() => dispatch(questFlowNodeDragEnded())}
      onPointerCancel={() => dispatch(questFlowNodeDragEnded())}
    >
      <svg className="absolute inset-0 h-full w-full" aria-label="Quest flow links">
        <defs><marker id="quest-flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" /></marker></defs>
        {graph.connections.map((connection) => {
          const source = graph.nodes.find((node) => node.id === connection.sourceNodeId);
          const target = graph.nodes.find((node) => node.id === connection.targetNodeId);
          if (!source || !target) return null;
          const sourceScenario = scenarioForNode(editor.document.scenarioInstances, source);
          const targetScenario = scenarioForNode(editor.document.scenarioInstances, target);
          const victoryIndex = sourceScenario?.nodes
            .filter((node) => node.kind === "victory")
            .findIndex((node) => node.id === connection.sourceScenarioVictoryId) ?? -1;
          const from = {
            x: source.position.x + flowNodeWidth,
            y: source.kind === "scenario"
              ? source.position.y + 94 + Math.max(0, victoryIndex) * 32
              : source.position.y + flowNodeHeight(source, sourceScenario) / 2,
          };
          const to = {
            x: target.position.x,
            y: target.position.y + flowNodeHeight(target, targetScenario) / 2,
          };
          const path = flowConnectionPath(from, to);
          const selected = editor.questFlowSelection.connectionId === connection.id;
          return <g key={connection.id}>
            <path d={path} fill="none" stroke={selected ? "#f8fafc" : "#a78bfa"} strokeWidth={selected ? 4 : 2} markerEnd="url(#quest-flow-arrow)" opacity={selected ? 1 : 0.8} className="pointer-events-none" />
            <path d={path} fill="none" stroke="transparent" strokeWidth="16" role="button" tabIndex={0} aria-label="Select quest flow link" aria-pressed={selected} className="cursor-pointer pointer-events-stroke" onClick={(event) => { event.stopPropagation(); dispatch(questFlowConnectionSelected(connection.id)); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); dispatch(questFlowConnectionSelected(connection.id)); } }} />
          </g>;
        })}
      </svg>

      {graph.nodes.map((node) => {
        const scenario = scenarioForNode(editor.document.scenarioInstances, node);
        const victories = scenario?.nodes.filter((candidate) => candidate.kind === "victory") ?? [];
        const selected = editor.questFlowSelection.nodeId === node.id;
        const tone = node.kind === "quest-start"
          ? "border-emerald-400/80"
          : node.kind === "quest-victory"
            ? "border-amber-300/80"
            : "border-violet-400/80";
        const Icon = node.kind === "scenario" ? MapPinned : Flag;

        return <div
          key={node.id}
          className={`absolute select-none border bg-slate-950/95 shadow-xl ${tone} ${selected ? "ring-2 ring-white/70" : ""}`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: flowNodeWidth,
            minHeight: flowNodeHeight(node, scenario),
          }}
          onClick={(event) => { event.stopPropagation(); selectNodeOrTarget(node); }}
        >
          <div
            className="flex cursor-grab items-center gap-2 border-b border-slate-700 bg-slate-900 px-3 py-2 active:cursor-grabbing"
            onPointerDown={(event) => {
              if (editor.questFlowInteraction.pendingConnection) return;
              const point = pointFromEvent(event);
              event.currentTarget.setPointerCapture(event.pointerId);
              dispatch(questFlowNodeDragStarted({
                nodeId: node.id,
                offset: { x: point.x - node.position.x, y: point.y - node.position.y },
              }));
            }}
          >
            <Icon size={14} className={node.kind === "quest-victory" ? "text-amber-200" : "text-violet-200"} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-100">{node.kind === "scenario" ? scenario?.title ?? "Missing scenario" : node.title}</div>
              <div className="truncate text-[9px] uppercase tracking-wider text-slate-500">{node.kind.replace("-", " ")}</div>
            </div>
            {node.kind === "quest-start" && <button
              type="button"
              title="Connect quest start"
              aria-label="Connect quest start"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                dispatch(questFlowConnectionStarted({ sourceNodeId: node.id, sourceScenarioVictoryId: null }));
              }}
              className="grid h-6 w-6 place-items-center rounded-full border border-emerald-300 bg-emerald-950 text-emerald-100 hover:bg-emerald-800"
            ><Link2 size={12} /></button>}
          </div>

          {node.kind === "scenario" && <div className="px-2 py-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!scenario) return;
                dispatch(activeScenarioChanged(scenario.id));
                dispatch(graphViewChanged("scenario-interactions"));
              }}
              className="mb-2 w-full border border-slate-700 px-2 py-1 text-[9px] uppercase text-slate-300 hover:border-cyan-500 hover:text-cyan-100"
            >Open interactions</button>
            {victories.map((victory) => <div key={victory.id} className="mb-1 flex items-center gap-2 border border-slate-800 bg-slate-900/70 px-2 py-1">
              <span className="min-w-0 flex-1 truncate text-[10px] text-amber-100">{victory.title}</span>
              <button
                type="button"
                title={`Connect ${victory.title}`}
                aria-label={`Connect ${victory.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  dispatch(questFlowConnectionStarted({ sourceNodeId: node.id, sourceScenarioVictoryId: victory.id }));
                }}
                className="grid h-5 w-5 place-items-center rounded-full border border-violet-300 bg-violet-950 text-violet-100 hover:bg-violet-700"
              ><Link2 size={10} /></button>
            </div>)}
          </div>}
          {node.kind === "quest-victory" && <div className="px-3 py-3 text-[9px] uppercase tracking-wider text-amber-200">Quest ending</div>}
        </div>;
      })}
      {editor.questFlowInteraction.pendingConnection && <div className="absolute left-4 top-4 border border-amber-400 bg-amber-950/90 px-3 py-2 text-[10px] text-amber-100">Select a scenario start or quest victory</div>}
    </div>;
};

export default QuestFlowGraph;
