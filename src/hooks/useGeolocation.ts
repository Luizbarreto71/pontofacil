import { useEffect, useRef, useState } from "react";
import { type Coords, distanceMeters, type WorkLocation } from "@/lib/geo";

export type GeoStatus =
  | "idle"
  | "locating"
  | "granted"
  | "denied"
  | "error"
  | "insecure"
  | "unsupported";

export interface GeoState {
  status: GeoStatus;
  coords: Coords | null;
  accuracy: number | null; // metros
  distance: number | null; // metros até o local de trabalho
  withinRadius: boolean;
  radius: number;
  error: string | null;
  noWorkLocation: boolean;
}

function isSecure(): boolean {
  if (typeof window === "undefined") return true;
  if (window.isSecureContext) return true;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/**
 * GPS REAL via navigator.geolocation.
 * - Exige contexto seguro (HTTPS ou localhost) — em HTTP de IP local o navegador bloqueia.
 * - Estratégia tolerante: alta precisão primeiro; em timeout/indisponível, cai para
 *   baixa precisão (ainda permite validar a área de forma aproximada).
 * O local de trabalho vem da empresa (Supabase), em `work`.
 */
export function useGeolocation(work: WorkLocation | null, active = true): GeoState {
  const [state, setState] = useState<GeoState>({
    status: "idle",
    coords: null,
    accuracy: null,
    distance: null,
    withinRadius: false,
    radius: work?.radius ?? 150,
    error: null,
    noWorkLocation: !work,
  });
  const watchId = useRef<number | null>(null);
  const triedLowAccuracy = useRef(false);

  useEffect(() => {
    if (!active) return;

    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "unsupported", error: "GPS não suportado neste dispositivo." }));
      return;
    }
    if (!isSecure()) {
      setState((s) => ({
        ...s,
        status: "insecure",
        error: "O GPS exige HTTPS. Abra o app pelo link publicado (https) — em http de IP local o navegador bloqueia a localização.",
      }));
      return;
    }

    setState((s) => ({ ...s, status: "locating", noWorkLocation: !work, error: null }));
    triedLowAccuracy.current = false;

    const onSuccess = (pos: GeolocationPosition) => {
      const coords: Coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const distance = work ? distanceMeters(coords, work) : null;
      setState({
        status: "granted",
        coords,
        accuracy: pos.coords.accuracy,
        distance,
        withinRadius: work ? distance! <= work.radius : false,
        radius: work?.radius ?? 150,
        error: null,
        noWorkLocation: !work,
      });
    };

    const startWatch = (highAccuracy: boolean) => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 15000 : 25000,
        maximumAge: 15000,
      });
    };

    const onError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setState((s) => ({
          ...s,
          status: "denied",
          error: "Permissão de localização negada. Habilite o acesso à localização para este site.",
        }));
        return;
      }
      // TIMEOUT ou POSITION_UNAVAILABLE → tenta uma vez em baixa precisão
      if (!triedLowAccuracy.current) {
        triedLowAccuracy.current = true;
        startWatch(false);
        return;
      }
      setState((s) => ({
        ...s,
        status: "error",
        error: "Não foi possível obter a localização. Verifique o GPS/sinal e tente novamente.",
      }));
    };

    startWatch(true);

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [active, work?.lat, work?.lng, work?.radius]);

  return state;
}
