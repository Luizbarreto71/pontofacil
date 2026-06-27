import { forwardRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Mail,
  Lock,
  User,
  Briefcase,
  Check,
  ScanFace,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const companySchema = z.object({
  company: z.string().min(2, "Informe o nome da empresa"),
  segment: z.string().min(2, "Informe o segmento"),
});
const personSchema = z.object({
  name: z.string().min(2, "Informe seu nome completo"),
  role: z.string().min(2, "Informe seu cargo"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

type CompanyForm = z.infer<typeof companySchema>;
type PersonForm = z.infer<typeof personSchema>;

const steps = ["Empresa", "Funcionário", "Biometria"];

export function RegisterScreen() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState<CompanyForm | null>(null);

  const companyForm = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: { company: "", segment: "" },
  });
  const personForm = useForm<PersonForm>({
    resolver: zodResolver(personSchema),
    defaultValues: { name: "", role: "", email: "", password: "" },
  });

  const onCompany = (data: CompanyForm) => {
    setCompany(data);
    setStep(1);
  };
  const onPerson = () => setStep(2);

  const finish = async () => {
    const person = personForm.getValues();
    try {
      await signUp({
        name: person.name,
        role: person.role,
        email: person.email,
        password: person.password,
        company: company?.company ?? "",
        segment: company?.segment ?? "",
      });
      toast({
        variant: "success",
        title: "Conta criada com sucesso!",
        description: `${company?.company} está pronta para usar o Ponto Fácil.`,
      });
      navigate("/app", { replace: true });
    } catch (e) {
      toast({
        variant: "error",
        title: "Não foi possível criar a conta",
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center gap-3 px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <button
          onClick={() => (step === 0 ? navigate("/login") : setStep((s) => s - 1))}
          className="rounded-xl border border-border bg-card p-2.5 shadow-soft"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Logo size="sm" />
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-2 px-6 pt-7">
        {steps.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-border"
              )}
            />
            <span
              className={cn(
                "text-[11px] font-semibold",
                i <= step ? "text-primary" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col px-6 pt-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="company"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="flex flex-1 flex-col"
            >
              <h1 className="text-2xl font-extrabold tracking-tight">Sua empresa</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Crie o espaço da sua organização
              </p>
              <form
                onSubmit={companyForm.handleSubmit(onCompany)}
                className="mt-7 flex flex-1 flex-col space-y-5"
              >
                <Field
                  label="Nome da empresa"
                  icon={<Building2 />}
                  placeholder="Loja Exemplo"
                  error={companyForm.formState.errors.company?.message}
                  {...companyForm.register("company")}
                />
                <Field
                  label="Segmento"
                  icon={<Briefcase />}
                  placeholder="Varejo, Clínica, Restaurante…"
                  error={companyForm.formState.errors.segment?.message}
                  {...companyForm.register("segment")}
                />
                <Button type="submit" size="lg" className="mt-auto w-full">
                  Continuar <ArrowRight />
                </Button>
              </form>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="person"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="flex flex-1 flex-col"
            >
              <h1 className="text-2xl font-extrabold tracking-tight">Seus dados</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Você será o administrador da conta
              </p>
              <form
                onSubmit={personForm.handleSubmit(onPerson)}
                className="mt-7 flex flex-1 flex-col space-y-5"
              >
                <Field
                  label="Nome completo"
                  icon={<User />}
                  placeholder="João Silva"
                  error={personForm.formState.errors.name?.message}
                  {...personForm.register("name")}
                />
                <Field
                  label="Cargo"
                  icon={<Briefcase />}
                  placeholder="Gerente"
                  error={personForm.formState.errors.role?.message}
                  {...personForm.register("role")}
                />
                <Field
                  label="E-mail"
                  type="email"
                  icon={<Mail />}
                  placeholder="seu@email.com"
                  error={personForm.formState.errors.email?.message}
                  {...personForm.register("email")}
                />
                <Field
                  label="Senha"
                  type="password"
                  icon={<Lock />}
                  placeholder="••••••••"
                  error={personForm.formState.errors.password?.message}
                  {...personForm.register("password")}
                />
                <Button type="submit" size="lg" className="mt-auto w-full">
                  Continuar <ArrowRight />
                </Button>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="bio"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="flex flex-1 flex-col"
            >
              <h1 className="text-2xl font-extrabold tracking-tight">Tudo pronto!</h1>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Você poderá cadastrar sua biometria facial no primeiro acesso.
              </p>

              <div className="mt-8 flex flex-1 flex-col items-center justify-center gap-6">
                <div className="flex size-28 items-center justify-center rounded-full bg-primary/10">
                  <ScanFace className="size-14 text-primary" />
                </div>
                <ul className="w-full max-w-xs space-y-3">
                  {[
                    "Empresa criada",
                    "Administrador configurado",
                    "Reconhecimento facial disponível",
                    "GPS e WhatsApp ativados",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-3 text-[15px]">
                      <span className="flex size-6 items-center justify-center rounded-full bg-success/15 text-success">
                        <Check className="size-4" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <Button size="lg" className="mb-8 mt-auto w-full" onClick={finish}>
                Acessar o Ponto Fácil <ArrowRight />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: React.ReactNode;
  error?: string;
}
const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, icon, error, ...props }, ref) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input icon={icon} ref={ref} {...props} />
      {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
    </div>
  )
);
Field.displayName = "Field";
