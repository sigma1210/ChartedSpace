import { combineReducers } from "@reduxjs/toolkit";
import { registeredPluginManifests } from "./catalog";
import { definePluginReducerMap } from "./reducerRegistration";

export const registeredPlugins = registeredPluginManifests;

export const pluginReducers = definePluginReducerMap(registeredPluginManifests);

export const pluginsReducer = combineReducers(pluginReducers);
export type PluginsState = ReturnType<typeof pluginsReducer>;
