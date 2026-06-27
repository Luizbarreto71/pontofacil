import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/brand/GoogleIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";

const schema = z.object({
  email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export function LoginScreen() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loading, backendEnabled } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // No modo Supabase começamos com campos vazios (o usuário mock não existe lá)
    defaultValues: backendEnabled
      ? { email: "", password: "" }
      : { email: "joao.silva@lojaexemplo.com", password: "123456" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const u = await login(values.email, values.password);
      toast({ variant: "success", title: "Bem-vindo de volta!", description: "Login realizado com sucesso." });
      navigate(u.isAdmin ? "/admin" : "/app", { replace: true });
    } catch (e) {
      toast({
        variant: "error",
        title: "Não foi possível entrar",
        description:
          e instanceof Error && /invalid/i.test(e.message)
            ? "E-mail ou senha incorretos. Não tem conta? Cadastre-se."
            : e instanceof Error
            ? e.message
            : "Tente novamente.",
      });
    }
  };

  const onGoogle = async () => {
    await loginWithGoogle();
    navigate("/app", { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* topo com leve degradê da marca */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent px-6 pb-2 pt-[calc(env(safe-area-inset-top)+3rem)]">
        <Logo size="md" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-1 flex-col px-6 pt-8"
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Bem-vindo!
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">
          Faça login para continuar
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              icon={<Mail />}
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-[13px] font-medium text-danger">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              icon={<Lock />}
              autoComplete="current-password"
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="rounded-md p-1.5 text-muted-foreground transition hover:text-foreground"
                  aria-label="Mostrar senha"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              }
              {...register("password")}
            />
            {errors.password && (
              <p className="text-[13px] font-medium text-danger">{errors.password.message}</p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-[13px] font-semibold text-primary hover:underline"
              >
                Esqueceu sua senha?
              </button>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <>
                Entrar
                <ArrowRight />
              </>
            )}
          </Button>
        </form>

        <div className="my-7 flex items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[13px] text-muted-foreground">Ou continue com</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onGoogle}
          disabled={loading}
        >
          <GoogleIcon className="size-5" />
          Google
        </Button>

        <p className="mb-8 mt-auto pt-8 text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <button
            onClick={() => navigate("/cadastro")}
            className="font-semibold text-primary hover:underline"
          >
            Cadastre-se
          </button>
        </p>
      </motion.div>
    </div>
  );
}
