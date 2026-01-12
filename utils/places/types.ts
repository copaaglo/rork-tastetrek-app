export type LatLng = { lat: number; lng: number };

export type PlaceSource = "osm" | "google" | "yelp" | "foursquare";

export type Place = {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  distanceKm: number;
  rating: number | null;
  priceTier: 1 | 2 | 3 | 4 | null;
  cuisine: string | null;
  photoUrl: string | null;
  source: PlaceSource;
  tags?: Record<string, string>;
};
