"use client";

import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

const AUTH_STORAGE_MODE_KEY = "rt-auth-storage-mode";
export type AuthStorageMode = "local" | "session";

function readStorageMode(): AuthStorageMode {
  if (typeof window === "undefined") return "local";
  const stored = window.localStorage.getItem(AUTH_STORAGE_MODE_KEY);
  return stored === "session" ? "session" : "local";
}

function getTargetStorage() {
  if (typeof window === "undefined") return null;
  return readStorageMode() === "session"
    ? window.sessionStorage
    : window.localStorage;
}

const storageAdapter = {
  getItem(key: string) {
    const storage = getTargetStorage();
    return storage ? storage.getItem(key) : null;
  },
  setItem(key: string, value: string) {
    const storage = getTargetStorage();
    if (!storage) return;
    storage.setItem(key, value);
  },
  removeItem(key: string) {
    const storage = getTargetStorage();
    if (!storage) return;
    storage.removeItem(key);
  },
};

export function setAuthStorageMode(mode: AuthStorageMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_MODE_KEY, mode);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.",
  );
}

export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase client env vars are not configured.");
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: true,
      persistSession: true,
    },
  });
}
