import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/brand/Logo";
import { useAuth } from "@/contexts/AuthContext";

export function SplashScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => {
      if (!isAuthenticated) navigate("/login", { replace: true });
      else navigate(user?.isAdmin ? "/admin" : "/app", { replace: true });
    }, 2600);
    return () => clearTimeout(t);
  }, [navigate, isAuthenticated, user?.isAdmin]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark px-6 text-white">
      {/* brilhos de fundo */}
      <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 size-80 rounded-full bg-white/10 blur-3xl" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          className="relative mb-6"
        >
          <span className="absolute -inset-6 rounded-full bg-white/10 blur-xl" />
          <LogoMark className="size-24 drop-shadow-lg" stroke="#FFFFFF" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-4xl font-extrabold tracking-tight"
        >
          Ponto <span className="text-white/90">Fácil</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-2 text-[15px] font-medium text-white/80"
        >
          Controle inteligente de jornada
        </motion.p>
      </motion.div>

      {/* loader circular */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-24 flex flex-col items-center gap-3"
      >
        <span className="size-9 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
        <span className="text-[13px] font-medium text-white/70">Carregando…</span>
      </motion.div>
    </div>
  );
}
