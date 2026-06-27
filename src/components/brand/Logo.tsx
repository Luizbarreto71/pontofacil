import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  /** cor dos traços */
  stroke?: string;
}

/**
 * Ícone da marca: digital biométrica + relógio,
 * exatamente como no mockup do Ponto Fácil.
 */
export function LogoMark({ className, stroke = "currentColor" }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("size-12", className)}
      aria-hidden
    >
      <g
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* arcos da digital */}
        <path d="M9 22a15 15 0 0 1 27-9" opacity={0.95} />
        <path d="M13.5 24a10.5 10.5 0 0 1 18-7.4" opacity={0.95} />
        <path d="M18 26a6 6 0 0 1 9.6-4.8" opacity={0.95} />
        <path d="M10.5 30c.8 3 2.4 5.6 4.6 7.6" opacity={0.95} />
        <path d="M15.5 31.5a8 8 0 0 0 2.7 4.6" opacity={0.95} />
      </g>
      {/* relógio sobreposto */}
      <circle cx="31" cy="31" r="9.2" fill="none" stroke={stroke} strokeWidth={2.4} />
      <path
        d="M31 26.4V31l3 2"
        fill="none"
        stroke={stroke}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  /** "default" usa cores da marca, "light" tudo branco */
  variant?: "default" | "light";
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { mark: "size-8", text: "text-lg" },
  md: { mark: "size-11", text: "text-2xl" },
  lg: { mark: "size-14", text: "text-3xl" },
};

export function Logo({ className, variant = "default", size = "md" }: LogoProps) {
  const s = sizeMap[size];
  const light = variant === "light";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark
        className={s.mark}
        stroke={light ? "#FFFFFF" : "#2563EB"}
      />
      <div className={cn("font-extrabold leading-none tracking-tight", s.text)}>
        <span className={light ? "text-white" : "text-foreground"}>Ponto </span>
        <span className={light ? "text-white/90" : "text-primary"}>Fácil</span>
      </div>
    </div>
  );
}
