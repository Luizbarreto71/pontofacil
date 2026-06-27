import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  ChevronRight,
  ScanFace,
  MapPinOff,
  RefreshCw,
  AlertTriangle,
  LogIn,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MapView } from "@/components/shared/MapView";
import { Page } from "@/components/layout/Page";
import { GpsStatusInline } from "@/components/shared/GpsStatus";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePunch } from "@/contexts/PunchContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNow } from "@/hooks/useNow";
import { punchMeta } from "@/lib/punch-meta";
import { faceStore } from "@/lib/face/faceStore";
import { shiftStatus, formatDuration } from "@/lib/schedule";
import { initials } from "@/lib/utils";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const todayLabel = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
}).format(new Date());

export function HomeScreen() {
  const { user } = useAuth();
  const { journey, nextStep, loading } = usePunch();
  const { workLocation, needsLocation } = useCompany();
  const geo = useGeolocation(workLocation, true);
  const now = useNow();
  const navigate = useNavigate();
  const firstName = user?.name.split(" ")[0] ?? "";
  const gpsOk = geo.withinRadius;
  const needsFace = !!user && !faceStore.hasEnrolled(user.id);

  const horaEntrada = user?.horaEntrada ?? "08:00";
  const horaSaida = user?.horaSaida ?? "18:00";
  const clockedIn = journey.find((s) => s.type === "entrada")?.time != null;
  const shift = shiftStatus(now, horaEntrada, horaSaida, clockedIn);
  const clockStr = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Notifica uma vez quando o funcionário fica atrasado (e ainda não bateu entrada)
  const { toast } = useToast();
  const lateNotified = useRef(false);
  useEffect(() => {
    if (shift.kind === "late") {
      if (!lateNotified.current) {
        lateNotified.current = true;
        toast({
          variant: "warning",
          title: "Você está atrasado",
          description: `Sua entrada era às ${horaEntrada}. Bata seu ponto o quanto antes.`,
        });
        // notificação do sistema (se permitido)
        try {
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("Ponto Fácil · Atraso", {
                body: `Sua entrada era às ${horaEntrada}. Registre seu ponto.`,
                icon: "/favicon.svg",
              });
            } else if (Notification.permission === "default") {
              Notification.requestPermission();
            }
          }
        } catch {
          /* ignora ambientes sem Notification */
        }
      }
    } else {
      lateNotified.current = false; // reseta ao bater ponto ou sair do estado de atraso
    }
  }, [shift.kind, horaEntrada, toast]);

  return (
    <Page>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
        {/* Cabeçalho com a foto do funcionário */}
        <motion.header variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">
              Olá, {firstName} <span className="inline-block">👋</span>
            </h1>
            <p className="mt-1 text-[15px] capitalize text-muted-foreground">{todayLabel}</p>
          </div>
          <button onClick={() => navigate("/app/perfil")}>
            <Avatar className="size-12 border-2 border-card shadow-soft">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback>{initials(user?.name ?? "")}</AvatarFallback>
            </Avatar>
          </button>
        </motion.header>

        {/* Relógio ao vivo + jornada */}
        <motion.div variants={item}>
          <Card
            className={`relative overflow-hidden p-5 text-white shadow-float ${
              shift.kind === "late"
                ? "bg-gradient-to-br from-danger to-rose-700"
                : "bg-gradient-to-br from-primary to-primary-dark"
            }`}
          >
            <div className="pointer-events-none absolute -right-6 -top-8 size-32 rounded-full bg-white/10 blur-2xl" />
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium text-white/70">Horário atual</p>
                <p className="font-mono text-4xl font-extrabold tabular-nums tracking-tight">
                  {clockStr}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-white/70">Sua jornada</p>
                <p className="text-[15px] font-bold tabular-nums">
                  {horaEntrada} – {horaSaida}
                </p>
              </div>
            </div>

            {/* status da jornada */}
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-[13px] font-semibold backdrop-blur-sm">
              {shift.kind === "late" ? (
                <>
                  <AlertTriangle className="size-4" />
                  Você está atrasado {formatDuration(shift.minutesLate)} — bata seu ponto!
                </>
              ) : shift.kind === "before" ? (
                <>
                  <Clock className="size-4" />
                  Faltam {formatDuration(shift.minutesTo)} para sua entrada
                </>
              ) : shift.kind === "ontime" ? (
                <>
                  <LogIn className="size-4" />
                  Está na hora de bater o ponto de entrada
                </>
              ) : shift.kind === "working" ? (
                <>
                  <CheckCircle2 className="size-4" />
                  Em expediente · entrada às {journey.find((s) => s.type === "entrada")?.time}
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  Fora do expediente
                </>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Banner de cadastro facial pendente */}
        {needsFace && (
          <motion.button
            variants={item}
            onClick={() => navigate("/app/cadastro-facial")}
            className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-left"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ScanFace className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-semibold text-foreground">Finalize seu cadastro</p>
              <p className="text-[12px] text-muted-foreground">Registre seu rosto para bater ponto</p>
            </div>
            <ChevronRight className="size-5 text-primary" />
          </motion.button>
        )}

        {/* Status do dia / GPS */}
        <motion.div variants={item}>
          <Card className="overflow-hidden p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-11 items-center justify-center rounded-xl ${
                  gpsOk ? "bg-success/12" : needsLocation ? "bg-muted" : "bg-warning/12"
                }`}
              >
                {gpsOk ? (
                  <ShieldCheck className="size-6 text-success" />
                ) : needsLocation ? (
                  <MapPinOff className="size-6 text-muted-foreground" />
                ) : (
                  <ShieldAlert className="size-6 text-warning" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Status do dia</p>
                <GpsStatusInline geo={geo} />
                <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2">
                  {geo.error
                    ? geo.error
                    : needsLocation
                    ? "Aguardando o gestor configurar o local"
                    : geo.accuracy
                    ? `Precisão ${Math.round(geo.accuracy)} m${
                        geo.distance != null ? ` · ${Math.round(geo.distance)} m do local` : ""
                      }`
                    : workLocation?.label ?? "Localização via GPS"}
                </p>
                {(geo.status === "error" || geo.status === "denied" || geo.approximate) && (
                  <button
                    onClick={geo.retry}
                    className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-primary"
                  >
                    <RefreshCw className="size-3.5" /> Tentar novamente
                  </button>
                )}
              </div>
              <MapView className="h-16 w-16 shrink-0" showSelf label="" />
            </div>
          </Card>
        </motion.div>

        {/* Jornada de hoje */}
        <motion.div variants={item}>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Jornada de hoje</h2>
              <button
                onClick={() => navigate("/app/historico")}
                className="flex items-center gap-0.5 text-[13px] font-semibold text-primary"
              >
                Ver histórico <ChevronRight className="size-4" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <ol className="relative space-y-5">
                {journey.map((step, idx) => {
                  const meta = punchMeta[step.type];
                  const done = step.time !== null;
                  const isLast = idx === journey.length - 1;
                  return (
                    <li key={step.type} className="relative flex items-center gap-4">
                      {!isLast && (
                        <span className="absolute left-[7px] top-5 h-[calc(100%+4px)] w-0.5 -translate-x-1/2 bg-border" />
                      )}
                      <span
                        className={`relative z-10 size-3.5 shrink-0 rounded-full ring-4 ring-card ${
                          done ? meta.dot : "bg-muted"
                        }`}
                      />
                      <span
                        className={`flex-1 text-[15px] ${
                          done ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {meta.label}
                      </span>
                      <span
                        className={`font-mono text-[15px] tabular-nums ${
                          done ? "font-semibold text-foreground" : "text-muted-foreground/60"
                        }`}
                      >
                        {step.time ?? "--:--"}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </motion.div>

        {/* Bater Ponto */}
        <motion.div variants={item} className="pt-1">
          <Button
            size="lg"
            className="h-16 w-full text-base"
            onClick={() => navigate(needsFace ? "/app/cadastro-facial" : "/app/bater-ponto")}
          >
            <Clock className="size-5" />
            {nextStep ? `Bater Ponto · ${punchMeta[nextStep.type].label}` : "Jornada concluída"}
          </Button>
        </motion.div>
      </motion.div>
    </Page>
  );
}
