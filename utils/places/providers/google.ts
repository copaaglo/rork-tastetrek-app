import { Platform } from "react-native";

import type { LatLng, Place } from "@/utils/places/types";

type GooglePlacesNearbyResponse = {
  results?: {
    place_id: string;
    name: string;
    vicinity?: string;
    geometry?: { location?: { lat: number; lng: number } };
    rating?: number;
    price_level?: number;
    types?: string[];
    photos?: { photo_reference: string }[];
  }[];
  status?: string;
  error_message?: string;
};

function clampPriceTier(val: number | undefined): 1 | 2 | 3 | 4 | null {
  if (typeof val !== "number") return null;
  if (val <= 0) return 1;
  if (val === 1) return 1;
  if (val === 2) return 2;
  if (val === 3) return 3;
  return 4;
}

function makePhotoUrl(photoRef: string | undefined, apiKey: string): string | null {
  if (!photoRef) return null;
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${encodeURIComponent(
    photoRef
  )}&key=${encodeURIComponent(apiKey)}`;
  return url;
}

export async function fetchNearbyFastFoodFromGoogle(input: {
  center: LatLng;
  radiusMeters: number;
  limit: number;
  signal?: AbortSignal;
}): Promise<Place[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.log("[GooglePlaces] missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY");
    return [];
  }

  if (Platform.OS === "web") {
    console.log("[GooglePlaces] skipped on web (CORS likely)");
    return [];
  }

  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
    `location=${input.center.lat},${input.center.lng}` +
    `&radius=${encodeURIComponent(String(input.radiusMeters))}` +
    `&type=${encodeURIComponent("restaurant")}` +
    `&keyword=${encodeURIComponent("fast food")}` +
    `&key=${encodeURIComponent(apiKey)}`;

  console.log("[GooglePlaces] request", {
    center: input.center,
    radiusMeters: input.radiusMeters,
    limit: input.limit,
  });

  const res = await fetch(url, { signal: input.signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[GooglePlaces] error", res.status, text.slice(0, 200));
    return [];
  }

  const json = (await res.json()) as GooglePlacesNearbyResponse;
  if (json.status && json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    console.log("[GooglePlaces] bad status", json.status, json.error_message);
    return [];
  }

  const places: Place[] = (json.results ?? [])
    .map((r): Place | null => {
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      const photoRef = r.photos?.[0]?.photo_reference;

      return {
        id: `google_${r.place_id}`,
        name: r.name,
        address: r.vicinity ?? "Nearby",
        location: { lat, lng },
        distanceKm: 0,
        rating: typeof r.rating === "number" ? r.rating : null,
        priceTier: clampPriceTier(r.price_level),
        cuisine: null,
        photoUrl: makePhotoUrl(photoRef, apiKey),
        source: "google",
      };
    })
    .filter((p): p is Place => Boolean(p));

  return places.slice(0, input.limit);
}
