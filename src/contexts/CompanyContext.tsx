import * as React from "react";
import { companyService } from "@/lib/supabase/companyService";
import { useAuth } from "./AuthContext";
import type { WorkLocation } from "@/lib/geo";

interface CompanyContextValue {
  workLocation: WorkLocation | null;
  /** empresa ainda não configurou o endereço/raio */
  needsLocation: boolean;
  loading: boolean;
  refresh: () => void;
}

const CompanyContext = React.createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workLocation, setWorkLocation] = React.useState<WorkLocation | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user?.empresaId) {
      setWorkLocation(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const loc = await companyService.getWorkLocation(user.empresaId);
    setWorkLocation(loc);
    setLoading(false);
  }, [user?.empresaId]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <CompanyContext.Provider
      value={{
        workLocation,
        needsLocation: !loading && !workLocation,
        loading,
        refresh: load,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = React.useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany deve ser usado dentro de CompanyProvider");
  return ctx;
}
