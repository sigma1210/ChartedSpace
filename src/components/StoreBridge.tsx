"use client";

import type { ReactNode } from "react";
import { Provider } from "react-redux";
import type { AppStore } from "../store";

const StoreBridge = ({ children, store }: { children: ReactNode; store: AppStore }) => {
  return <Provider store={store}>{children}</Provider>;
};

export default StoreBridge;
