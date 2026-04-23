import { useRef } from "react";

function randomKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `key-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Stable idempotency key for the lifetime of a form mount.
 * Reset by calling `reset()` after a successful submit that should start a new op.
 */
export function useIdempotencyKey(): { key: string; reset: () => void } {
  const ref = useRef<string>(randomKey());

  return {
    key: ref.current,
    reset: () => {
      ref.current = randomKey();
    },
  };
}
