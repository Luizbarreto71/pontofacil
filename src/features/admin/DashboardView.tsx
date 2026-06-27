import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Users as UsersIcon,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { LeafletLiveMap, type LiveMarker } from "@/components/shared/LeafletLiveMap";
import { WhatsAppIcon } from "@/components/brand/WhatsAppIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimePunches } from "@/hooks/useRealtimePunches";
import { employeeService } from "@/lib/supabase/employeeService";
import { statsService, type TodayStats, type WeeklyPoint } from "@/lib/supabase/statsService";
import { punchMeta } from "@/lib/punch-meta";
import { formatHoursLabel, initials, cn } from "@/lib/utils";

export function DashboardView() {
  const { user } = useAuth();
  const { punches } = useRealtimePunches();
  const empresaId = user?.empresaId;

  const [stats, setStats] = useState<TodayStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [empCount, setEmpCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // recarrega ao montar e a cada novo ponto ao vivo
  useEffect(() => {
    if (!empresaId) return;
    let active = true;
    (async () => {
      const emps = await employeeService.list(empresaId);
      const [t, w] = await Promise.all([
        statsService.today(empresaId, emps.length),
        statsService.weekly(empresaId),
      ]);
      if (active) {
        setEmpCount(emps.length);
        setStats(t);
        setWeekly(w);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [empresaId, punches.length]);

  const todayPunches = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return punches.filter((p) => p.timestamp >= start.getTime());
  }, [punches]);

  // marcadores reais: última posição (com lat/lng) de cada funcionário hoje
  const liveMarkers = useMemo<LiveMarker[]>(() => {
    const seen = new Set<string>();
    const out: LiveMarker[] = [];
    for (const p of todayPunches) {
      if (p.lat == null || p.lng == null || seen.has(p.employeeId)) continue;
      seen.add(p.employeeId);
      out.push({
        id: p.employeeId,
        lat: p.lat,
        lng: p.lng,
        label: p.employeeName,
        sublabel: `${punchMeta[p.type].label} · ${p.time} · ${p.location}`,
        avatarUrl: p.avatarUrl,
        color: p.gpsConfirmed ? "#16A34A" : "#F59E0B",
      });
    }
    return out;
  }, [todayPunches]);

  const donut = stats
    ? [
        { name: "Presentes", value: stats.presentes, color: "#16A34A" },
        { name: "Atrasados", value: stats.atrasados, color: "#F59E0B" },
        { name: "Ausentes", value: stats.ausentes, color: "#DC2626" },
      ]
    : [];
  const donutTotal = donut.reduce((a, b) => a + b.value, 0);

  const kpis = stats
    ? [
        { label: "Funcionários", value: empCount, sub: "Ativos", tone: "text-foreground", icon: Users, iconBg: "bg-primary/10 text-primary", trend: null },
        { label: "Presentes", value: stats.presentes, sub: pct(stats.presentes, empCount), tone: "text-success", icon: UserCheck, iconBg: "bg-success/12 text-success", trend: { up: true } },
        { label: "Atrasados", value: stats.atrasados, sub: pct(stats.atrasados, empCount), tone: "text-warning", icon: AlertTriangle, iconBg: "bg-warning/15 text-warning", trend: { up: false } },
        { label: "Ausentes", value: stats.ausentes, sub: pct(stats.ausentes, empCount), tone: "text-danger", icon: UserX, iconBg: "bg-danger/12 text-danger", trend: { up: false } },
      ]
    : [];

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-float/50"
          >
            <div className="flex items-center justify-between">
              <span className={cn("flex size-9 items-center justify-center rounded-xl", k.iconBg)}>
                <k.icon className="size-5" />
              </span>
              {k.trend &&
                (k.trend.up ? (
                  <TrendingUp className="size-4 text-success" />
                ) : (
                  <TrendingDown className="size-4 text-muted-foreground" />
                ))}
            </div>
            <p className={cn("mt-3 text-3xl font-extrabold tabular-nums", k.tone)}>{k.value}</p>
            <p className="mt-0.5 text-[13px] font-medium text-muted-foreground">{k.label}</p>
            <p className="text-[12px] text-muted-foreground/80">{k.sub}</p>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="col-span-2 rounded-xl bg-gradient-to-br from-primary to-primary-dark p-4 text-white shadow-float lg:col-span-4 xl:col-span-1"
        >
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-white/80">Horas hoje</p>
            <Clock className="size-4 text-white/80" />
          </div>
          <p className="mt-2 text-3xl font-extrabold">
            {formatHoursLabel(stats?.horasHojeMin ?? 0)}
          </p>
          <p className="mt-1 text-[12px] text-white/70">Total da equipe</p>
        </motion.div>
      </div>

      {/* Mapa + Últimos registros */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Mapa em tempo real</h2>
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-success">
              <span className="size-2 animate-pulse rounded-full bg-success" /> Ao vivo
            </span>
          </div>
          {liveMarkers.length > 0 ? (
            <LeafletLiveMap className="h-[300px] w-full border border-border" markers={liveMarkers} />
          ) : (
            <div className="flex h-[300px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 text-center">
              <UsersIcon className="size-8 text-muted-foreground/50" />
              <p className="text-[13px] text-muted-foreground">
                Nenhum registro com GPS hoje.<br />As posições aparecem aqui em tempo real.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Últimos registros</h2>
            {todayPunches.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {todayPunches.length} hoje
              </span>
            )}
          </div>
          {todayPunches.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <UsersIcon className="size-8 text-muted-foreground/50" />
              <p className="text-[13px] text-muted-foreground">Nenhum registro hoje ainda.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              <AnimatePresence initial={false}>
                {todayPunches.slice(0, 8).map((p) => {
                  const meta = punchMeta[p.type];
                  return (
                    <motion.li
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: -10, backgroundColor: "rgba(37,99,235,0.10)" }}
                      animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
                      transition={{ duration: 0.5 }}
                      className="flex items-center gap-3 rounded-lg px-1 py-2"
                    >
                      <Avatar className="size-9">
                        <AvatarImage src={p.avatarUrl} />
                        <AvatarFallback>{initials(p.employeeName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold">{p.employeeName}</p>
                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <WhatsAppIcon className="size-3 text-[#25D366]" />
                          {p.faceConfidence ? `Face ${Math.round(p.faceConfidence * 100)}% · ` : ""}
                          {p.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-[13px] font-semibold", meta.text)}>{meta.label}</p>
                        <p className="font-mono text-[12px] tabular-nums text-muted-foreground">{p.time}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Horas trabalhadas (semanal)</h2>
            <span className="flex items-center gap-1 text-[12px] font-semibold text-primary">
              <ArrowUpRight className="size-4" /> últimos 7 dias
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weekly} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={tooltip} />
              <Line type="monotone" dataKey="hours" stroke="#2563EB" strokeWidth={3}
                dot={{ r: 4, fill: "#2563EB", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-2 font-semibold">Distribuição de status</h2>
          {donutTotal === 0 ? (
            <p className="py-16 text-center text-[13px] text-muted-foreground">Sem dados hoje.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={donut} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} stroke="none">
                    {donut.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltip} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-2">
                {donut.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 text-[13px]">
                    <span className="size-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="flex-1 text-muted-foreground">{s.name}</span>
                    <span className="font-semibold tabular-nums">{s.value}</span>
                    <span className="w-10 text-right text-muted-foreground tabular-nums">
                      {Math.round((s.value / donutTotal) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const tooltip = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 13,
} as const;

function pct(v: number, total: number): string {
  if (!total) return "0% da equipe";
  return `${Math.round((v / total) * 100)}% da equipe`;
}
