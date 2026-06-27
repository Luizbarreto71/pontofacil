export const LATE_TOLERANCE_MIN = 5;

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export type ShiftStatus =
  | { kind: "before"; minutesTo: number } // antes da entrada
  | { kind: "ontime" } // dentro da tolerância, ainda não bateu
  | { kind: "late"; minutesLate: number } // atrasado e sem entrada registrada
  | { kind: "working" } // já registrou entrada
  | { kind: "after" }; // após a saída

/**
 * Calcula a situação atual do funcionário em relação à jornada.
 * @param clockedIn  já registrou a entrada hoje?
 */
export function shiftStatus(
  now: Date,
  horaEntrada: string,
  horaSaida: string,
  clockedIn: boolean
): ShiftStatus {
  const cur = now.getHours() * 60 + now.getMinutes();
  const entrada = toMinutes(horaEntrada);
  const saida = toMinutes(horaSaida);

  if (clockedIn) return cur > saida ? { kind: "after" } : { kind: "working" };
  if (cur < entrada - 0) return { kind: "before", minutesTo: entrada - cur };
  if (cur <= entrada + LATE_TOLERANCE_MIN) return { kind: "ontime" };
  if (cur > saida) return { kind: "after" };
  return { kind: "late", minutesLate: cur - entrada };
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}
