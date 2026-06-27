import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Settings,
  KeyRound,
  SlidersHorizontal,
  HelpCircle,
  LogOut,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Page } from "@/components/layout/Page";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import { reportService, formatSaldo } from "@/lib/supabase/reportService";
import { authService } from "@/lib/supabase/authService";
import { storageService, fileToSquareBlob } from "@/lib/supabase/storageService";
import { formatHoursLabel, initials } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { Hourglass, TrendingUp, TrendingDown, Camera, Loader2 } from "lucide-react";

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout, updatePassword, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher a mesma foto de novo
    if (!file || !user?.id) return;
    if (!file.type.startsWith("image/")) {
      toast({ variant: "warning", title: "Selecione uma imagem" });
      return;
    }
    setUploadingPhoto(true);
    try {
      const blob = await fileToSquareBlob(file);
      if (!blob) throw new Error("Falha ao processar a imagem");
      const url = await storageService.uploadAvatar(user.id, blob);
      if (!url) throw new Error("Falha no upload");
      await authService.updateAvatar(user.id, url);
      await refreshUser();
      toast({ variant: "success", title: "Foto atualizada" });
    } catch (err) {
      toast({ variant: "error", title: "Não foi possível atualizar a foto", description: err instanceof Error ? err.message : "" });
    } finally {
      setUploadingPhoto(false);
    }
  };
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [bank, setBank] = useState<{ saldoMin: number; trab: number; dias: number } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const month = new Date().toISOString().slice(0, 7);
    reportService.myBalance(user.id, month).then((b) => setBank(b));
  }, [user?.id]);

  const savePassword = async () => {
    if (pw.length < 6) {
      toast({ variant: "warning", title: "Senha muito curta", description: "Use ao menos 6 caracteres." });
      return;
    }
    if (pw !== pw2) {
      toast({ variant: "warning", title: "As senhas não coincidem" });
      return;
    }
    setSaving(true);
    try {
      await updatePassword(pw);
      toast({ variant: "success", title: "Senha atualizada" });
      setPwOpen(false);
      setPw("");
      setPw2("");
    } catch (e) {
      toast({ variant: "error", title: "Erro ao atualizar", description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  const menu = [
    { icon: KeyRound, label: "Alterar senha", onClick: () => setPwOpen(true) },
    { icon: SlidersHorizontal, label: "Configurações", onClick: () => navigate("/app/configuracoes") },
    { icon: HelpCircle, label: "Ajuda e suporte", onClick: () => {} },
  ];

  return (
    <Page>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Perfil</h1>
        <button
          onClick={() => navigate("/app/configuracoes")}
          className="rounded-full border border-border bg-card p-2.5 shadow-soft"
        >
          <Settings className="size-5" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center"
      >
        <div className="relative">
          <Avatar className="size-24 border-4 border-card shadow-card">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className="text-2xl">{initials(user?.name ?? "")}</AvatarFallback>
          </Avatar>
          {/* botão de trocar foto (galeria/câmera) */}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-white shadow-float transition active:scale-95"
            aria-label="Trocar foto"
          >
            {uploadingPhoto ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickPhoto}
          />
        </div>
        <h2 className="mt-4 text-xl font-bold">{user?.name}</h2>
        <p className="text-[15px] text-muted-foreground">{user?.role}</p>
        {user?.company && <p className="text-[13px] text-muted-foreground">{user.company}</p>}
      </motion.div>

      {/* Banco de horas do mês */}
      {bank && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <Card className="flex items-center gap-4 p-4">
            <div className={`flex size-12 items-center justify-center rounded-xl ${bank.saldoMin >= 0 ? "bg-success/12" : "bg-danger/12"}`}>
              <Hourglass className={`size-6 ${bank.saldoMin >= 0 ? "text-success" : "text-danger"}`} />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-medium text-muted-foreground">Banco de horas · este mês</p>
              <p className={`flex items-center gap-1.5 text-2xl font-extrabold tabular-nums ${bank.saldoMin >= 0 ? "text-success" : "text-danger"}`}>
                {bank.saldoMin >= 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                {formatSaldo(bank.saldoMin)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[12px] text-muted-foreground">Trabalhadas</p>
              <p className="text-[15px] font-bold tabular-nums">{formatHoursLabel(bank.trab)}</p>
              <p className="text-[11px] text-muted-foreground">{bank.dias} dias</p>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="mt-6 space-y-3">
        {user?.isAdmin && (
          <Card className="p-0">
            <button
              onClick={() => navigate("/admin")}
              className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:bg-secondary/50"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <LayoutDashboard className="size-5 text-primary" />
              </span>
              <span className="flex-1 text-[15px] font-semibold text-primary">Painel do gestor</span>
              <ChevronRight className="size-5 text-primary/60" />
            </button>
          </Card>
        )}

        <Card className="divide-y divide-border p-0">
          {menu.map((m) => (
            <button
              key={m.label}
              onClick={m.onClick}
              className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:bg-secondary/50"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-secondary">
                <m.icon className="size-5 text-foreground" />
              </span>
              <span className="flex-1 text-[15px] font-medium">{m.label}</span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          ))}
        </Card>

        <Card className="p-0">
          <button
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
            className="flex w-full items-center gap-3.5 px-4 py-4 text-left transition active:bg-danger/5"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-danger/10">
              <LogOut className="size-5 text-danger" />
            </span>
            <span className="flex-1 text-[15px] font-semibold text-danger">Sair</span>
            <ChevronRight className="size-5 text-danger/60" />
          </button>
        </Card>
      </div>

      <p className="mt-6 text-center text-[12px] text-muted-foreground">Ponto Fácil · versão 1.0.0</p>

      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>Defina uma nova senha de acesso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar senha</Label>
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
            </div>
            <Button className="w-full" onClick={savePassword} disabled={saving}>
              {saving ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
