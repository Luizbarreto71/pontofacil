import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  UserPlus, Search, ScanFace, Trash2, Copy, Check, Mail, KeyRound, Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import { employeeService, type EmployeeRow } from "@/lib/supabase/employeeService";
import { initials } from "@/lib/utils";

function genPassword(): string {
  const s = "abcdefghijkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 8; i++) p += s[Math.floor((i * 7 + Date.now()) % s.length)];
  return p + "!";
}

export function EmployeesView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const empresaId = user?.empresaId;

  const [list, setList] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({ nome: "", email: "", cargo: "", senha: "" });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; senha: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    setList(await employeeService.list(empresaId));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaId]);

  const openNew = () => {
    setForm({ nome: "", email: "", cargo: "", senha: genPassword() });
    setCreated(null);
    setOpen(true);
  };

  const submit = async () => {
    if (!empresaId) return;
    if (!form.nome || !form.email || form.senha.length < 6) {
      toast({ variant: "warning", title: "Preencha nome, e-mail e senha (mín. 6)" });
      return;
    }
    setSaving(true);
    try {
      await employeeService.create({ ...form, empresaId });
      setCreated({ email: form.email, senha: form.senha });
      await load();
      toast({ variant: "success", title: "Funcionário criado", description: "Repasse o login para ele finalizar o cadastro facial." });
    } catch (e) {
      toast({ variant: "error", title: "Erro ao criar", description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  const removeEmp = async (emp: EmployeeRow) => {
    if (!confirm(`Remover ${emp.nome}?`)) return;
    try {
      await employeeService.remove(emp.id);
      setList((l) => l.filter((x) => x.id !== emp.id));
      toast({ variant: "info", title: "Funcionário removido" });
    } catch (e) {
      toast({ variant: "error", title: "Erro ao remover", description: e instanceof Error ? e.message : "" });
    }
  };

  const copyCreds = () => {
    if (!created) return;
    navigator.clipboard.writeText(`Acesso Ponto Fácil\nE-mail: ${created.email}\nSenha: ${created.senha}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const filtered = list.filter(
    (e) => e.nome.toLowerCase().includes(query.toLowerCase()) || (e.email ?? "").includes(query)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="sm:max-w-xs"
          icon={<Search />}
          placeholder="Buscar funcionário…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={openNew}>
          <UserPlus className="size-[18px]" /> Adicionar funcionário
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <UserPlus className="size-9 text-muted-foreground/50" />
            <p className="text-[15px] font-semibold">Nenhum funcionário</p>
            <p className="text-[13px] text-muted-foreground">Adicione o primeiro funcionário da sua equipe.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e, i) => (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Avatar className="size-10">
                  <AvatarImage src={e.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(e.nome)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{e.nome}</p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {e.cargo || "—"} · {e.email}
                  </p>
                </div>
                {e.faceEnrolled ? (
                  <Badge variant="success"><ScanFace className="size-3.5" /> Facial OK</Badge>
                ) : (
                  <Badge variant="warning"><ScanFace className="size-3.5" /> Pendente</Badge>
                )}
                <span className="hidden w-16 text-right font-mono text-[13px] tabular-nums text-muted-foreground sm:block">
                  {e.lastPunch ?? "--:--"}
                </span>
                {e.role === "funcionario" && (
                  <button
                    onClick={() => removeEmp(e)}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{created ? "Login do funcionário" : "Adicionar funcionário"}</DialogTitle>
            <DialogDescription>
              {created
                ? "Repasse estas credenciais. Ele faz login, troca a senha e cadastra o rosto."
                : "Crie o acesso. O funcionário finaliza com o cadastro facial."}
            </DialogDescription>
          </DialogHeader>

          {created ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
                <p className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> <span className="font-mono">{created.email}</span></p>
                <p className="mt-2 flex items-center gap-2"><KeyRound className="size-4 text-muted-foreground" /> <span className="font-mono">{created.senha}</span></p>
              </div>
              <Button variant="outline" className="w-full" onClick={copyCreds}>
                {copied ? <><Check className="size-4" /> Copiado!</> : <><Copy className="size-4" /> Copiar credenciais</>}
              </Button>
              <Button className="w-full" onClick={() => setOpen(false)}>Concluir</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Maria Santos" />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Caixa" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@empresa.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Senha temporária</Label>
                <Input value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
              </div>
              <Button className="w-full" onClick={submit} disabled={saving}>
                {saving ? <><Loader2 className="size-4 animate-spin" /> Criando…</> : <><UserPlus className="size-[18px]" /> Criar acesso</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
