import type { LatLng, Place } from "@/utils/places/types";
import { fetchNearbyFastFoodFromFoursquare } from "@/utils/places/providers/foursquare";
import { fetchNearbyFastFoodFromGoogle } from "@/utils/places/providers/google";
import { fetchNearbyFastFoodFromOSM } from "@/utils/places/providers/osm";
import { fetchNearbyFastFoodFromYelp } from "@/utils/places/providers/yelp";

export type PlacesQueryInput = {
  center: LatLng;
  radiusMeters?: number;
  limit?: number;
  signal?: AbortSignal;
};

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

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function placeKey(p: Place): string {
  const lat = Math.round(p.location.lat * 10000) / 10000;
  const lng = Math.round(p.location.lng * 10000) / 10000;
  return `${normalizeName(p.name)}_${lat}_${lng}`;
}

function mergeBest(a: Place, b: Place): Place {
  const rating = a.rating ?? b.rating;
  const priceTier = a.priceTier ?? b.priceTier;
  const cuisine = a.cuisine ?? b.cuisine;
  const photoUrl = a.photoUrl ?? b.photoUrl;
  const address = a.address && a.address !== "Nearby" ? a.address : b.address;

  return {
    ...a,
    address,
    rating,
    priceTier,
    cuisine,
    photoUrl,
    distanceKm: Math.min(a.distanceKm, b.distanceKm),
    tags: { ...(b.tags ?? {}), ...(a.tags ?? {}) },
  };
}

export async function fetchNearbyPlaces(input: PlacesQueryInput): Promise<Place[]> {
  const radiusMeters = input.radiusMeters ?? 2500;
  const limit = input.limit ?? 30;

  console.log("[places] fetchNearbyPlaces", { center: input.center, radiusMeters, limit });

  const settled = await Promise.allSettled([
    fetchNearbyFastFoodFromOSM({
      center: input.center,
      radiusMeters,
      limit,
      signal: input.signal,
    }),
    fetchNearbyFastFoodFromGoogle({
      center: input.center,
      radiusMeters,
      limit,
      signal: input.signal,
    }),
    fetchNearbyFastFoodFromYelp({
      center: input.center,
      radiusMeters,
      limit,
      signal: input.signal,
    }),
    fetchNearbyFastFoodFromFoursquare({
      center: input.center,
      radiusMeters,
      limit,
      signal: input.signal,
    }),
  ]);

  const all: Place[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") {
      all.push(...s.value);
    } else {
      console.log("[places] provider error", s.reason);
    }
  }

  const withDistance: Place[] = all.map((p) => {
    const dist = p.distanceKm > 0 ? p.distanceKm : haversineKm(input.center, p.location);
    return { ...p, distanceKm: Number(dist.toFixed(2)) };
  });

  const map = new Map<string, Place>();
  for (const p of withDistance) {
    const key = placeKey(p);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, p);
      continue;
    }
    map.set(key, mergeBest(existing, p));
  }

  const merged = Array.from(map.values());
  merged.sort((a, b) => a.distanceKm - b.distanceKm);

  const sliced = merged.slice(0, limit);
  console.log("[places] merged results", {
    input: all.length,
    merged: merged.length,
    returned: sliced.length,
    sources: sliced.reduce<Record<string, number>>((acc, p) => {
      acc[p.source] = (acc[p.source] ?? 0) + 1;
      return acc;
    }, {}),
  });

  return sliced;
}
