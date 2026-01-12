import { Platform } from "react-native";

import type { LatLng, Place } from "@/utils/places/types";

type YelpBusiness = {
  id: string;
  name: string;
  rating?: number;
  price?: string;
  distance?: number;
  coordinates?: { latitude: number; longitude: number };
  location?: { address1?: string; city?: string; state?: string };
  image_url?: string;
  categories?: { title: string }[];
};

type YelpSearchResponse = {
  businesses?: YelpBusiness[];
};

function priceToTier(price: string | undefined): 1 | 2 | 3 | 4 | null {
  if (!price) return null;
  const len = price.length;
  if (len <= 1) return 1;
  if (len === 2) return 2;
  if (len === 3) return 3;
  return 4;
}

function joinAddress(b: YelpBusiness): string {
  const parts: string[] = [];
  const a1 = b.location?.address1;
  const city = b.location?.city;
  const state = b.location?.state;
  if (a1) parts.push(a1);
  if (city) parts.push(city);
  if (state) parts.push(state);
  return parts.join(", ") || "Nearby";
}

export async function fetchNearbyFastFoodFromYelp(input: {
  center: LatLng;
  radiusMeters: number;
  limit: number;
  signal?: AbortSignal;
}): Promise<Place[]> {
  const apiKey = process.env.EXPO_PUBLIC_YELP_API_KEY;

  if (!apiKey) {
    console.log("[Yelp] missing EXPO_PUBLIC_YELP_API_KEY");
    return [];
  }

  if (Platform.OS === "web") {
    console.log("[Yelp] skipped on web (CORS)");
    return [];
  }

  const url =
    `https://api.yelp.com/v3/businesses/search?` +
    `latitude=${encodeURIComponent(String(input.center.lat))}` +
    `&longitude=${encodeURIComponent(String(input.center.lng))}` +
    `&radius=${encodeURIComponent(String(Math.min(input.radiusMeters, 40000)))}` +
    `&term=${encodeURIComponent("fast food")}` +
    `&categories=${encodeURIComponent("hotdogs,burgers,tradamerican,fastfood")}` +
    `&limit=${encodeURIComponent(String(Math.min(input.limit, 50)))}` +
    `&sort_by=distance`;

  console.log("[Yelp] request", { center: input.center, radiusMeters: input.radiusMeters });

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: input.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.log("[Yelp] error", res.status, text.slice(0, 200));
    return [];
  }

  const json = (await res.json()) as YelpSearchResponse;
  const businesses = Array.isArray(json.businesses) ? json.businesses : [];

  const places: Place[] = businesses
    .map((b): Place | null => {
      const lat = b.coordinates?.latitude;
      const lng = b.coordinates?.longitude;
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      const cuisine = b.categories?.[0]?.title ?? null;

      return {
        id: `yelp_${b.id}`,
        name: b.name,
        address: joinAddress(b),
        location: { lat, lng },
        distanceKm:
          typeof b.distance === "number" ? Number((b.distance / 1000).toFixed(2)) : 0,
        rating: typeof b.rating === "number" ? b.rating : null,
        priceTier: priceToTier(b.price),
        cuisine,
        photoUrl: b.image_url ?? null,
        source: "yelp",
      };
    })
    .filter((p): p is Place => Boolean(p));

  return places;
}
