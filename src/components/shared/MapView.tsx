import { cn } from "@/lib/utils";

interface MapPin {
  id: string;
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  avatarUrl?: string;
  color?: string;
}

interface MapViewProps {
  className?: string;
  pins?: MapPin[];
  /** mostra o pin "você" pulsando no centro */
  showSelf?: boolean;
  label?: string;
}

/**
 * Mapa estilizado (sem chave de API) — ruas vetoriais, blocos e pins.
 * Visual alinhado ao "Mapa em tempo real" do mockup.
 */
export function MapView({ className, pins = [], showSelf, label }: MapViewProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-[#EAF0F7] dark:bg-slate-800/60",
        className
      )}
    >
      {/* blocos / quarteirões */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <defs>
          <pattern id="blocks" width="56" height="56" patternUnits="userSpaceOnUse">
            <rect width="56" height="56" fill="transparent" />
            <rect x="4" y="4" width="22" height="22" rx="3" className="fill-white/70 dark:fill-slate-700/50" />
            <rect x="32" y="4" width="20" height="14" rx="3" className="fill-white/70 dark:fill-slate-700/50" />
            <rect x="32" y="24" width="20" height="28" rx="3" className="fill-white/70 dark:fill-slate-700/50" />
            <rect x="4" y="32" width="22" height="20" rx="3" className="fill-white/70 dark:fill-slate-700/50" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#blocks)" />
        {/* avenidas */}
        <g className="stroke-[#CBD8E8] dark:stroke-slate-600" strokeWidth="6" fill="none">
          <line x1="0" y1="42%" x2="100%" y2="38%" />
          <line x1="35%" y1="0" x2="42%" y2="100%" />
        </g>
        <g className="stroke-[#BFE3C8] dark:stroke-emerald-900/40" strokeWidth="10" fill="none" opacity="0.7">
          <line x1="0%" y1="86%" x2="100%" y2="74%" />
        </g>
      </svg>

      {/* nome da cidade */}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-xs font-semibold uppercase tracking-widest text-slate-400/80">
        {label}
      </span>

      {/* pin "você" */}
      {showSelf && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="absolute -inset-3 rounded-full bg-primary/30 animate-pulse-ring" />
          <span className="relative block size-4 rounded-full border-[3px] border-white bg-primary shadow-float" />
        </div>
      )}

      {/* pins de funcionários */}
      {pins.map((p) => (
        <div
          key={p.id}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <div className="relative flex flex-col items-center">
            <div
              className="flex size-9 items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-white shadow-card"
              style={{ borderColor: p.color }}
            >
              {p.avatarUrl ? (
                <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className="size-full"
                  style={{ background: p.color ?? "#2563EB" }}
                />
              )}
            </div>
            <span
              className="-mt-1 size-2.5 rotate-45 rounded-sm bg-white"
              style={{ background: p.color ?? "#fff" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
