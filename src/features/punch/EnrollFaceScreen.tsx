import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ScanFace, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import { loadModels, getDescriptor, detectForLiveness } from "@/lib/face/faceService";
import { faceStore } from "@/lib/face/faceStore";
import { captureFrame, storageService } from "@/lib/supabase/storageService";
import { authService } from "@/lib/supabase/authService";
import { sleep } from "@/lib/utils";

type Phase = "loading" | "ready" | "capturing" | "done" | "error";

export function EnrollFaceScreen() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [msg, setMsg] = useState("Preparando câmera e biometria…");

  const uid = user?.id ?? "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 480, height: 480 },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        await loadModels();
        if (!cancelled) {
          setPhase("ready");
          setMsg("Centralize seu rosto e toque em capturar");
        }
      } catch {
        if (!cancelled) {
          setPhase("error");
          setMsg("Não foi possível acessar a câmera.");
        }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    setPhase("capturing");
    setMsg("Detectando rosto…");

    // prova de vida (piscar) antes de cadastrar — impede cadastrar uma foto
    setMsg("Pisque os olhos para confirmar 👁️");
    const baseline: number[] = [];
    let eyesClosed = false;
    let blinks = 0;
    let faceSeen = false;
    const deadline = Date.now() + 9000;
    while (Date.now() < deadline && blinks < 1) {
      const r = await detectForLiveness(video);
      if (!r) { await sleep(120); continue; }
      faceSeen = true;
      if (baseline.length < 6) { baseline.push(r.ear); await sleep(90); continue; }
      const open = baseline.reduce((a, b) => a + b, 0) / baseline.length;
      if (r.ear < open * 0.72) eyesClosed = true;
      else if (eyesClosed && r.ear > open * 0.9) { blinks++; eyesClosed = false; }
      await sleep(70);
    }
    if (blinks < 1) {
      setPhase("ready");
      setMsg(faceSeen ? "Prova de vida falhou — pisque e tente de novo." : "Nenhum rosto detectado. Melhore a luz.");
      return;
    }

    setMsg("Capturando…");
    let descriptor: Float32Array | null = null;
    for (let i = 0; i < 14 && !descriptor; i++) {
      const r = await getDescriptor(video);
      if (r) descriptor = r.descriptor;
      else await sleep(150);
    }
    if (!descriptor) {
      setPhase("ready");
      setMsg("Nenhum rosto detectado. Melhore a luz e tente novamente.");
      return;
    }

    setMsg("Salvando biometria…");
    await faceStore.save(uid, user?.empresaId, descriptor);

    // selfie → bucket avatars → avatar_url
    const frame = await captureFrame(video, true);
    if (frame) {
      const url = await storageService.uploadAvatar(uid, frame);
      if (url) await authService.updateAvatar(uid, url);
    }
    await refreshUser();

    setPhase("done");
    setMsg("Cadastro concluído!");
    toast({ variant: "success", title: "Biometria cadastrada", description: "Tudo pronto para bater ponto." });
    await sleep(1800);
    navigate("/app", { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <Logo size="sm" />

      <div className="mt-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Cadastro facial</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Finalize seu cadastro registrando seu rosto. Ele será usado para validar
          seus pontos e como sua foto de perfil.
        </p>
      </div>

      <div className="mt-10 flex flex-1 flex-col items-center">
        <div className="relative flex items-center justify-center">
          {phase === "capturing" && (
            <span className="absolute size-72 rounded-full bg-primary/10 animate-pulse-ring" />
          )}
          <div
            className={`relative size-60 overflow-hidden rounded-full border-4 shadow-card transition-colors ${
              phase === "done" ? "border-success" : "border-white dark:border-slate-700"
            }`}
          >
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
            {phase === "capturing" && (
              <motion.div
                initial={{ top: "8%" }}
                animate={{ top: ["8%", "88%", "8%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-x-3 h-0.5 rounded-full bg-primary/80 shadow-[0_0_12px_2px] shadow-primary/60"
              />
            )}
            <AnimatePresence>
              {phase === "done" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-success/85 backdrop-blur-sm"
                >
                  <CheckCircle2 className="size-24 text-white" strokeWidth={2.2} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-8 text-center text-[15px] font-medium text-muted-foreground">{msg}</p>
      </div>

      <div className="pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-4">
        {phase === "loading" ? (
          <Button size="lg" className="h-14 w-full" disabled>
            <Loader2 className="size-5 animate-spin" /> Carregando…
          </Button>
        ) : phase === "error" ? (
          <Button size="lg" variant="outline" className="h-14 w-full" onClick={() => window.location.reload()}>
            <RefreshCw className="size-5" /> Tentar novamente
          </Button>
        ) : phase !== "done" ? (
          <Button
            size="lg"
            className="h-14 w-full"
            onClick={capture}
            disabled={phase === "capturing"}
          >
            {phase === "capturing" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <ScanFace className="size-5" /> Capturar meu rosto
              </>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
