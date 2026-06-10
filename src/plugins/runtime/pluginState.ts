"use client";

import type { RootState } from "../../store";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

export const usePluginDispatch = useAppDispatch;

export const usePluginSelector = <Selected,>(
  selector: (state: RootState) => Selected,
) => useAppSelector(selector);
