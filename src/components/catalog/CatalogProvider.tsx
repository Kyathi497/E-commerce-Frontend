"use client";

import { createContext, use, useContext } from "react";
import type { Catalog } from "@/lib/catalog";

// The catalog for browser-side parts (cart, checkout summary). The root
// layout passes the server's catalog as a promise, so nothing waits for it
// until a component actually reads it. null = the catalog couldn't be loaded.
const CatalogContext = createContext<Promise<Catalog | null> | null>(null);

export function CatalogProvider({ catalog, children }: { catalog: Promise<Catalog | null>; children: React.ReactNode }) {
  return <CatalogContext value={catalog}>{children}</CatalogContext>;
}

export function useCatalogPromise() {
  const promise = useContext(CatalogContext);
  if (!promise) throw new Error("useCatalog must be used inside CatalogProvider");
  return promise;
}

// Suspends until the catalog arrives: render inside <Suspense>.
export function useCatalog() {
  return use(useCatalogPromise());
}
