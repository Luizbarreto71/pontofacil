import { useEffect, useState } from "react";

/** Relógio reativo: re-renderiza a cada `intervalMs` (padrão 1s). */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
