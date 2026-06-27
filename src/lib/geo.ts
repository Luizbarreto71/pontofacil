export interface Coords {
  lat: number;
  lng: number;
}

export interface WorkLocation extends Coords {
  label: string;
  radius: number; // metros
}

/** Distância em metros entre dois pontos (fórmula de Haversine). */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface PhotonProps {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  district?: string;
  locality?: string;
  state?: string;
  postcode?: string;
}

function formatPhoton(p: PhotonProps): string {
  const street = p.street
    ? `${p.street}${p.housenumber ? `, ${p.housenumber}` : ""}`
    : p.name;
  const bairro = p.district ?? p.locality ?? "";
  const city = p.city ?? "";
  return [street, bairro, city, p.state].filter(Boolean).join(", ");
}

/**
 * Geocoding via Photon (komoot) — gratuito, sem chave e com CORS habilitado.
 * (O Nominatim não envia headers CORS e é bloqueado no navegador.)
 */

/**
 * Reverse geocoding: coordenadas → endereço de RUA legível.
 * Busca vários candidatos e prioriza um com rua/número (evita devolver o nome
 * de um POI aleatório próximo).
 */
export async function reverseGeocode(c: Coords): Promise<string> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/reverse?lon=${c.lng}&lat=${c.lat}&limit=8&lang=default`
    );
    if (!res.ok) throw new Error("geocode");
    const data = await res.json();
    const feats: Array<{ properties: PhotonProps & { osm_key?: string } }> = data.features ?? [];
    if (!feats.length) throw new Error("empty");

    // 1º: feature com rua + número · 2º: feature com rua · 3º: primeira
    const withNumber = feats.find((f) => f.properties.street && f.properties.housenumber);
    const withStreet = feats.find((f) => f.properties.street);
    const best = withNumber ?? withStreet ?? feats[0];
    return formatPhoton(best.properties) || `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
  } catch {
    return `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
  }
}

/**
 * Localização aproximada por IP (cidade) — usada só como fallback quando o GPS
 * do navegador falha (ex.: Serviços de Localização desligados no desktop).
 * HTTPS + CORS, sem chave. NÃO serve para validar a área do ponto (é coarse).
 */
export async function ipGeolocate(): Promise<Coords | null> {
  try {
    const res = await fetch("https://ipwho.is/");
    const d = await res.json();
    if (d && d.success !== false && typeof d.latitude === "number") {
      return { lat: d.latitude, lng: d.longitude };
    }
  } catch {
    /* ignora */
  }
  return null;
}

export interface GeocodeResult extends Coords {
  endereco: string;
}

/** Forward geocoding: endereço (texto) → coordenadas. */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=default`
    );
    if (!res.ok) throw new Error("geocode");
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) return null;
    const [lng, lat] = f.geometry.coordinates as [number, number];
    return { lat, lng, endereco: formatPhoton(f.properties) || query };
  } catch {
    return null;
  }
}
