import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileBarChart,
  Settings,
  Bell,
  Menu,
  ChevronRight,
  Smartphone,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { isSupabaseEnabled } from "@/lib/supabase/client";
import { initials, cn } from "@/lib/utils";

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/funcionarios", label: "Funcionários", icon: Users },
  { to: "/admin/notificacoes", label: "Notificações", icon: Bell },
  { to: "/admin/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/admin/registros", label: "Registros", icon: ClipboardList },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const backendEnabled = isSupabaseEnabled;
  const [collapsed, setCollapsed] = useState(false);

  const title =
    nav.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)))
      ?.label ?? "Dashboard";

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col bg-slate-900 text-slate-300 transition-all duration-300 md:flex",
          collapsed ? "w-[76px]" : "w-64"
        )}
      >
        <div className="flex h-16 items-center px-4">
          <Logo size="sm" variant="light" className={collapsed ? "[&>div]:hidden" : ""} />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => {
            const active = item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-primary text-white shadow-float"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                  collapsed && "justify-center"
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <button
          onClick={() => navigate("/app")}
          className={cn(
            "mx-3 mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white",
            collapsed && "justify-center"
          )}
        >
          <Smartphone className="size-5 shrink-0" />
          {!collapsed && <span>Ver como funcionário</span>}
        </button>

        <div className={cn("m-3 flex items-center gap-3 rounded-xl bg-slate-800/60 p-3", collapsed && "justify-center")}>
          <Avatar className="size-9">
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback>{initials(user?.name ?? "AD")}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[12px] text-slate-400">Gestor · {user?.company}</p>
            </div>
          )}
          {!collapsed && <ChevronRight className="size-4 text-slate-500" />}
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="rounded-lg border border-border p-2 text-muted-foreground transition hover:bg-secondary"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-semibold lg:flex",
                backendEnabled ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}
            >
              <span className={cn("size-2 rounded-full", backendEnabled ? "bg-success animate-pulse" : "bg-warning")} />
              {backendEnabled ? "Supabase · ao vivo" : "Local"}
            </span>
            <button
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
              className="rounded-lg border border-border px-3 py-2 text-[13px] font-semibold text-muted-foreground transition hover:bg-secondary"
            >
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
