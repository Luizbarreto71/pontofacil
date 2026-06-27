import { useEffect, useRef, useState } from "react";
import { type Coords, distanceMeters, type WorkLocation } from "@/lib/geo";

export type GeoStatus =
  | "idle"
  | "locating"
  | "granted"
  | "denied"
  | "error"
  | "unsupported";

export interface GeoState {
  status: GeoStatus;
  coords: Coords | null;
  accuracy: number | null; // metros
  distance: number | null; // metros até o local de trabalho
  withinRadius: boolean;
  radius: number;
  error: string | null;
  /** empresa ainda não configurou um local de trabalho */
  noWorkLocation: boolean;
}

/**
 * GPS REAL via navigator.geolocation (watchPosition, alta precisão).
 * O local de trabalho vem da empresa (Supabase), passado por `work`.
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

  useEffect(() => {
    if (!active) return;
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "unsupported", error: "GPS não suportado" }));
      return;
    }

    setState((s) => ({ ...s, status: "locating", noWorkLocation: !work }));

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
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
      },
      (err) => {
        setState((s) => ({
          ...s,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          error:
            err.code === err.PERMISSION_DENIED
              ? "Permissão de localização negada"
              : "Não foi possível obter a localização",
        }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [active, work?.lat, work?.lng, work?.radius]);

  return state;
}
