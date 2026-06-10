import type {
  PluginEffectResolution,
  PluginEffectResolver,
  PluginWorkflowContext,
  PluginWorkflowEffect,
} from "./types";
import { registeredPluginManifests } from "./catalog";

const pluginEffectResolvers = registeredPluginManifests.flatMap(
  (plugin) => [...plugin.effectResolvers] as PluginEffectResolver[],
);

export const registeredPluginEffectResolvers = pluginEffectResolvers
  .toSorted((left, right) => {
    if (left.effectType !== right.effectType) {
      return left.effectType.localeCompare(right.effectType);
    }
    if (left.order !== right.order) return left.order - right.order;
    return left.id.localeCompare(right.id);
  });

export const getPluginEffectResolversForType = (
  effectType: string,
): PluginEffectResolver[] =>
  registeredPluginEffectResolvers.filter((resolver) => resolver.effectType === effectType);

export const resolvePluginWorkflowEffect = async (
  effect: PluginWorkflowEffect,
  context: PluginWorkflowContext,
): Promise<PluginEffectResolution> => {
  const resolvers = getPluginEffectResolversForType(effect.type);
  if (resolvers.length === 0) {
    return {
      status: "unresolved",
      reason: `No resolver registered for ${effect.type}`,
    };
  }

  const [resolver] = resolvers;
  const resolution = await resolver.resolve(effect, context);
  return {
    resolverId: resolver.id,
    pluginId: resolver.pluginId,
    ...resolution,
  };
};

export const resolvePluginWorkflowEffects = async (
  effects: readonly PluginWorkflowEffect[],
  context: PluginWorkflowContext,
) => Promise.all(effects.map((effect) => resolvePluginWorkflowEffect(effect, context)));
