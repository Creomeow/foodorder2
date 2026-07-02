import { createJSONStorage, type StateStorage } from 'zustand/middleware';

// Next.js prerenders 'use client' pages once on the server (no `window`/`localStorage`);
// fall back to a no-op storage there so zustand's persist middleware doesn't throw.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const clientStorage = createJSONStorage(() =>
  typeof window !== 'undefined' ? window.localStorage : noopStorage,
);
