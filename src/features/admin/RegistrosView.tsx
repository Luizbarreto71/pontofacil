import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  FileSpreadsheet,
  FileText,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ScanFace,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { registrosService, type RegistroRow } from "@/lib/supabase/registrosService";
import { punchMeta } from "@/lib/punch-meta";
import { exportCSV, exportPDF } from "@/lib/export";
import { initials, cn } from "@/lib/utils";
import type { PunchType } from "@/types";

const MES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function lastMonths(n: number) {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: `${MES[d.getMonth()]}/${d.getFullYear()}` });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

const TYPES: { value: PunchType | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os tipos" },
  { value: "entrada", label: "Entrada" },
  { value: "intervalo", label: "Intervalo" },
  { value: "retorno", label: "Retorno" },
  { value: "saida", label: "Saída" },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function RegistrosView() {
  const { user } = useAuth();
  const empresaId = user?.empresaId;
  const months = useMemo(() => lastMonths(6), []);
  const [month, setMonth] = useState(months[0].value);
  const [type, setType] = useState<PunchType | "todos">("todos");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<RegistroRow[]>([]);
  const [loading, setLoading] = useState(true);
  const monthLabel = months.find((m) => m.value === month)?.label ?? "";

  useEffect(() => {
    if (!empresaId) return;
    let active = true;
    setLoading(true);
    const load = () =>
      registrosService.list(empresaId, month).then((r) => {
        if (active) { setRows(r); setLoading(false); }
      });
    load();
    const unsub = registrosService.subscribe(empresaId, load); // tempo real
    return () => { active = false; unsub(); };
  }, [empresaId, month]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (type === "todos" || r.tipo === type) &&
        (!q || r.nome.toLowerCase().includes(q) || (r.localizacao ?? "").toLowerCase().includes(q))
    );
  }, [rows, type, query]);

  const headers = ["Data", "Hora", "Funcionário", "Tipo", "Local", "GPS", "Face"];
  const tableRows = filtered.map((r) => [
    fmtDate(r.registrado_em), r.hora, r.nome, punchMeta[r.tipo].label,
    r.localizacao ?? "—", r.gps_confirmado ? "Confirmado" : "Fora da área",
    r.face_confidence != null ? `${Math.round(r.face_confidence * 100)}%` : "—",
  ]);

  const doCSV = () => exportCSV(`registros-${month}.csv`, headers, tableRows);
  const doPDF = () => exportPDF(`registros-${month}.pdf`, "Registros de Ponto", `${user?.company ?? ""} · ${monthLabel}`, headers, tableRows);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Registros</h1>
          <p className="text-[13px] text-muted-foreground">
            {loading ? "Carregando…" : `${filtered.length} registro(s) · ${monthLabel}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={doCSV} disabled={!filtered.length}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button size="sm" onClick={doPDF} disabled={!filtered.length}>
            <FileText className="size-4" /> PDF
          </Button>
        </div>
      </div>

      {/* filtros */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_2fr]">
        <Select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value as PunchType | "todos")}>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        <Input
          icon={<Search />}
          placeholder="Buscar por funcionário ou local…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* tabela */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
        <div className="hidden grid-cols-[0.7fr_0.6fr_2fr_1fr_1.6fr_0.9fr_0.6fr] gap-2 border-b border-border bg-secondary/40 px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-muted-foreground sm:grid">
          <span>Data</span><span>Hora</span><span>Funcionário</span><span>Tipo</span><span>Local</span><span>GPS</span><span className="text-center">Face</span>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">{[0,1,2,3,4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ClipboardList className="size-9 text-muted-foreground/50" />
            <p className="text-[15px] font-semibold">Nenhum registro</p>
            <p className="text-[13px] text-muted-foreground">Nenhum ponto encontrado para os filtros em {monthLabel}.</p>
          </div>
        ) : (
          filtered.map((r, i) => {
            const meta = punchMeta[r.tipo];
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
                className="grid grid-cols-2 items-center gap-x-2 gap-y-1 border-b border-border/50 px-4 py-3 last:border-0 sm:grid-cols-[0.7fr_0.6fr_2fr_1fr_1.6fr_0.9fr_0.6fr]"
              >
                {/* mobile: nome+tipo em destaque; desktop: colunas */}
                <span className="order-1 text-[13px] font-semibold tabular-nums sm:order-none sm:font-normal">{fmtDate(r.registrado_em)}</span>
                <span className="order-2 text-right font-mono text-[13px] font-semibold tabular-nums sm:order-none sm:text-left">{r.hora}</span>
                <div className="order-3 col-span-2 flex items-center gap-2.5 sm:order-none sm:col-span-1">
                  <Avatar className="size-8"><AvatarImage src={r.avatar_url ?? undefined} /><AvatarFallback>{initials(r.nome)}</AvatarFallback></Avatar>
                  <span className="truncate text-[14px] font-semibold">{r.nome}</span>
                </div>
                <span className="order-4 sm:order-none">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold", meta.bg, meta.text)}>
                    <span className={cn("size-1.5 rounded-full", meta.dot)} /> {meta.label}
                  </span>
                </span>
                <span className="order-6 col-span-2 flex items-center gap-1 truncate text-[12px] text-muted-foreground sm:order-none sm:col-span-1">
                  <MapPin className="size-3 shrink-0" /> {r.localizacao ?? "—"}
                </span>
                <span className="order-5 sm:order-none">
                  {r.gps_confirmado ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-success"><ShieldCheck className="size-3.5" /> OK</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-warning"><ShieldAlert className="size-3.5" /> Fora</span>
                  )}
                </span>
                <span className="order-7 hidden items-center justify-center gap-1 text-[12px] font-semibold text-muted-foreground sm:flex">
                  <ScanFace className="size-3.5" />
                  {r.face_confidence != null ? `${Math.round(r.face_confidence * 100)}%` : "—"}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
