"use client";

import { registeredPluginActions } from "../actionRegistry";
import { usePluginDispatch } from "./pluginState";

export const usePluginActionRunner = () => {
  const dispatch = usePluginDispatch();

  return (pluginId: string, actionId: string) => {
    const action = registeredPluginActions.find(
      (candidate) => candidate.pluginId === pluginId && candidate.id === actionId,
    );
    if (!action) {
      throw new Error(`Plugin action not registered: ${pluginId}/${actionId}`);
    }

    dispatch(action.createAction() as unknown as Parameters<typeof dispatch>[0]);
  };
};
