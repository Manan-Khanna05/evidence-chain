"use client";

import * as React from "react";
import { pramaanStore } from "./store";
import type { PramaanState } from "./types";

/** Subscribe to the PRAMAAN integration layer. */
export function usePramaan(): PramaanState {
  return React.useSyncExternalStore(
    pramaanStore.subscribe,
    pramaanStore.getSnapshot,
    pramaanStore.getServerSnapshot,
  );
}

export { pramaanStore };
