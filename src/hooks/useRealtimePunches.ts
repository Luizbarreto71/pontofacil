import { useEffect, useState } from "react";
import { punchRealtime, type PublishContext } from "@/lib/realtime/punchRealtime";
import type { LivePunch } from "@/types";

/** Assina os registros de ponto em tempo real (Supabase) e re-renderiza. */
export function useRealtimePunches(): {
  punches: LivePunch[];
  publish: (p: LivePunch, ctx: PublishContext) => Promise<void>;
  backendEnabled: boolean;
} {
  const [punches, setPunches] = useState<LivePunch[]>([]);

  useEffect(() => {
    return punchRealtime.subscribe(setPunches);
  }, []);

  return {
    punches,
    publish: (p, ctx) => punchRealtime.publish(p, ctx),
    backendEnabled: punchRealtime.enabled,
  };
}
