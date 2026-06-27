import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Clock3, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", label: "Início", icon: Home, end: true, badge: undefined as number | undefined },
  { to: "/app/historico", label: "Histórico", icon: Clock3, badge: undefined },
  { to: "/app/perfil", label: "Perfil", icon: User, badge: undefined },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md">
      <div className="glass safe-bottom border-t border-border/70 px-2 pt-2">
        <ul className="flex items-stretch justify-around">
          {items.map((item) => {
            const active =
              item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className="relative flex flex-col items-center gap-1 py-1.5"
                >
                  <span className="relative">
                    <Icon
                      className={cn(
                        "size-[22px] transition-colors",
                        active ? "text-primary" : "text-muted-foreground"
                      )}
                      strokeWidth={active ? 2.4 : 2}
                    />
                    {item.badge && !active && (
                      <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium transition-colors",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute -top-2 h-1 w-8 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
