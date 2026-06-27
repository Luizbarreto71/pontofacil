import * as React from "react";
import { punchesService } from "@/lib/supabase/punchesService";
import { useAuth } from "./AuthContext";
import type { PunchType } from "@/types";

export interface JourneyStep {
  type: PunchType;
  label: string;
  time: string | null;
}

const EMPTY: JourneyStep[] = [
  { type: "entrada", label: "Entrada", time: null },
  { type: "intervalo", label: "Intervalo", time: null },
  { type: "retorno", label: "Retorno", time: null },
  { type: "saida", label: "Saída", time: null },
];

interface PunchContextValue {
  journey: JourneyStep[];
  nextStep: JourneyStep | null;
  loading: boolean;
  register: (type: PunchType, time: string) => void;
  refresh: () => Promise<void>;
}

const PunchContext = React.createContext<PunchContextValue | null>(null);

export function PunchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [journey, setJourney] = React.useState<JourneyStep[]>(EMPTY);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!user?.id) {
      setJourney(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const j = await punchesService.todayJourney(user.id);
    setJourney(j);
    setLoading(false);
  }, [user?.id]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const nextStep = React.useMemo(
    () => journey.find((s) => s.time === null) ?? null,
    [journey]
  );

  // atualização otimista (a fonte da verdade é o banco via refresh)
  const register = React.useCallback((type: PunchType, time: string) => {
    setJourney((prev) => prev.map((s) => (s.type === type ? { ...s, time } : s)));
  }, []);

  return (
    <PunchContext.Provider value={{ journey, nextStep, loading, register, refresh }}>
      {children}
    </PunchContext.Provider>
  );
}

export function usePunch() {
  const ctx = React.useContext(PunchContext);
  if (!ctx) throw new Error("usePunch deve ser usado dentro de PunchProvider");
  return ctx;
}
