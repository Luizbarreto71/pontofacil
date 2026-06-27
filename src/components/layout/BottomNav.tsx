import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Clock3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", label: "Início", icon: Home, end: true },
  { to: "/app/historico", label: "Histórico", icon: Clock3, end: false },
  { to: "/app/perfil", label: "Perfil", icon: User, end: false },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="glass pointer-events-auto flex items-center justify-around rounded-[22px] border border-border/60 px-1.5 py-1.5 shadow-float">
        {items.map((item) => {
          const active = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-2xl bg-primary/10"
                />
              )}
              <Icon
                className={cn(
                  "relative size-[22px] transition-all duration-200",
                  active ? "scale-110 text-primary" : "text-muted-foreground"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={cn(
                  "relative text-[11px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
