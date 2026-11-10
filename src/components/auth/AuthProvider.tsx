"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export interface Account {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  hasPassword: boolean;
  googleLinked: boolean;
  marketingOptIn: boolean;
  createdAt: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface AuthContextValue {
  user: Account | null;
  // The default address from the address book, used to fill in checkout.
  address: SavedAddress | null;
  ready: boolean;
  // Call after a login/register response: stores the user and loads their address.
  signedIn: (user: Account) => void;
  // After a profile change: replaces the stored user without reloading the address.
  setUser: (user: Account) => void;
  setAddress: (address: SavedAddress | null) => void;
  logout: () => Promise<void>;
  // After the account is deleted (cookies are already cleared by the server).
  signedOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadDefaultAddress() {
  const res = await api<{ items: SavedAddress[] }>("/me/addresses");
  return res.ok ? (res.data.items.find((a) => a.isDefault) ?? null) : null;
}

// The session is read from the browser after load, so every page stays in the
// static shell; `ready` flips once we know who is signed in.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [address, setAddress] = useState<SavedAddress | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const me = await api<{ user: Account }>("/me");
      if (!live) return;
      if (me.ok) {
        setUser(me.data.user);
        const saved = await loadDefaultAddress();
        if (live) setAddress(saved);
      }
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  const signedIn = useCallback((account: Account) => {
    setUser(account);
    setAddress(null);
    void loadDefaultAddress().then(setAddress);
  }, []);

  const signedOut = useCallback(() => {
    setUser(null);
    setAddress(null);
  }, []);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    signedOut();
  }, [signedOut]);

  const value = useMemo(
    () => ({ user, address, ready, signedIn, setUser, setAddress, logout, signedOut }),
    [user, address, ready, signedIn, logout, signedOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// First name for compact UI ("Hi, Lakshmi").
export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;
