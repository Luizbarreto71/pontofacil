import { useEffect, useState } from "react";
import { MapPin, Search, Loader2, Check, Save, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeafletMap } from "@/components/shared/LeafletMap";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/components/ui/toast";
import { companyService } from "@/lib/supabase/companyService";
import { geocodeAddress, reverseGeocode } from "@/lib/geo";

export function CompanyConfigView() {
  const { user } = useAuth();
  const { refresh } = useCompany();
  const { toast } = useToast();
  const empresaId = user?.empresaId;

  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(150);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast({ variant: "error", title: "GPS indisponível neste dispositivo" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        setAddress(await reverseGeocode(c));
        setLocating(false);
        toast({
          variant: "success",
          title: "Localização capturada",
          description: `Precisão de ${Math.round(pos.coords.accuracy)} m`,
        });
      },
      (err) => {
        setLocating(false);
        toast({
          variant: "error",
          title: "Não foi possível obter a localização",
          description:
            err.code === err.PERMISSION_DENIED
              ? "Permita o acesso à localização."
              : "Ative o GPS e tente novamente (ideal pelo celular).",
        });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => {
    if (!empresaId) return;
    companyService.getEmpresa(empresaId).then((e) => {
      if (!e) return;
      setAddress(e.endereco ?? "");
      setRadius(e.raio_gps ?? 150);
      if (e.lat != null && e.lng != null) setCoords({ lat: e.lat, lng: e.lng });
    });
  }, [empresaId]);

  const search = async () => {
    if (!address.trim()) return;
    setSearching(true);
    const res = await geocodeAddress(address);
    setSearching(false);
    if (!res) {
      toast({ variant: "warning", title: "Endereço não encontrado", description: "Tente ser mais específico (rua, número, cidade)." });
      return;
    }
    setCoords({ lat: res.lat, lng: res.lng });
    setAddress(res.endereco);
    toast({ variant: "success", title: "Local encontrado", description: res.endereco });
  };

  const save = async () => {
    if (!empresaId || !coords) {
      toast({ variant: "warning", title: "Busque um endereço primeiro" });
      return;
    }
    setSaving(true);
    try {
      await companyService.updateLocation(empresaId, {
        endereco: address,
        lat: coords.lat,
        lng: coords.lng,
        raio_gps: radius,
      });
      await refresh();
      toast({ variant: "success", title: "Localização salva", description: "Os funcionários já validam o ponto por aqui." });
    } catch (e) {
      toast({ variant: "error", title: "Erro ao salvar", description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Local de trabalho</h2>
            <p className="text-[13px] text-muted-foreground">
              Endereço da loja usado para validar o GPS dos funcionários.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Endereço da loja</Label>
          <div className="flex gap-2">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Av. Paulista, 1000 — São Paulo"
            />
            <Button variant="outline" className="shrink-0" onClick={search} disabled={searching}>
              {searching ? <Loader2 className="size-[18px] animate-spin" /> : <Search className="size-[18px]" />}
              Buscar
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-primary"
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
            Usar minha localização atual
          </Button>
        </div>

        <div className="mt-4">
          <LeafletMap
            className="h-64 w-full border border-border"
            lat={coords?.lat ?? null}
            lng={coords?.lng ?? null}
            radius={radius}
            editable
            onChange={(lat, lng) => setCoords({ lat, lng })}
          />
          {coords ? (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-success">
              <Check className="size-3.5" /> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} · arraste o pino para ajustar
            </p>
          ) : (
            <p className="mt-2 text-[12px] text-muted-foreground">
              Busque um endereço ou toque no mapa para marcar a loja.
            </p>
          )}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <Label>Raio permitido</Label>
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[13px] font-bold text-primary">{radius} m</span>
          </div>
          <input
            type="range" min={50} max={500} step={10} value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>50 m</span><span>500 m</span>
          </div>
        </div>

        <Button className="mt-6 w-full sm:w-auto" onClick={save} disabled={saving || !coords}>
          {saving ? <><Loader2 className="size-[18px] animate-spin" /> Salvando…</> : <><Save className="size-[18px]" /> Salvar localização</>}
        </Button>
      </div>
    </div>
  );
}
