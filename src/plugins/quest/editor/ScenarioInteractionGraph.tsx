"use client";

import { Flag, Link2, MonitorCog, UserRound } from "lucide-react";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { chainSelected, connectionCancelled, connectionSelected, connectionStarted, connectionTargetSelected, nodeDragEnded, nodeDragStarted, nodeMoved, nodeSelected } from "../questSlice";
import type { QuestGraphNode, QuestScenarioInstance } from "./types";

const graphWidth = 1180;
const graphHeight = 720;
const nodeWidth = 220;
const selectEditor = (state: RootState) => state.plugins.quest.editor;
const nodeHeight = (node: QuestGraphNode) => node.kind === "entity" ? Math.max(116, 92 + node.chains.length * 30) : 76;
const sourcePoint = (scenario: QuestScenarioInstance, sourceNodeId: string, sourceChainId: string | null) => {
  const node = scenario.nodes.find((candidate) => candidate.id === sourceNodeId);
  if (!node) return { x: 0, y: 0 };
  if (node.kind !== "entity") return { x: node.position.x + nodeWidth, y: node.position.y + nodeHeight(node) / 2 };
  const chainIndex = node.chains.findIndex((chain) => chain.id === sourceChainId);
  return { x: node.position.x + nodeWidth, y: node.position.y + 96 + Math.max(0, chainIndex) * 30 };
};
const connectionPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const bend = Math.max(70, Math.abs(to.x - from.x) * 0.46);
  return `M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`;
};

const NodeCard = ({ node, selected, selectedChainId, pending, onSelect, onSelectChain, onDragStart, onStartConnection }: {
  node: QuestGraphNode; selected: boolean; selectedChainId: string | null; pending: boolean; onSelect: () => void;
  onSelectChain: (chainId: string) => void;
  onDragStart: (event: ReactPointerEvent<HTMLDivElement>) => void; onStartConnection: (chainId: string | null) => void;
}) => {
  const entity = node.kind === "entity" ? node : null;
  const Icon = node.kind !== "entity" ? Flag : node.entityType === "interactive-human" ? UserRound : MonitorCog;
  const tone = node.kind === "start" ? "border-emerald-400/80" : node.kind === "victory" ? "border-amber-300/80" : node.entityType === "interactive-human" ? "border-violet-400/80" : "border-cyan-400/80";
  return <div className={`absolute select-none border bg-slate-950/95 shadow-xl ${tone} ${selected ? "ring-2 ring-white/70" : ""} ${pending ? "cursor-crosshair" : ""}`} style={{ left: node.position.x, top: node.position.y, width: nodeWidth, minHeight: nodeHeight(node) }} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
    <div className="flex cursor-grab items-center gap-2 border-b border-slate-700 bg-slate-900 px-3 py-2 active:cursor-grabbing" onPointerDown={onDragStart}>
      <Icon size={14} className="text-cyan-200" aria-hidden="true" /><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-100">{node.title}</div><div className="truncate text-[9px] uppercase tracking-wider text-slate-500">{node.kind === "entity" ? node.entityType.replace("-", " ") : node.kind}</div></div>
      {node.kind === "start" && <button type="button" aria-label="Connect scenario start" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onStartConnection(null); }} className="grid h-6 w-6 place-items-center rounded-full border border-emerald-300 bg-emerald-950 text-emerald-100"><Link2 size={12} /></button>}
    </div>
    {entity && <div className="px-2 py-2">{entity.chains.length === 0 && <div className="border border-dashed border-slate-700 p-2 text-[9px] text-slate-500">No quest chain · unavailable in play</div>}{entity.chains.map((chain) => <div key={chain.id} className={`mb-1 flex items-center gap-2 border bg-slate-900/70 px-2 py-1 ${selectedChainId === chain.id ? "border-cyan-300 bg-cyan-950/60" : "border-slate-800"}`}><button type="button" onClick={(event) => { event.stopPropagation(); onSelectChain(chain.id); }} className="min-w-0 flex-1 truncate text-left text-[10px] text-slate-200">{chain.name}{chain.itemRequirements.length > 0 && <span className="ml-1 text-amber-300" title={`${chain.itemRequirements.length} quest item requirement(s)`}>◆{chain.itemRequirements.length}</span>}{chain.successRewards.length > 0 && <span className="ml-1 text-emerald-300" title={`${chain.successRewards.length} quest item reward(s)`}>+{chain.successRewards.length}</span>}</button><button type="button" aria-label={`Connect success from ${chain.name}`} onClick={(event) => { event.stopPropagation(); onStartConnection(chain.id); }} className="grid h-5 w-5 place-items-center rounded-full border border-cyan-300 bg-cyan-950 text-cyan-100"><Link2 size={10} /></button></div>)}</div>}
    {node.kind === "victory" && <div className="px-3 py-3 text-[9px] uppercase tracking-wider text-amber-200">Scenario ending</div>}
  </div>;
};

