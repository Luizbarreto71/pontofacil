import { Loader2, MapPin, ShieldCheck, ShieldAlert } from "lucide-react";
import type { GeoState } from "@/hooks/useGeolocation";
import { cn } from "@/lib/utils";

export function gpsLabel(geo: GeoState): { text: string; tone: "ok" | "warn" | "bad" | "load" } {
  if (geo.status === "locating" || geo.status === "idle")
    return { text: "Localizando via GPS…", tone: "load" };
  if (geo.status === "denied")
    return { text: "Permissão de GPS negada", tone: "bad" };
  if (geo.status === "insecure")
    return { text: "GPS exige HTTPS", tone: "bad" };
  if (geo.status === "unsupported" || geo.status === "error")
    return { text: "GPS indisponível", tone: "bad" };
  if (geo.noWorkLocation)
    return { text: "Local de trabalho não configurado", tone: "warn" };
  if (geo.withinRadius)
    return { text: "Dentro da área permitida", tone: "ok" };
  return { text: "Fora da área permitida", tone: "warn" };
}

export function GpsStatusInline({ geo, className }: { geo: GeoState; className?: string }) {
  const { text, tone } = gpsLabel(geo);
  const color =
    tone === "ok"
      ? "text-success"
      : tone === "warn"
      ? "text-warning"
      : tone === "bad"
      ? "text-danger"
      : "text-muted-foreground";
  return (
    <span className={cn("flex items-center gap-1.5 text-[15px] font-semibold", color, className)}>
      {tone === "load" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : tone === "ok" ? (
        <ShieldCheck className="size-4" />
      ) : tone === "warn" ? (
        <ShieldAlert className="size-4" />
      ) : (
        <MapPin className="size-4" />
      )}
      {text}
    </span>
  );
}
