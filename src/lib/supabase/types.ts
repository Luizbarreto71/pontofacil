/**
 * Tipos do banco (subset usado pelo app). Espelha a migration em
 * supabase/migrations/0001_init.sql. Pode ser substituído pelo arquivo
 * gerado por `supabase gen types typescript`.
 */
import type { PunchType } from "@/types";

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string;
          nome: string;
          segmento: string | null;
          owner_id: string | null;
          endereco: string | null;
          lat: number | null;
          lng: number | null;
          raio_gps: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          segmento?: string | null;
          owner_id?: string | null;
          endereco?: string | null;
          lat?: number | null;
          lng?: number | null;
          raio_gps?: number;
        };
        Update: Partial<Database["public"]["Tables"]["empresas"]["Insert"]>;
      };
      usuarios: {
        Row: {
          id: string;
          empresa_id: string | null;
          nome: string;
          email: string;
          cargo: string | null;
          role: "admin" | "gestor" | "rh" | "supervisor" | "funcionario";
          avatar_url: string | null;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          empresa_id?: string | null;
          nome: string;
          email: string;
          cargo?: string | null;
          role?: "admin" | "gestor" | "rh" | "supervisor" | "funcionario";
          avatar_url?: string | null;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
      };
      registros_ponto: {
        Row: {
          id: string;
          empresa_id: string | null;
          funcionario_id: string;
          nome: string;
          cargo: string | null;
          avatar_url: string | null;
          tipo: PunchType;
          hora: string;
          localizacao: string | null;
          lat: number | null;
          lng: number | null;
          face_confidence: number | null;
          gps_confirmado: boolean;
          registrado_em: string;
        };
        Insert: {
          id?: string;
          empresa_id?: string | null;
          funcionario_id: string;
          nome: string;
          cargo?: string | null;
          avatar_url?: string | null;
          tipo: PunchType;
          hora: string;
          localizacao?: string | null;
          lat?: number | null;
          lng?: number | null;
          face_confidence?: number | null;
          gps_confirmado?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["registros_ponto"]["Insert"]>;
      };
      face_embeddings: {
        Row: {
          id: string;
          funcionario_id: string;
          empresa_id: string | null;
          descriptor: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          funcionario_id: string;
          empresa_id?: string | null;
          descriptor: number[];
        };
        Update: Partial<Database["public"]["Tables"]["face_embeddings"]["Insert"]>;
      };
      notificacoes: {
        Row: {
          id: string;
          empresa_id: string | null;
          funcionario_id: string | null;
          mensagem: string;
          tipo: string;
          canal: string;
          lida: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id?: string | null;
          funcionario_id?: string | null;
          mensagem: string;
          tipo?: string;
          canal?: string;
          lida?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["notificacoes"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
