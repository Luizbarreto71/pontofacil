import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Coffee, Undo2, LogOut, BellOff, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppIcon } from "@/components/brand/WhatsAppIcon";
import { useAuth } from "@/contexts/AuthContext";
import { notificationsService, type AdminNotification } from "@/lib/supabase/notificationsService";
import { punchMeta } from "@/lib/punch-meta";
import type { PunchType } from "@/types";

const icon: Record<string, React.ReactNode> = {
  entrada: <LogIn className="size-5" />,
  intervalo: <Coffee className="size-5" />,
  retorno: <Undo2 className="size-5" />,
  saida: <LogOut className="size-5" />,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function NotificationsView() {
  const { user } = useAuth();
  const empresaId = user?.empresaId;
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    let active = true;
    const load = () => notificationsService.list(empresaId).then((d) => {
      if (active) { setItems(d); setLoading(false); }
    });
    load();
    const unsub = notificationsService.subscribe(empresaId, load); // tempo real
    return () => { active = false; unsub(); };
  }, [empresaId]);

  return (
    <div className="max-w-2xl space-y-3">
      {loading ? (
        [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-card/60 py-16 text-center">
          <BellOff className="size-9 text-muted-foreground/50" />
          <p className="text-[15px] font-semibold">Sem notificações</p>
          <p className="text-[13px] text-muted-foreground">As notificações de ponto aparecerão aqui.</p>
        </div>
      ) : (
        items.map((n, i) => {
          const isLate = n.tipo === "atraso";
          const meta = n.tipo in punchMeta ? punchMeta[n.tipo as PunchType] : null;
          const bg = isLate ? "#F59E0B" : meta?.hex ?? "#2563EB";
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-start gap-3.5 rounded-2xl border border-border/60 bg-card p-4 shadow-card"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: bg }}>
                {isLate ? <AlertTriangle className="size-5" /> : meta ? icon[n.tipo] : <WhatsAppIcon className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-semibold leading-snug">{n.mensagem}</p>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  {isLate ? (
                    <><AlertTriangle className="size-3.5 text-warning" /> Alerta de atraso</>
                  ) : (
                    <><WhatsAppIcon className="size-3.5 text-[#25D366]" /> Via WhatsApp</>
                  )}
                </p>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
