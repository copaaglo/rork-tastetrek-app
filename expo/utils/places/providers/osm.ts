import type { LatLng, Place } from "@/utils/places/types";

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function makeFoodPhotoUrl(seed: string): string {
  const q = encodeURIComponent(seed || "fast food");
  return `https://source.unsplash.com/1200x900/?${q},food`;
}

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

function pickLabel(tags: Record<string, string> | undefined): string {
  const brand = tags?.brand;
  const name = tags?.name;
  return (name ?? brand ?? "Fast food spot").trim();
}

function pickCuisine(tags: Record<string, string> | undefined): string | null {
  const cuisine = tags?.cuisine;
  if (!cuisine) return null;
  return cuisine.replace(/_/g, " ");
}

function pickAddress(tags: Record<string, string> | undefined): string {
  const parts: string[] = [];
  const hn = tags?.["addr:housenumber"];
  const street = tags?.["addr:street"];
  const city = tags?.["addr:city"];
  const state = tags?.["addr:state"];

  if (hn || street) parts.push([hn, street].filter(Boolean).join(" "));
  if (city) parts.push(city);
  if (state) parts.push(state);

  return parts.join(", ") || "Nearby";
}

export async function fetchNearbyFastFoodFromOSM(input: {
  center: LatLng;
  radiusMeters: number;
  limit: number;
  signal?: AbortSignal;
}): Promise<Place[]> {
  const { center, radiusMeters, limit, signal } = input;

  const query = `[out:json][timeout:20];(
    node[amenity=fast_food](around:${radiusMeters},${center.lat},${center.lng});
    way[amenity=fast_food](around:${radiusMeters},${center.lat},${center.lng});
    relation[amenity=fast_food](around:${radiusMeters},${center.lat},${center.lng});
  );out center tags;`;

  const url = "https://overpass-api.de/api/interpreter";

  console.log("[OSM] overpass request", {
    url,
    center,
    radiusMeters,
    limit,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[OSM] overpass error", res.status, text.slice(0, 200));
    throw new Error("Could not load nearby places.");
  }

  const json = (await res.json()) as OverpassResponse;
  const elements = Array.isArray(json.elements) ? json.elements : [];

  const places: Place[] = elements
    .map((el): Place | null => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      const location = { lat, lng };
      const distKm = haversineKm(center, location);
      const tags = el.tags;
      const name = pickLabel(tags);
      const cuisine = pickCuisine(tags);

      return {
        id: `osm_${el.type}_${el.id}`,
        name,
        address: pickAddress(tags),
        location,
        distanceKm: Number(distKm.toFixed(2)),
        rating: null,
        priceTier: null,
        cuisine,
        photoUrl: makeFoodPhotoUrl(cuisine ?? name),
        source: "osm",
        tags,
      };
    })
    .filter((p): p is Place => Boolean(p));

  places.sort((a, b) => a.distanceKm - b.distanceKm);

  const sliced = places.slice(0, limit);
  console.log("[OSM] overpass results", {
    raw: elements.length,
    mapped: places.length,
    returned: sliced.length,
    first: sliced[0]?.name,
  });

  return sliced;
}
