import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

interface LeafletMapProps {
  className?: string;
  lat: number | null;
  lng: number | null;
  /** raio em metros (desenha o círculo da área permitida) */
  radius?: number;
  /** se true, o pino pode ser arrastado e o clique no mapa reposiciona */
  editable?: boolean;
  onChange?: (lat: number, lng: number) => void;
  zoom?: number;
}

const DEFAULT_CENTER: [number, number] = [-14.235, -51.925]; // Brasil

/** Pino estilizado (sem depender de assets de imagem do Leaflet). */
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;transform:translate(-50%,-100%)">
      <div style="width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2563EB;border:3px solid #fff;box-shadow:0 4px 12px rgba(37,99,235,.45)"></div>
    </div>`,
  iconSize: [22, 22],
  iconAnchor: [0, 0],
});

export function LeafletMap({
  className,
  lat,
  lng,
  radius,
  editable,
  onChange,
  zoom = 16,
}: LeafletMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // init (uma vez)
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      center: lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER,
      zoom: lat != null && lng != null ? zoom : 4,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    if (editable) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onChangeRef.current?.(e.latlng.lat, e.latlng.lng);
      });
    }
    // garante render correto após o layout
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // atualiza marcador/círculo/centro quando muda lat/lng/raio
  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    const pos: [number, number] = [lat, lng];

    if (!markerRef.current) {
      const marker = L.marker(pos, { icon: pinIcon, draggable: !!editable }).addTo(map);
      if (editable) {
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          onChangeRef.current?.(p.lat, p.lng);
        });
      }
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(pos);
    }

    if (radius != null) {
      if (!circleRef.current) {
        circleRef.current = L.circle(pos, {
          radius,
          color: "#2563EB",
          fillColor: "#2563EB",
          fillOpacity: 0.12,
          weight: 2,
        }).addTo(map);
      } else {
        circleRef.current.setLatLng(pos);
        circleRef.current.setRadius(radius);
      }
    }

    map.setView(pos, Math.max(map.getZoom(), 15), { animate: true });
  }, [lat, lng, radius, editable]);

  return <div ref={elRef} className={cn("z-0 overflow-hidden rounded-xl", className)} />;
}
