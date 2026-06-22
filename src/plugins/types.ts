import type { Reducer } from "@reduxjs/toolkit";
import type { ComponentType } from "react";

export interface InternalPluginRegistration<State = unknown> {
  id: string;
  stateKey: string;
  reducer: Reducer<State>;
}

export interface PluginHudLayoutRegistration {
  id: string;
  pluginId: string;
  title: string;
  openTitle: string;
  visibleTitle: string;
  showInHudControls?: boolean;
  panelClassName?: string;
  defaultLayout: {
    visible: boolean;
    pinned: boolean;
    offset: {
      x: number;
      y: number;
    };
  };
}

export interface PluginHudRendererRegistration {
  id: string;
  Icon: ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false" }>;
  Component: ComponentType;
}

export type PluginRenderableHudRegistration =
  PluginHudLayoutRegistration & PluginHudRendererRegistration;

export interface PluginActionRegistration {
  id: string;
  pluginId: string;
  label: string;
  createAction: () => unknown;
}

export type PluginWorkflowPhase =
  | "beforeTurnAdvance"
  | "turnAdvance"
  | "afterTurnAdvance";

export interface PluginWorkflowContext {
  source: string;
  currentTurn: number;
}

export type PluginWorkflowDisposition = "continue" | "stop";

export interface PluginWorkflowEffect {
  type: string;
  source: string;
  description?: string;
  payload?: Record<string, unknown>;
}

export type PluginEffectResolutionStatus =
  | "accepted"
  | "rejected"
  | "unresolved";

export interface PluginEffectResolution {
  status: PluginEffectResolutionStatus;
  resolverId?: string;
  pluginId?: string;
  reason?: string;
  actions?: readonly {
    type: string;
    payload?: unknown;
  }[];
}

export interface PluginEffectResolver<Effect extends PluginWorkflowEffect = PluginWorkflowEffect> {
  id: string;
  pluginId: string;
  effectType: string;
  order: number;
  resolve: (
    effect: Effect,
    context: PluginWorkflowContext,
  ) => PluginEffectResolution | Promise<PluginEffectResolution>;
}

export interface PluginWorkflowResult {
  disposition: PluginWorkflowDisposition;
  reason?: string;
  effects?: readonly PluginWorkflowEffect[];
}

export interface PluginEventHandler<Event = unknown> {
  id: string;
  pluginId: string;
  phase: PluginWorkflowPhase;
  order: number;
  handle: (
    event: Event,
    context: PluginWorkflowContext,
  ) => PluginWorkflowResult | Promise<PluginWorkflowResult>;
}

export interface PluginManifest<State = unknown> {
  metadata: {
    id: string;
  };
  capabilities?: {
    provides?: readonly string[];
    uses?: readonly string[];
  };
  state: InternalPluginRegistration<State>;
  huds: readonly PluginHudLayoutRegistration[];
  actions: readonly PluginActionRegistration[];
  handlers: readonly PluginEventHandler[];
  effectResolvers: readonly PluginEffectResolver[];
}

export type PluginStateRoot<Key extends string, State> = {
  plugins: Record<Key, State>;
};
