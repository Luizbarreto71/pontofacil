import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageProps {
  children: React.ReactNode;
  className?: string;
}

/** Wrapper de página com fade + slide suave (micro animação de entrada). */
export function Page({ children, className }: PageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn("px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]", className)}
    >
      {children}
    </motion.div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-6 flex items-start justify-between gap-3", className)}>
      <div>
        <h1 className="text-[27px] font-extrabold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}
