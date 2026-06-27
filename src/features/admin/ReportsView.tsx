import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { reportService, formatSaldo, type EmployeeReport } from "@/lib/supabase/reportService";
import { exportCSV, exportPDF } from "@/lib/export";
import { formatHoursLabel, initials, cn } from "@/lib/utils";

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

export function ReportsView() {
  const { user } = useAuth();
  const months = useMemo(() => lastMonths(6), []);
  const [month, setMonth] = useState(months[0].value);
  const [rows, setRows] = useState<EmployeeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const monthLabel = months.find((m) => m.value === month)?.label ?? "";

  useEffect(() => {
    if (!user?.empresaId) return;
    let active = true;
    setLoading(true);
    reportService.monthly(user.empresaId, month).then((r) => {
      if (active) { setRows(r); setLoading(false); }
    });
    return () => { active = false; };
  }, [user?.empresaId, month]);

  const totals = useMemo(() => ({
    trab: rows.reduce((s, r) => s + r.minutosTrabalhados, 0),
    saldo: rows.reduce((s, r) => s + r.saldoMin, 0),
    atrasos: rows.reduce((s, r) => s + r.atrasos, 0),
  }), [rows]);

  const headers = ["Funcionário", "Cargo", "Dias", "Horas trabalhadas", "Horas previstas", "Banco de horas", "Atrasos"];
  const tableRows = rows.map((r) => [
    r.nome, r.cargo ?? "—", r.diasTrabalhados,
    formatHoursLabel(r.minutosTrabalhados), formatHoursLabel(r.minutosEsperados),
    formatSaldo(r.saldoMin), r.atrasos,
  ]);

  const doCSV = () => exportCSV(`relatorio-${month}.csv`, headers, tableRows);
  const doPDF = () => exportPDF(`relatorio-${month}.pdf`, "Relatório de Jornada", `${user?.company ?? ""} · ${monthLabel}`, headers, tableRows);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Relatórios</h1>
          <p className="text-[13px] text-muted-foreground">Jornada, banco de horas e atrasos por funcionário</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-40"><Select value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select></div>
          <Button variant="outline" size="sm" onClick={doCSV} disabled={!rows.length}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button size="sm" onClick={doPDF} disabled={!rows.length}>
            <FileText className="size-4" /> PDF
          </Button>
        </div>
      </div>

      {/* totais */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat icon={<Clock className="size-4" />} label="Horas trabalhadas" value={formatHoursLabel(totals.trab)} />
        <Stat
          icon={totals.saldo >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
          label="Banco de horas (total)" value={formatSaldo(totals.saldo)}
          tone={totals.saldo >= 0 ? "text-success" : "text-danger"}
        />
        <Stat icon={<AlertTriangle className="size-4" />} label="Atrasos no mês" value={String(totals.atrasos)} tone="text-warning" />
      </div>

      {/* tabela */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="grid grid-cols-[1.6fr_repeat(5,1fr)] gap-2 border-b border-border bg-secondary/40 px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
          <span>Funcionário</span><span className="text-center">Dias</span>
          <span className="text-right">Trabalhadas</span><span className="text-right">Previstas</span>
          <span className="text-right">Banco</span><span className="text-center">Atrasos</span>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">{[0,1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-[14px] text-muted-foreground">Nenhum registro em {monthLabel}.</p>
        ) : rows.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="grid grid-cols-[1.6fr_repeat(5,1fr)] items-center gap-2 border-b border-border/60 px-4 py-3 last:border-0">
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8"><AvatarImage src={r.avatarUrl ?? undefined} /><AvatarFallback>{initials(r.nome)}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{r.nome}</p>
                <p className="truncate text-[11px] text-muted-foreground">{r.cargo ?? "—"}</p>
              </div>
            </div>
            <span className="text-center text-[14px] tabular-nums">{r.diasTrabalhados}</span>
            <span className="text-right text-[14px] font-semibold tabular-nums">{formatHoursLabel(r.minutosTrabalhados)}</span>
            <span className="text-right text-[14px] tabular-nums text-muted-foreground">{formatHoursLabel(r.minutosEsperados)}</span>
            <span className={cn("text-right text-[14px] font-bold tabular-nums", r.saldoMin >= 0 ? "text-success" : "text-danger")}>{formatSaldo(r.saldoMin)}</span>
            <span className={cn("text-center text-[14px] font-semibold tabular-nums", r.atrasos > 0 ? "text-warning" : "text-muted-foreground")}>{r.atrasos}</span>
          </motion.div>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <FileDown className="size-3.5" /> Banco de horas = horas trabalhadas − previstas (jornada menos intervalo), nos dias com registro.
      </p>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">{icon}{label}</div>
      <p className={cn("mt-2 text-2xl font-extrabold tabular-nums", tone)}>{value}</p>
    </div>
  );
}
