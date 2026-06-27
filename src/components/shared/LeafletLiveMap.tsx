import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

export interface LiveMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  avatarUrl?: string;
  color?: string;
}

interface LeafletLiveMapProps {
  className?: string;
  markers: LiveMarker[];
  /** centro/zoom inicial quando não há marcadores */
  fallback?: { lat: number; lng: number; zoom?: number };
}

function markerIcon(m: LiveMarker): L.DivIcon {
  const color = m.color ?? "#2563EB";
  const inner = m.avatarUrl
    ? `<img src="${m.avatarUrl}" style="width:100%;height:100%;object-fit:cover" />`
    : `<div style="width:100%;height:100%;background:${color}"></div>`;
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;transform:translate(-50%,-100%)">
        <div style="width:34px;height:34px;border-radius:50%;overflow:hidden;border:3px solid ${color};box-shadow:0 4px 12px rgba(16,24,40,.25);background:#fff">${inner}</div>
        <div style="width:10px;height:10px;background:${color};transform:translateX(12px) rotate(45deg);margin-top:-6px;border-radius:2px"></div>
      </div>`,
    iconSize: [34, 44],
    iconAnchor: [0, 0],
  });
}

/** Mapa Leaflet com vários marcadores (posições reais), atualiza em tempo real. */
export function LeafletLiveMap({ className, markers, fallback }: LeafletLiveMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      center: fallback ? [fallback.lat, fallback.lng] : [-14.235, -51.925],
      zoom: fallback?.zoom ?? 4,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 100);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (markers.length === 0) return;

    const pts: [number, number][] = [];
    for (const m of markers) {
      L.marker([m.lat, m.lng], { icon: markerIcon(m) })
        .bindPopup(`<b>${m.label}</b>${m.sublabel ? `<br/>${m.sublabel}` : ""}`)
        .addTo(layer);
      pts.push([m.lat, m.lng]);
    }
    if (pts.length === 1) {
      map.setView(pts[0], 16, { animate: true });
    } else {
      map.fitBounds(L.latLngBounds(pts).pad(0.3), { animate: true, maxZoom: 16 });
    }
  }, [markers]);

  return <div ref={elRef} className={cn("z-0 overflow-hidden rounded-xl", className)} />;
}
