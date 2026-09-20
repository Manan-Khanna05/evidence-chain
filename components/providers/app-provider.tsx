"use client";

import * as React from "react";
import type { ClientStore, Officer, Role } from "@/lib/domain/types";
import type { VerificationResult } from "@/lib/domain/verify";
import type { CaseVerdict } from "@/app/api/verify/route";

/* ------------------------------------------------------------------ types */

interface Session {
  officer_id: string;
  role: Role;
}

interface Toast {
  id: number;
  tone: "ok" | "danger" | "info" | "warn";
  title: string;
  body?: string;
}

interface AppContextValue {
  store: ClientStore | null;
  loading: boolean;
  session: Session | null;
  officer: Officer | null;
  signIn: (officerId: string) => void;
  signOut: () => void;
  refresh: () => Promise<void>;
  /** Runs an action, folds the returned store into state, surfaces errors. */
  run: <T = unknown>(
    action: string,
    payload?: Record<string, unknown>,
    opts?: { toast?: { title: string; body?: string } | false },
  ) => Promise<{ ok: boolean; result?: T; error?: string }>;
  verify: (scope: string) => Promise<VerificationResult | null>;
  verifyAllCases: () => Promise<{ result: VerificationResult; cases: CaseVerdict[] } | null>;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  /** Where the store lives, as reported by the server. */
  storage: StorageInfo | null;
  /** Live sync with the shared store. */
  sync: SyncState;
}

export interface StorageInfo {
  backend: "postgres" | "file" | "memory";
  label: string;
  detail: string;
}

export interface SyncState {
  /** Server revision this device currently shows. */
  revision: number | null;
  /** Last time this device confirmed it is up to date. */
  lastSyncedAt: number | null;
  /** True when the last sync attempt failed (server or network unreachable). */
  error: boolean;
}

/** How often an open device checks the shared store for changes. */
const SYNC_INTERVAL_MS = 4000;

const AppContext = React.createContext<AppContextValue | null>(null);

const SESSION_KEY = "evidence-chain.session";

/* --------------------------------------------------------------- provider */

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = React.useState<ClientStore | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const toastSeq = React.useRef(0);
  const [storage, setStorage] = React.useState<StorageInfo | null>(null);
  const [sync, setSync] = React.useState<SyncState>({ revision: null, lastSyncedAt: null, error: false });
  const revisionRef = React.useRef<number | null>(null);

  const markSynced = React.useCallback((revision: number | undefined | null) => {
    if (typeof revision === "number") revisionRef.current = revision;
    setSync({ revision: revisionRef.current, lastSyncedAt: Date.now(), error: false });
  }, []);

  const pushToast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5200);
  }, []);

  const dismissToast = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) throw new Error("state unavailable");
      const data = (await res.json()) as { store: ClientStore; revision?: number; storage?: StorageInfo };
      setStore(data.store);
      if (data.storage) setStorage(data.storage);
      markSynced(data.revision);
    } catch {
      setSync((s) => ({ ...s, error: true }));
    } finally {
      setLoading(false);
    }
  }, [markSynced]);

  /**
   * Live sync: ask the server whether the shared store changed since the
   * revision on screen, and download it only if it did. Runs while the tab is
   * visible, and immediately when it becomes visible or regains focus.
   */
  const pull = React.useCallback(async () => {
    if (revisionRef.current === null) return;
    try {
      const res = await fetch(`/api/state?since=${revisionRef.current}`, { cache: "no-store" });
      if (!res.ok) throw new Error("state unavailable");
      const data = (await res.json()) as {
        unchanged?: boolean;
        revision?: number;
        store?: ClientStore;
        storage?: StorageInfo;
      };
      if (!data.unchanged && data.store) setStore(data.store);
      if (data.storage) setStorage(data.storage);
      markSynced(data.revision);
    } catch {
      setSync((s) => ({ ...s, error: true }));
    }
  }, [markSynced]);

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer || document.visibilityState !== "visible") return;
      timer = setInterval(() => void pull(), SYNC_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void pull();
        start();
      } else {
        stop();
      }
    };
    const onFocus = () => void pull();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
    };
  }, [pull]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {
      /* first run, or storage unavailable */
    }
    void refresh();
  }, [refresh]);

  const signIn = React.useCallback(
    (officerId: string) => {
      const officer = store?.officers.find((o) => o.officer_id === officerId);
      if (!officer) return;
      const next: Session = { officer_id: officer.officer_id, role: officer.role };
      setSession(next);
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — the session lives for this tab only */
      }
    },
    [store],
  );

  const signOut = React.useCallback(() => {
    setSession(null);
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* nothing to clear */
    }
  }, []);

  const run = React.useCallback<AppContextValue["run"]>(
    async (action, payload, opts) => {
      try {
        const res = await fetch("/api/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, payload }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          result?: unknown;
          error?: string;
          store?: ClientStore;
          revision?: number;
        };
        if (data.store) {
          setStore(data.store);
          markSynced(data.revision);
        }
        if (!res.ok || data.ok === false) {
          const message = data.error ?? "The action could not be completed";
          pushToast({ tone: "danger", title: "Action refused", body: message });
          return { ok: false, error: message };
        }
        if (opts?.toast !== false && opts?.toast) {
          pushToast({ tone: "ok", title: opts.toast.title, body: opts.toast.body });
        }
        return { ok: true, result: data.result as never };
      } catch {
        const message = "Could not reach the evidence service. Check your connection and try again.";
        pushToast({ tone: "danger", title: "Not connected", body: message });
        setSync((s) => ({ ...s, error: true }));
        return { ok: false, error: message };
      }
    },
    [pushToast, markSynced],
  );

  const verify = React.useCallback(async (scope: string) => {
    try {
      const res = await fetch(`/api/verify?scope=${encodeURIComponent(scope)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { result: VerificationResult };
      return data.result;
    } catch {
      return null;
    }
  }, []);

  const verifyAllCases = React.useCallback(async () => {
    try {
      const res = await fetch("/api/verify?scope=all&cases=1", { cache: "no-store" });
      const data = (await res.json()) as { result: VerificationResult; cases: CaseVerdict[] };
      return { result: data.result, cases: data.cases ?? [] };
    } catch {
      return null;
    }
  }, []);

  const officer =
    (session && store?.officers.find((o) => o.officer_id === session.officer_id)) || null;

  const value: AppContextValue = {
    store,
    loading,
    session,
    officer,
    signIn,
    signOut,
    refresh,
    run,
    verify,
    verifyAllCases,
    toasts,
    pushToast,
    dismissToast,
    storage,
    sync,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

/** Convenience: the store, or null while it loads. */
export function useStore() {
  return useApp().store;
}
