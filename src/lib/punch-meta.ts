import type { PunchType } from "@/types";

interface PunchMeta {
  label: string;
  /** classe de cor do ponto/dot */
  dot: string;
  text: string;
  bg: string;
  hex: string;
}

/** Cada tipo de registro tem cor própria (verde, laranja, azul, vermelho). */
export const punchMeta: Record<PunchType, PunchMeta> = {
  entrada: { label: "Entrada", dot: "bg-success", text: "text-success", bg: "bg-success/12", hex: "#16A34A" },
  intervalo: { label: "Intervalo", dot: "bg-warning", text: "text-warning", bg: "bg-warning/15", hex: "#F59E0B" },
  retorno: { label: "Retorno", dot: "bg-primary", text: "text-primary", bg: "bg-primary/12", hex: "#2563EB" },
  saida: { label: "Saída", dot: "bg-danger", text: "text-danger", bg: "bg-danger/12", hex: "#DC2626" },
};

export const punchVerb: Record<PunchType, string> = {
  entrada: "registrou entrada",
  intervalo: "iniciou intervalo",
  retorno: "retornou do intervalo",
  saida: "encerrou o expediente",
};
