import { useCallback, useEffect, useRef, useState } from "react";
import { type Coords, distanceMeters, ipGeolocate, type WorkLocation } from "@/lib/geo";

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
  accuracy: number | null;
  distance: number | null;
  withinRadius: boolean;
  radius: number;
  error: string | null;
  noWorkLocation: boolean;
  /** posição obtida por IP (cidade) — não valida a área do ponto */
  approximate: boolean;
}

export interface GeoResult extends GeoState {
  retry: () => void;
}

function isSecure(): boolean {
  if (typeof window === "undefined") return true;
  if (window.isSecureContext) return true;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

export function useGeolocation(work: WorkLocation | null, active = true): GeoResult {
  const [state, setState] = useState<GeoState>({
    status: "idle",
    coords: null,
    accuracy: null,
    distance: null,
    withinRadius: false,
    radius: work?.radius ?? 150,
    error: null,
    noWorkLocation: !work,
    approximate: false,
  });
  const [attempt, setAttempt] = useState(0);
  const watchId = useRef<number | null>(null);
  const triedLow = useRef(false);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

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

    setState((s) => ({ ...s, status: "locating", noWorkLocation: !work, error: null, approximate: false }));
    triedLow.current = false;
    let cancelled = false;

    const onSuccess = (pos: GeolocationPosition) => {
      if (cancelled) return;
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
        approximate: false,
      });
    };

    const fallbackToIp = async (reason: string) => {
      const c = await ipGeolocate();
      if (cancelled) return;
      if (c) {
        const distance = work ? distanceMeters(c, work) : null;
        setState({
          status: "granted",
          coords: c,
          accuracy: 5000,
          distance,
          withinRadius: false, // IP é coarse: nunca valida a área
          radius: work?.radius ?? 150,
          error: "Localização aproximada (por IP). Para validar a área e bater ponto, use o GPS no celular.",
          noWorkLocation: !work,
          approximate: true,
        });
      } else {
        setState((s) => ({ ...s, status: "error", error: reason }));
      }
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
      if (cancelled) return;
      if (err.code === err.PERMISSION_DENIED) {
        setState((s) => ({
          ...s,
          status: "denied",
          error: "Permissão de localização negada. Toque no cadeado da barra de endereço e permita a localização.",
        }));
        return;
      }
      if (!triedLow.current) {
        triedLow.current = true;
        startWatch(false);
        return;
      }
      // último recurso: aproxima por IP
      void fallbackToIp(
        isMac
          ? "Localização indisponível. No Mac, ative em Ajustes → Privacidade e Segurança → Serviços de Localização e permita o navegador."
          : "Não foi possível obter a localização. Verifique o GPS/sinal e tente novamente."
      );
    };

    startWatch(true);

    return () => {
      cancelled = true;
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [active, work?.lat, work?.lng, work?.radius, attempt]);

  return { ...state, retry };
}
