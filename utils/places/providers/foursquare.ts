import { Platform } from "react-native";

import type { LatLng, Place } from "@/utils/places/types";

type FsqPlace = {
  fsq_id: string;
  name: string;
  distance?: number;
  geocodes?: { main?: { latitude: number; longitude: number } };
  location?: { formatted_address?: string };
  categories?: { name: string }[];
  rating?: number;
};

type FsqSearchResponse = {
  results?: FsqPlace[];
};

type FsqPhoto = {
  prefix?: string;
  suffix?: string;
  width?: number;
  height?: number;
};

type FsqPhotosResponse = FsqPhoto[];

function makeFsqPhotoUrl(photo: FsqPhoto | undefined): string | null {
  const prefix = photo?.prefix;
  const suffix = photo?.suffix;
  if (!prefix || !suffix) return null;
  return `${prefix}original${suffix}`;
}

async function fetchFirstFsqPhotoUrl(args: {
  fsqId: string;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<string | null> {
  const url = `https://api.foursquare.com/v3/places/${encodeURIComponent(
    args.fsqId
  )}/photos?limit=1&sort=POPULAR`;

  const res = await fetch(url, {
    headers: {
      Authorization: args.apiKey,
      Accept: "application/json",
    },
    signal: args.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[Foursquare] photos error", args.fsqId, res.status, text.slice(0, 120));
    return null;
  }

  const json = (await res.json()) as FsqPhotosResponse;
  const first = Array.isArray(json) ? json[0] : undefined;
  return makeFsqPhotoUrl(first);
}

type PlaceWithFsqId = Place & { _fsqId: string };

export async function fetchNearbyFastFoodFromFoursquare(input: {
  center: LatLng;
  radiusMeters: number;
  limit: number;
  signal?: AbortSignal;
}): Promise<Place[]> {
  const apiKey = process.env.EXPO_PUBLIC_FOURSQUARE_API_KEY;

  if (!apiKey) {
    console.log("[Foursquare] missing EXPO_PUBLIC_FOURSQUARE_API_KEY");
    return [];
  }

  if (Platform.OS === "web") {
    console.log("[Foursquare] skipped on web (CORS likely)");
    return [];
  }

  const url =
    `https://api.foursquare.com/v3/places/search?` +
    `ll=${encodeURIComponent(`${input.center.lat},${input.center.lng}`)}` +
    `&radius=${encodeURIComponent(String(input.radiusMeters))}` +
    `&query=${encodeURIComponent("fast food")}` +
    `&limit=${encodeURIComponent(String(Math.min(input.limit, 50)))}` +
    `&sort=DISTANCE`;

  console.log("[Foursquare] request", { center: input.center, radiusMeters: input.radiusMeters });

  const res = await fetch(url, {
    headers: {
      Authorization: apiKey,
      Accept: "application/json",
    },
    signal: input.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[Foursquare] error", res.status, text.slice(0, 200));
    return [];
  }

  const json = (await res.json()) as FsqSearchResponse;
  const results = Array.isArray(json.results) ? json.results : [];

  const basePlaces: PlaceWithFsqId[] = results
    .map((r): PlaceWithFsqId | null => {
      const lat = r.geocodes?.main?.latitude;
      const lng = r.geocodes?.main?.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      return {
        id: `fsq_${r.fsq_id}`,
        name: r.name,
        address: r.location?.formatted_address ?? "Nearby",
        location: { lat, lng },
        distanceKm:
          typeof r.distance === "number" ? Number((r.distance / 1000).toFixed(2)) : 0,
        rating: typeof r.rating === "number" ? r.rating : null,
        priceTier: null,
        cuisine: r.categories?.[0]?.name ?? null,
        photoUrl: null,
        source: "foursquare",
        _fsqId: r.fsq_id,
      };
    })
    .filter((p): p is PlaceWithFsqId => Boolean(p));

  const toFetch = basePlaces.slice(0, Math.min(basePlaces.length, 12));
  console.log("[Foursquare] fetching photos", { count: toFetch.length });

  const withPhotos = await Promise.all(
    basePlaces.map(async (p): Promise<Place> => {
      const shouldFetch = toFetch.some((t) => t._fsqId === p._fsqId);
      if (!shouldFetch) {
        const { _fsqId: _omit, ...rest } = p;
        return rest;
      }

      const photoUrl = await fetchFirstFsqPhotoUrl({
        fsqId: p._fsqId,
        apiKey,
        signal: input.signal,
      }).catch((e: unknown) => {
        console.log("[Foursquare] photos fetch exception", p._fsqId, e);
        return null;
      });

      const { _fsqId: _omit, ...rest } = p;
      return { ...rest, photoUrl };
    })
  );

  return withPhotos;
}
