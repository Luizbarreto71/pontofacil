import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Moon,
  Languages,
  ScanFace,
  Eye,
  Fingerprint,
  Hourglass,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/layout/Page";
import { WhatsAppIcon } from "@/components/brand/WhatsAppIcon";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { faceStore } from "@/lib/face/faceStore";
import type { AppSettings } from "@/types";

export function SettingsScreen() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const { toast } = useToast();
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const [faceEnrolled, setFaceEnrolled] = useState(faceStore.hasEnrolled(uid));

  const resetFace = async () => {
    await faceStore.clear(uid);
    setFaceEnrolled(false);
    toast({ variant: "info", title: "Biometria removida", description: "Será solicitada no próximo acesso." });
    navigate("/app/cadastro-facial");
  };

  const toggles: { key: keyof AppSettings; icon: React.ReactNode; label: string; desc: string }[] = [
    { key: "darkMode", icon: <Moon className="size-5" />, label: "Modo escuro", desc: "Tema escuro do aplicativo" },
    { key: "faceRecognition", icon: <ScanFace className="size-5" />, label: "Reconhecimento facial", desc: "Exigir face ao bater ponto" },
    { key: "liveness", icon: <Eye className="size-5" />, label: "Prova de vida", desc: "Exigir piscar (anti-fraude com foto)" },
    { key: "whatsapp", icon: <WhatsAppIcon className="size-5" />, label: "Notificações WhatsApp", desc: "Avisar o gestor a cada registro" },
    { key: "biometrics", icon: <Fingerprint className="size-5" />, label: "Biometria", desc: "Desbloqueio por digital" },
    { key: "hoursBank", icon: <Hourglass className="size-5" />, label: "Banco de horas", desc: "Calcular saldo automaticamente" },
  ];

  return (
    <Page>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-xl border border-border bg-card p-2.5 shadow-soft">
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Configurações</h1>
      </div>

      <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        Preferências
      </p>
      <Card className="mb-5 p-0">
        <div className="flex items-center gap-3.5 px-4 py-3.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-foreground">
            <Languages className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">Idioma</p>
            <p className="text-[12px] text-muted-foreground">Idioma do aplicativo</p>
          </div>
          <div className="w-36">
            <Select
              value={settings.language}
              onChange={(e) => update("language", e.target.value as AppSettings["language"])}
            >
              <option value="pt-BR">Português</option>
              <option value="en-US">English</option>
              <option value="es-ES">Español</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3.5 border-t border-border px-4 py-3.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-foreground">
            <ScanFace className="size-5" />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-medium">Biometria facial</p>
            <p className="text-[12px] text-muted-foreground">
              {faceEnrolled ? "Rosto cadastrado" : "Nenhum rosto cadastrado"}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary" onClick={resetFace}>
            {faceEnrolled ? "Refazer" : "Cadastrar"}
          </Button>
        </div>
      </Card>

      <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        Segurança & Notificações
      </p>
      <Card className="divide-y divide-border p-0">
        {toggles.map((t) => (
          <div key={t.key} className="flex items-center gap-3.5 px-4 py-3.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-foreground">
              {t.icon}
            </span>
            <div className="flex-1">
              <p className="text-[15px] font-medium">{t.label}</p>
              <p className="text-[12px] text-muted-foreground">{t.desc}</p>
            </div>
            <Switch
              checked={settings[t.key] as boolean}
              onCheckedChange={(v) => update(t.key, v as never)}
            />
          </div>
        ))}
      </Card>
    </Page>
  );
}
