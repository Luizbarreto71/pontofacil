import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarRange } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Page, PageHeader } from "@/components/layout/Page";
import { useAuth } from "@/contexts/AuthContext";
import { punchesService } from "@/lib/supabase/punchesService";
import { punchMeta } from "@/lib/punch-meta";
import { formatHoursLabel } from "@/lib/utils";
import type { DayRecord, PunchType } from "@/types";

const MES_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function lastMonths(n: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const y = d.getFullYear();
    const m = d.getMonth();
    out.push({
      value: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: `${MES_LABEL[m]}/${y}`,
    });
    d.setMonth(m - 1);
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

export function HistoryScreen() {
  const { user } = useAuth();
  const months = useMemo(() => lastMonths(6), []);
  const [month, setMonth] = useState(months[0].value);
  const [type, setType] = useState<PunchType | "todos">("todos");
  const [days, setDays] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!user?.id) return;
    punchesService.history(user.id, month).then((d) => {
      if (active) {
        setDays(d);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [user?.id, month]);

  const filtered = useMemo(() => {
    if (type === "todos") return days;
    return days
      .map((d) => ({ ...d, events: d.events.filter((e) => e.type === type) }))
      .filter((d) => d.events.length > 0);
  }, [days, type]);

  const totalMin = days.reduce((s, d) => s + d.workedMinutes, 0);
  const monthLabel = months.find((m) => m.value === month)?.label ?? "";

  return (
    <Page>
      <PageHeader title="Histórico" subtitle="Acompanhe seus registros" />

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Select value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value as PunchType | "todos")}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      </div>

      <Card className="mb-5 flex items-center justify-between bg-gradient-to-br from-primary to-primary-dark p-4 text-white shadow-float">
        <div>
          <p className="text-xs font-medium text-white/70">Total trabalhado · {monthLabel}</p>
          <p className="text-2xl font-extrabold">{formatHoursLabel(totalMin)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-white/70">Dias registrados</p>
          <p className="text-2xl font-extrabold">{days.length}</p>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 py-14 text-center">
          <CalendarRange className="size-9 text-muted-foreground/60" />
          <p className="text-[15px] font-semibold text-foreground">Nenhum registro</p>
          <p className="max-w-[16rem] text-[13px] text-muted-foreground">
            Não há pontos registrados em {monthLabel}.
          </p>
        </div>
      ) : (
        <div className="space-y-4 pb-4">
          {filtered.map((day, i) => (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden p-0">
                <div className="flex">
                  <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-border bg-secondary/40 py-4">
                    <span className="text-2xl font-extrabold leading-none">
                      {day.date.slice(8, 10)}
                    </span>
                    <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {day.weekday}
                    </span>
                  </div>
                  <div className="flex-1 p-4">
                    <ul className="space-y-2.5">
                      {day.events.map((e) => {
                        const meta = punchMeta[e.type];
                        return (
                          <li key={e.type} className="flex items-center gap-3">
                            <span className={`size-2.5 rounded-full ${meta.dot}`} />
                            <span className="w-12 font-mono text-[13px] font-semibold tabular-nums">
                              {e.time}
                            </span>
                            <span className="text-[13px] text-muted-foreground">{meta.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3 flex justify-end border-t border-border pt-2.5">
                      <span className="text-[13px] font-bold text-foreground">
                        {formatHoursLabel(day.workedMinutes)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </Page>
  );
}
