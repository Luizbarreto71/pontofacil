import { supabase } from "./client";
import type { Database } from "./types";
import type { WorkLocation } from "@/lib/geo";

type EmpresaRow = Database["public"]["Tables"]["empresas"]["Row"];

export const companyService = {
  async getEmpresa(empresaId: string): Promise<EmpresaRow | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from("empresas")
      .select("*")
      .eq("id", empresaId)
      .maybeSingle();
    return (data as EmpresaRow) ?? null;
  },

  /** Local de trabalho derivado da empresa (ou null se ainda não configurado). */
  async getWorkLocation(empresaId: string): Promise<WorkLocation | null> {
    const e = await this.getEmpresa(empresaId);
    if (!e || e.lat == null || e.lng == null) return null;
    return {
      lat: e.lat,
      lng: e.lng,
      label: e.endereco ?? e.nome,
      radius: e.raio_gps ?? 150,
    };
  },

  async updateLocation(
    empresaId: string,
    loc: { endereco: string; lat: number; lng: number; raio_gps: number }
  ): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from("empresas")
      .update({
        endereco: loc.endereco,
        lat: loc.lat,
        lng: loc.lng,
        raio_gps: loc.raio_gps,
      })
      .eq("id", empresaId);
    if (error) throw new Error(error.message);
  },
};
