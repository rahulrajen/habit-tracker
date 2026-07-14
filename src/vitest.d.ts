/// <reference types="vitest" />

declare global {
  const describe: (name: string, fn: () => void) => void;
  const it: {
    (name: string, fn: () => Promise<void>): void;
    skip: (name: string, fn: () => Promise<void>) => void;
    only: (name: string, fn: () => Promise<void>) => void;
  };
  const test: typeof it;
  const expect: <T = any>(value: T) => ReturnType<import('vitest').expect<T>>;
  const beforeEach: (fn: () => Promise<void> | void) => void;
}

export {};