import type { Reducer } from "@reduxjs/toolkit";

type PluginWithReducer = {
  state: {
    stateKey: string;
    reducer: Reducer;
  };
};

type PluginReducerMap<Plugins extends readonly PluginWithReducer[]> = {
  [Plugin in Plugins[number] as Plugin["state"]["stateKey"]]: Plugin["state"]["reducer"];
};

export const definePluginReducerMap = <const Plugins extends readonly PluginWithReducer[]>(
  plugins: Plugins,
): PluginReducerMap<Plugins> => {
  const reducers: Record<string, Reducer> = {};

  for (const plugin of plugins) {
    reducers[plugin.state.stateKey] = plugin.state.reducer;
  }

  return reducers as PluginReducerMap<Plugins>;
};
