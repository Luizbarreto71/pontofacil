import { cn } from "@/lib/utils";

const DAYS = ["D", "S", "T", "Q", "Q", "S", "S"]; // 0=Dom..6=Sáb
const FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface WeekdayPickerProps {
  value: number[]; // [0..6]
  onChange: (days: number[]) => void;
}

export function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const toggle = (d: number) => {
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort());
  };
  return (
    <div className="flex gap-1.5">
      {DAYS.map((label, d) => {
        const active = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            title={FULL[d]}
            onClick={() => toggle(d)}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg text-[13px] font-bold transition",
              active
                ? "bg-primary text-white shadow-soft"
                : "bg-secondary text-muted-foreground hover:bg-secondary/70"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Resumo legível dos dias (ex.: "Seg–Sáb", "Seg, Qua, Sex"). */
export function summarizeDays(days: number[]): string {
  if (!days?.length) return "—";
  const sorted = [...days].sort((a, b) => a - b);
  const abbr = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  // detecta sequência contínua
  const isRange = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  if (isRange && sorted.length >= 3) return `${abbr[sorted[0]]}–${abbr[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => abbr[d]).join(", ");
}
