import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ScanFace,
  Fingerprint,
  Loader2,
  XCircle,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/brand/WhatsAppIcon";
import { usePunch } from "@/contexts/PunchContext";
import { useToast } from "@/components/ui/toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRealtimePunches } from "@/hooks/useRealtimePunches";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useSettings } from "@/contexts/SettingsContext";
import { punchMeta } from "@/lib/punch-meta";
import { sleep } from "@/lib/utils";
import { reverseGeocode } from "@/lib/geo";
import { notificationsService } from "@/lib/supabase/notificationsService";
import { loadModels, getDescriptor, compare } from "@/lib/face/faceService";
import { faceStore } from "@/lib/face/faceStore";
import type { LivePunch } from "@/types";

type CheckState = "pending" | "ok" | "fail";
type Phase = "init" | "scanning" | "ready" | "registering" | "success" | "error";

export function FaceScreen() {
  const navigate = useNavigate();
  const { nextStep, register, refresh } = usePunch();
  const { toast } = useToast();
  const { user } = useAuth();
  const { workLocation } = useCompany();
  const { settings } = useSettings();
  const { publish } = useRealtimePunches();
  const geo = useGeolocation(workLocation, true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const uid = user?.id ?? "u1";
  const [hasCamera, setHasCamera] = useState(false);
  const [phase, setPhase] = useState<Phase>("init");
  const [statusMsg, setStatusMsg] = useState("Carregando biometria…");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(faceStore.hasEnrolled(uid));
  const [faceConfidence, setFaceConfidence] = useState(0);
  const [address, setAddress] = useState<string>("");

  // sincroniza o descritor do banco (multi-dispositivo) ao abrir
  useEffect(() => {
    faceStore.syncFromDb(uid).then(setEnrolled);
  }, [uid]);

  const [checks, setChecks] = useState<{ face: CheckState; gps: CheckState; area: CheckState }>(
    { face: "pending", gps: "pending", area: "pending" }
  );

  const step = nextStep ?? { type: "saida" as const, label: "Saída", time: null };
  const meta = punchMeta[step.type];

  // 1) Câmera real
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 480, height: 480 },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasCamera(true);
        }
      } catch {
        setHasCamera(false);
      }
    })();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // 2) GPS → atualiza checks de localização/área e busca endereço
  useEffect(() => {
    if (geo.status === "granted") {
      setChecks((c) => ({ ...c, gps: "ok", area: geo.withinRadius ? "ok" : "fail" }));
      if (geo.coords && !address) {
        reverseGeocode(geo.coords).then(setAddress);
      }
    } else if (
      geo.status === "denied" ||
      geo.status === "error" ||
      geo.status === "insecure" ||
      geo.status === "unsupported"
    ) {
      setChecks((c) => ({ ...c, gps: "fail", area: "fail" }));
    }
  }, [geo.status, geo.withinRadius, geo.coords, address]);

  // 3) Modelos + biometria facial REAL
  const runBiometrics = useCallback(async () => {
    setPhase("scanning");
    setChecks((c) => ({ ...c, face: "pending" }));
    try {
      // Reconhecimento facial desativado nas configurações → pula a etapa
      if (!settings.faceRecognition) {
        setChecks((c) => ({ ...c, face: "ok" }));
        setFaceConfidence(1);
        setStatusMsg("Reconhecimento facial desativado");
        return;
      }
      setStatusMsg("Carregando modelos de biometria…");
      await loadModels();
      if (!hasCamera || !videoRef.current) {
        // sem câmera: não é possível biometria real
        setChecks((c) => ({ ...c, face: "fail" }));
        setStatusMsg("Câmera indisponível");
        return;
      }

      // aguarda vídeo pronto
      const video = videoRef.current;
      if (video.readyState < 2) {
        await new Promise((r) => video.addEventListener("loadeddata", r, { once: true }));
      }

      setStatusMsg("Detectando rosto…");
      // tenta capturar um descritor (algumas tentativas)
      let captured: Float32Array | null = null;
      let score = 0;
      for (let i = 0; i < 12 && !captured; i++) {
        const r = await getDescriptor(video);
        if (r) {
          captured = r.descriptor;
          score = r.score;
        } else {
          await sleep(350);
        }
      }

      if (!captured) {
        setChecks((c) => ({ ...c, face: "fail" }));
        setStatusMsg("Nenhum rosto detectado. Aproxime-se e melhore a luz.");
        return;
      }

      // garante o descritor do banco antes de decidir
      await faceStore.syncFromDb(uid);
      const enrolledDesc = faceStore.getDescriptor(uid);

      // Cadastro x Verificação
      if (!enrolledDesc) {
        setIsEnrolling(true);
        await faceStore.save(uid, user?.empresaId, captured);
        setEnrolled(true);
        setFaceConfidence(score);
        setChecks((c) => ({ ...c, face: "ok" }));
        setStatusMsg("Biometria cadastrada com sucesso!");
      } else {
        const cmp = compare(captured, enrolledDesc);
        if (cmp.matched) {
          setFaceConfidence(cmp.confidence);
          setChecks((c) => ({ ...c, face: "ok" }));
          setStatusMsg("Identidade confirmada");
        } else {
          setFaceConfidence(cmp.confidence);
          setChecks((c) => ({ ...c, face: "fail" }));
          setStatusMsg("Rosto não corresponde ao cadastro.");
        }
      }
    } catch (e) {
      setChecks((c) => ({ ...c, face: "fail" }));
      setStatusMsg("Falha ao processar biometria.");
    }
  }, [hasCamera, settings.faceRecognition, uid, user?.empresaId]);

  // dispara biometria quando a câmera estiver pronta
  useEffect(() => {
    if (hasCamera && phase === "init") {
      runBiometrics();
    }
    // se sem câmera após 2.5s, marca init->scanning para mostrar estado
    const t = setTimeout(() => {
      if (!hasCamera && phase === "init") {
        setChecks((c) => ({ ...c, face: "fail" }));
        setPhase("scanning");
        setStatusMsg("Câmera indisponível — habilite o acesso à câmera.");
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [hasCamera, phase, runBiometrics]);

  // quando os 3 checks resolverem, define ready/error
  useEffect(() => {
    if (phase !== "scanning") return;
    const faceOk = checks.face === "ok";
    const gpsOk = checks.gps === "ok";
    const areaOk = checks.area === "ok";
    if (faceOk && gpsOk && areaOk) setPhase("ready");
  }, [checks, phase]);

  const allOk = checks.face === "ok" && checks.gps === "ok" && checks.area === "ok";

  const handleRegister = async () => {
    setPhase("registering");
    await sleep(900);
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    register(step.type, time);

    const local = address || workLocation?.label || "Local não informado";
    const live: LivePunch = {
      id: `${user?.id ?? "u"}-${now.getTime()}`,
      employeeId: user?.id ?? "u1",
      employeeName: user?.name ?? "Funcionário",
      role: user?.role ?? "",
      avatarUrl: user?.avatarUrl,
      type: step.type,
      time,
      timestamp: now.getTime(),
      location: local,
      lat: geo.coords?.lat,
      lng: geo.coords?.lng,
      faceConfidence,
      gpsConfirmed: geo.withinRadius,
    };
    // → registros_ponto (realtime no dashboard)
    try {
      await publish(live, {
        empresaId: user?.empresaId,
        funcionarioId: user?.id ?? "u1",
      });
      if (settings.whatsapp) {
        await notificationsService.createForPunch({
          empresaId: user?.empresaId,
          funcionarioId: user?.id ?? "u1",
          nome: user?.name ?? "Funcionário",
          tipo: step.type,
          hora: time,
          local,
        });
      }
      await refresh();
    } catch {
      // se a persistência falhar, ainda mostramos sucesso local
    }

    setPhase("success");
    toast({
      variant: "success",
      title: `${meta.label} registrada às ${time}`,
      description: settings.whatsapp
        ? "Gestor notificado via WhatsApp."
        : "Registro salvo.",
    });
    await sleep(2300);
    navigate("/app", { replace: true });
  };

  const retry = () => {
    setChecks((c) => ({ ...c, face: "pending" }));
    setPhase("init");
    runBiometrics();
  };

  const checkItems = [
    {
      id: "face",
      state: checks.face,
      label: isEnrolling ? "Biometria facial cadastrada" : "Face reconhecida",
      failLabel: "Rosto não reconhecido",
    },
    { id: "gps", state: checks.gps, label: "Localização confirmada", failLabel: "GPS indisponível" },
    { id: "area", state: checks.area, label: "Você está dentro da área permitida", failLabel: "Fora da área permitida" },
  ] as const;

  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-border bg-card p-2.5 shadow-soft"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-none">Bater Ponto</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{meta.label}</p>
        </div>
        {!enrolled && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            <UserPlus className="size-3.5" /> Cadastro facial
          </span>
        )}
      </header>

      <div className="flex flex-1 flex-col items-center px-6 pt-6">
        <p className="text-center text-[15px] font-medium text-muted-foreground">
          {phase === "success" ? "Tudo certo!" : statusMsg || "Posicione seu rosto dentro do círculo"}
        </p>

        {/* Círculo da câmera */}
        <div className="relative mt-8 flex items-center justify-center">
          {phase === "scanning" && checks.face === "pending" && (
            <>
              <span className="absolute size-72 rounded-full bg-primary/10 animate-pulse-ring" />
              <span className="absolute size-64 rounded-full bg-primary/10 animate-pulse-ring [animation-delay:.4s]" />
            </>
          )}

          <div
            className={`relative size-60 overflow-hidden rounded-full border-4 shadow-card transition-colors duration-500 ${
              phase === "success"
                ? "border-success"
                : checks.face === "fail"
                ? "border-danger"
                : allOk
                ? "border-primary"
                : "border-white dark:border-slate-700"
            }`}
          >
            {hasCamera ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full scale-x-[-1] object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary text-muted-foreground">
                <ScanFace className="size-12" />
                <span className="px-4 text-center text-[12px]">Câmera indisponível</span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/25" />
            {phase === "scanning" && checks.face === "pending" && hasCamera && (
              <motion.div
                initial={{ top: "8%" }}
                animate={{ top: ["8%", "88%", "8%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-x-3 h-0.5 rounded-full bg-primary/80 shadow-[0_0_12px_2px] shadow-primary/60"
              />
            )}

            <AnimatePresence>
              {phase === "success" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-success/85 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 320, damping: 18 }}
                  >
                    <CheckCircle2 className="size-24 text-white" strokeWidth={2.2} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="absolute -bottom-3 flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-card">
            {checks.face === "pending" ? (
              <>
                <ScanFace className="size-4 text-primary" /> Analisando…
              </>
            ) : checks.face === "ok" ? (
              <>
                <CheckCircle2 className="size-4 text-success" />
                {Math.round(faceConfidence * 100)}% de confiança
              </>
            ) : (
              <>
                <XCircle className="size-4 text-danger" /> Não reconhecido
              </>
            )}
          </div>
        </div>

        {/* Checklist */}
        <div className="mt-12 w-full max-w-sm space-y-3">
          {checkItems.map((c) => (
            <motion.div
              key={c.id}
              initial={false}
              animate={{ opacity: c.state === "pending" ? 0.5 : 1 }}
              className="flex items-center gap-3"
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full transition-colors ${
                  c.state === "ok"
                    ? "bg-success/15 text-success"
                    : c.state === "fail"
                    ? "bg-danger/15 text-danger"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {c.state === "ok" ? (
                  <CheckCircle2 className="size-5" />
                ) : c.state === "fail" ? (
                  <XCircle className="size-5" />
                ) : (
                  <Loader2 className="size-4 animate-spin" />
                )}
              </span>
              <span
                className={`text-[15px] ${
                  c.state === "ok"
                    ? "font-medium text-foreground"
                    : c.state === "fail"
                    ? "font-medium text-danger"
                    : "text-muted-foreground"
                }`}
              >
                {c.state === "fail" ? c.failLabel : c.label}
              </span>
            </motion.div>
          ))}
          {address && (
            <p className="pl-10 text-[12px] text-muted-foreground">📍 {address}</p>
          )}
        </div>
      </div>

      {/* Ação */}
      <div className="space-y-3 px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
        {phase === "success" ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 py-3 text-sm font-semibold text-success">
            <WhatsAppIcon className="size-5" />
            Gestor notificado via WhatsApp
          </div>
        ) : checks.face === "fail" || checks.area === "fail" || checks.gps === "fail" ? (
          <Button size="lg" variant="outline" className="h-16 w-full text-base" onClick={retry}>
            <Loader2 className="size-5" /> Tentar novamente
          </Button>
        ) : (
          <Button
            size="lg"
            className="h-16 w-full text-base"
            disabled={!allOk || phase === "registering"}
            onClick={handleRegister}
          >
            {phase === "registering" ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <>
                <Fingerprint className="size-5" />
                Registrar Ponto
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