const ScenarioInteractionGraph = () => {
  const dispatch = useAppDispatch();
  const editor = useAppSelector(selectEditor);
  const scenario = editor.document.scenarioInstances.find((item) => item.id === editor.activeScenarioInstanceId) ?? null;
  const graphRef = useRef<HTMLDivElement>(null);
  const graphPoint = (event: ReactPointerEvent) => { const bounds = graphRef.current?.getBoundingClientRect(); return bounds ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top } : { x: 0, y: 0 }; };
  if (!scenario) return <div className="grid h-full min-h-[720px] w-[1180px] place-items-center border border-dashed border-slate-800 text-xs text-slate-600">Load a scenario from the Scenario Library HUD.</div>;
  return <div ref={graphRef} data-testid="scenario-interaction-graph" className={`relative border border-slate-800 bg-slate-950/70 ${editor.interaction.pendingConnection ? "cursor-crosshair" : ""}`} style={{ width: graphWidth, height: graphHeight, backgroundImage: "linear-gradient(rgba(51,65,85,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(51,65,85,.18) 1px, transparent 1px)", backgroundSize: "24px 24px" }} onClick={() => editor.interaction.pendingConnection ? dispatch(connectionCancelled()) : dispatch(nodeSelected(null))} onPointerMove={(event) => { const dragging = editor.interaction.draggingNode; if (!dragging) return; const point = graphPoint(event); dispatch(nodeMoved({ nodeId: dragging.nodeId, position: { x: Math.max(0, Math.min(graphWidth - nodeWidth, point.x - dragging.offset.x)), y: Math.max(0, Math.min(graphHeight - 90, point.y - dragging.offset.y)) } })); }} onPointerUp={() => dispatch(nodeDragEnded())} onPointerCancel={() => dispatch(nodeDragEnded())}>
    <svg className="absolute inset-0 h-full w-full" aria-label="Scenario interaction links"><defs><marker id="quest-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#67e8f9" /></marker></defs>{scenario.connections.map((connection) => { const target = scenario.nodes.find((node) => node.id === connection.targetNodeId); if (!target) return null; const path = connectionPath(sourcePoint(scenario, connection.sourceNodeId, connection.sourceChainId), { x: target.position.x, y: target.position.y + nodeHeight(target) / 2 }); const selected = editor.selection.connectionId === connection.id; return <g key={connection.id}><path d={path} fill="none" stroke={selected ? "#f8fafc" : "#22d3ee"} strokeWidth={selected ? 4 : 2} markerEnd="url(#quest-arrow)" opacity={selected ? 1 : 0.75} className="pointer-events-none" /><path d={path} fill="none" stroke="transparent" strokeWidth="16" role="button" tabIndex={0} aria-label="Select interaction link" aria-pressed={selected} className="cursor-pointer pointer-events-stroke" onClick={(event) => { event.stopPropagation(); dispatch(connectionSelected(connection.id)); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); dispatch(connectionSelected(connection.id)); } }} /></g>; })}</svg>
    {scenario.nodes.map((node) => <NodeCard key={node.id} node={node} selected={node.id === editor.selection.nodeId} selectedChainId={node.id === editor.selection.nodeId ? editor.selection.chainId : null} pending={editor.interaction.pendingConnection !== null} onSelect={() => editor.interaction.pendingConnection ? dispatch(connectionTargetSelected(node.id)) : dispatch(nodeSelected(node.id))} onSelectChain={(chainId) => { dispatch(nodeSelected(node.id)); dispatch(chainSelected(chainId)); }} onDragStart={(event) => { if (editor.interaction.pendingConnection) return; const point = graphPoint(event); event.currentTarget.setPointerCapture(event.pointerId); dispatch(nodeDragStarted({ nodeId: node.id, offset: { x: point.x - node.position.x, y: point.y - node.position.y } })); }} onStartConnection={(sourceChainId) => dispatch(connectionStarted({ sourceNodeId: node.id, sourceChainId }))} />)}
    {editor.interaction.pendingConnection && <div className="absolute left-4 top-4 border border-amber-400 bg-amber-950/90 px-3 py-2 text-[10px] text-amber-100">Select a destination node</div>}
  </div>;
};

export default ScenarioInteractionGraph;
