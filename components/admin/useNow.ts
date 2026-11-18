import { useSyncExternalStore } from "react";

const REFRESH_MS = 30_000;
let current = 0;

function subscribe(onChange: () => void) {
  current = Date.now();
  const id = setInterval(() => {
    current = Date.now();
    onChange();
  }, REFRESH_MS);
  return () => clearInterval(id);
}

/** Hora actual del navegador, actualizada cada 30 s. Vale 0 en el servidor y en la hidratación (evita desajustes). */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => current, () => 0);
}
