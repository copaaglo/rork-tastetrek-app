import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import {
  Alert,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Star } from "lucide-react-native";

import Colors from "@/constants/colors";
import { usePreferences } from "@/providers/preferences";
import { fetchNearbyPlaces } from "@/utils/places";
import type { Place } from "@/utils/places/types";
import { useUserLocation } from "@/utils/use-user-location";

export type FoodSpot = {
  id: string;
  name: string;
  cuisine: string;
  priceTier: 1 | 2 | 3 | 4;
  halal: boolean;
  rating: number;
  etaMins: number;
  distanceKm: number;
  photoUrl: string | null;
  logoUrl: string | null;
  logoFallbackUrl: string | null;
  fallbackImageUrl: string;
  address: string;
  location: { lat: number; lng: number };
};

type GoogleLogoResult = {
  primaryLogoUri: string | null;
  fallbackLogoUri: string | null;
};

const SWIPE_THRESHOLD = 120;

function openDirections(lat: number, lng: number, label: string) {
  const encodedLabel = encodeURIComponent(label);

  if (Platform.OS === "ios") {
    const url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodedLabel}`;
    Linking.openURL(url).catch((e: unknown) => {
      console.log("[openDirections] iOS openURL error", e);
    });
    return;
  }

  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_name=${encodedLabel}`;
  Linking.openURL(url).catch((e: unknown) => {
    console.log("[openDirections] google openURL error", e);
  });
}

function normalizeBrandKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function guessBrandDomain(name: string): string | null {
  const key = normalizeBrandKey(name);

  const map: Record<string, string> = {
    "mcdonalds": "mcdonalds.com",
    "mc donalds": "mcdonalds.com",
    "burger king": "burgerking.com",
    "kfc": "kfc.com",
    "subway": "subway.com",
    "taco bell": "tacobell.com",
    "wendys": "wendys.com",
    "wendy's": "wendys.com",
    "chipotle": "chipotle.com",
    "popeyes": "popeyes.com",
    "popeyes louisiana kitchen": "popeyes.com",
    "dominos": "dominos.com",
    "domino's": "dominos.com",
    "pizza hut": "pizzahut.com",
    "papa johns": "papajohns.com",
    "papa john's": "papajohns.com",
    "dunkin": "dunkindonuts.com",
    "dunkin donuts": "dunkindonuts.com",
    "starbucks": "starbucks.com",
    "chick fil a": "chick-fil-a.com",
    "chick-fil-a": "chick-fil-a.com",
    "five guys": "fiveguys.com",
    "panera": "panerabread.com",
    "panera bread": "panerabread.com",
    "shake shack": "shakeshack.com",
    "in n out": "in-n-out.com",
    "in-n-out": "in-n-out.com",
  };

  if (map[key]) return map[key];

  const first = key.split(" ")[0];
  if (!first) return null;

  if (first.length <= 2) return null;

  return `${first}.com`;
}

function makeClearbitLogoUrl(domain: string): string {
  return `https://logo.clearbit.com/${encodeURIComponent(domain)}?size=256`;
}

function makeFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`;
}

function extractDomainFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function parseGooglePlaceId(spotId: string): string | null {
  if (spotId.startsWith("google_")) return spotId.slice("google_".length);
  return null;
}

async function fetchGoogleLogoForSpot(args: {
  spotId: string;
  spotName: string;
  spotLocation: { lat: number; lng: number };
  signal?: AbortSignal;
}): Promise<GoogleLogoResult> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.log("[GoogleLogo] missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY");
    return { primaryLogoUri: null, fallbackLogoUri: null };
  }

  if (Platform.OS === "web") {
    console.log("[GoogleLogo] skipped on web (CORS likely)");
    return { primaryLogoUri: null, fallbackLogoUri: null };
  }

  const googlePlaceId = parseGooglePlaceId(args.spotId);

  const fetchDetails = async (placeId: string): Promise<GoogleLogoResult> => {
    const detailsUrl =
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${encodeURIComponent(placeId)}` +
      `&fields=${encodeURIComponent("website,icon,url,name,rating")}` +
      `&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(detailsUrl, { signal: args.signal });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log("[GoogleLogo] details error", res.status, text.slice(0, 200));
      return { primaryLogoUri: null, fallbackLogoUri: null };
    }

    const json = (await res.json()) as {
      result?: { website?: string; icon?: string; url?: string; name?: string; rating?: number };
      status?: string;
      error_message?: string;
    };

    if (json.status && json.status !== "OK") {
      console.log("[GoogleLogo] details bad status", json.status, json.error_message);
      return { primaryLogoUri: null, fallbackLogoUri: null };
    }

    const website = json.result?.website;
    const domain = extractDomainFromUrl(website);

    const primary = domain ? makeClearbitLogoUrl(domain) : (json.result?.icon ?? null);
    const fallback = domain ? makeFaviconUrl(domain) : null;

    console.log("[GoogleLogo] details resolved", {
      spotId: args.spotId,
      spotName: args.spotName,
      domain,
      primary,
      fallback,
      website,
    });

    return { primaryLogoUri: primary, fallbackLogoUri: fallback };
  };

  if (googlePlaceId) {
    return fetchDetails(googlePlaceId);
  }

  const findUrl =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?` +
    `input=${encodeURIComponent(args.spotName)}` +
    `&inputtype=${encodeURIComponent("textquery")}` +
    `&fields=${encodeURIComponent("place_id")}` +
    `&locationbias=${encodeURIComponent(
      `circle:2500@${args.spotLocation.lat},${args.spotLocation.lng}`
    )}` +
    `&key=${encodeURIComponent(apiKey)}`;

  const findRes = await fetch(findUrl, { signal: args.signal });
  if (!findRes.ok) {
    const text = await findRes.text().catch(() => "");
    console.log("[GoogleLogo] findplace error", findRes.status, text.slice(0, 200));
    return { primaryLogoUri: null, fallbackLogoUri: null };
  }

  const findJson = (await findRes.json()) as {
    candidates?: { place_id?: string }[];
    status?: string;
    error_message?: string;
  };

  if (findJson.status && findJson.status !== "OK") {
    console.log("[GoogleLogo] findplace bad status", findJson.status, findJson.error_message);
    return { primaryLogoUri: null, fallbackLogoUri: null };
  }

  const placeId = findJson.candidates?.[0]?.place_id;
  if (!placeId) {
    console.log("[GoogleLogo] findplace no candidates", {
      spotId: args.spotId,
      spotName: args.spotName,
    });
    return { primaryLogoUri: null, fallbackLogoUri: null };
  }

  return fetchDetails(placeId);
}

function getBrandLogoCandidates(name: string): { primary: string | null; fallback: string | null } {
  const domain = guessBrandDomain(name);
  if (!domain) return { primary: null, fallback: null };
  return {
    primary: makeClearbitLogoUrl(domain),
    fallback: makeFaviconUrl(domain),
  };
}

function makeFallbackLogoPlaceholder(name: string): string {
  const trimmed = name.trim();
  const initials = trimmed
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const text = encodeURIComponent(initials || trimmed.slice(0, 2) || "FO");
  return `https://placehold.co/1200x900/png?text=${text}`;
}

function spotFromPlace(p: Place): FoodSpot {
  const priceTier = (p.priceTier ?? 2) as 1 | 2 | 3 | 4;
  const rating = p.rating ?? 4.2;
  const cuisine = p.cuisine ?? "Fast food";
  const address = p.address;

  const photoUrl = p.photoUrl ?? null;
  const logoCandidates = getBrandLogoCandidates(p.name);
  const logoUrl = logoCandidates.primary;
  const logoFallbackUrl = logoCandidates.fallback;
  const fallbackImageUrl = makeFallbackLogoPlaceholder(p.name);

  const etaMins = Math.max(6, Math.round(p.distanceKm * 7));

  return {
    id: p.id,
    name: p.name,
    cuisine: `${cuisine} · ${p.source.toUpperCase()}`,
    priceTier,
    halal: false,
    rating,
    etaMins,
    distanceKm: p.distanceKm,
    photoUrl,
    logoUrl,
    logoFallbackUrl,
    fallbackImageUrl,
    address,
    location: p.location,
  };
}

export default function DiscoverScreen() {
  const { isLoading: isLocLoading, errorMessage: locationError, coords } =
    useUserLocation();
  const { prefs } = usePreferences();

  const [isPullRefreshing, setIsPullRefreshing] = useState<boolean>(false);

  const seedLat = coords?.latitude ?? 37.7749;
  const seedLng = coords?.longitude ?? -122.4194;

  const {
    data: placesData,
    error: placesError,
    isFetching: isPlacesFetching,
    isLoading: isPlacesLoading,
    refetch: refetchPlaces,
  } = useQuery({
    queryKey: [
      "nearbyPlaces",
      Math.round(seedLat * 1000) / 1000,
      Math.round(seedLng * 1000) / 1000,
    ],
    queryFn: async ({ signal }) => {
      console.log("[Discover] fetching nearby places", { seedLat, seedLng });
      return fetchNearbyPlaces({
        center: { lat: seedLat, lng: seedLng },
        radiusMeters: 2500,
        limit: 30,
        signal,
      });
    },
    enabled: Boolean(coords) && !isLocLoading && !locationError,
    staleTime: 1000 * 60,
  });

  const allSpots = useMemo<FoodSpot[]>(() => {
    const places = placesData ?? [];
    const mapped = places.map(spotFromPlace);
    console.log("[Discover] mapped spots", { places: places.length, spots: mapped.length });
    return mapped;
  }, [placesData]);

  const filteredSpots = useMemo(() => {
    const res = allSpots.filter((s) => {
      if (prefs.halalOnly && !s.halal) return false;
      if (s.priceTier < prefs.priceMin || s.priceTier > prefs.priceMax) return false;
      if (prefs.maxDistanceKm != null && s.distanceKm > prefs.maxDistanceKm) return false;
      if (prefs.minRating != null && s.rating < prefs.minRating) return false;

      if (prefs.includedCategories.length > 0) {
        const haystack = `${s.name} ${s.cuisine}`.toLowerCase();
        const ok = prefs.includedCategories.some((c) => {
          if (c === "burgers") return /burger|hamburger|whopper|big mac/.test(haystack);
          if (c === "pizza") return /pizza|pizzeria/.test(haystack);
          if (c === "chicken") return /chicken|wings|tenders|fried chicken/.test(haystack);
          if (c === "tacos") return /taco|burrito|mexican|quesadilla/.test(haystack);
          if (c === "sandwiches") return /sandwich|sub|hoagie|wrap/.test(haystack);
          if (c === "coffee") return /coffee|cafe|espresso|starbucks/.test(haystack);
          if (c === "dessert") return /ice cream|dessert|donut|doughnut|bakery/.test(haystack);
          return false;
        });
        if (!ok) return false;
      }

      if (prefs.excludedSpotIds.includes(s.id)) return false;
      return true;
    });
    console.log("[Discover] filtered", {
      total: allSpots.length,
      filtered: res.length,
      prefs,
    });
    return res;
  }, [allSpots, prefs]);

  const [index, setIndex] = useState<number>(0);
  const current = filteredSpots[index];
  const next = filteredSpots[index + 1];

  const pos = useRef<Animated.ValueXY>(new Animated.ValueXY()).current;
  const swipeX = useRef<Animated.Value>(new Animated.Value(0)).current;

  const pullDistance = useRef<Animated.Value>(new Animated.Value(0)).current;

  const resetCard = useCallback(() => {
    Animated.parallel([
      Animated.spring(pos, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
        bounciness: 10,
        speed: 14,
      }),
      Animated.spring(pullDistance, {
        toValue: 0,
        useNativeDriver: false,
        bounciness: 10,
        speed: 16,
      }),
    ]).start();
  }, [pos, pullDistance]);

  const goNext = useCallback(() => {
    setIndex((prev) => {
      const nextIndex = prev + 1;
      console.log("[Discover] goNext", { prev, nextIndex });
      return nextIndex;
    });
    pos.setValue({ x: 0, y: 0 });
    pullDistance.setValue(0);
  }, [pos, pullDistance]);

  const forceSwipe = useCallback(
    (dir: "left" | "right") => {
      const x = dir === "right" ? 420 : -420;
      Animated.timing(pos, {
        toValue: { x, y: 0 },
        duration: 180,
        useNativeDriver: false,
      }).start(() => {
        if (dir === "right" && current) {
          console.log("[Discover] liked", current.id);
          openDirections(current.location.lat, current.location.lng, current.name);
        } else if (dir === "left" && current) {
          console.log("[Discover] passed", current.id);
        }
        goNext();
      });
    },
    [current, goNext, pos]
  );

  const refreshAlgorithm = useCallback(async () => {
    if (isPullRefreshing) return;

    console.log("[Discover] pull-to-refresh start", {
      coords,
      prefs,
      currentIndex: index,
    });

    try {
      setIsPullRefreshing(true);
      setIndex(0);
      pos.setValue({ x: 0, y: 0 });
      pullDistance.setValue(0);

      const res = await refetchPlaces();
      console.log("[Discover] pull-to-refresh done", {
        status: res.status,
        dataLen: res.data?.length ?? 0,
      });

      if (res.error) {
        Alert.alert("Refresh failed", "Couldn’t refresh places. Try again in a moment.");
      }
    } catch (e: unknown) {
      console.log("[Discover] pull-to-refresh error", e);
      Alert.alert("Refresh failed", "Couldn’t refresh places. Try again in a moment.");
    } finally {
      setIsPullRefreshing(false);
      resetCard();
    }
  }, [coords, index, isPullRefreshing, pos, prefs, pullDistance, refetchPlaces, resetCard]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        return Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4;
      },
      onPanResponderGrant: () => {
        pos.setOffset({
          x: (pos.x as unknown as { __getValue: () => number }).__getValue(),
          y: (pos.y as unknown as { __getValue: () => number }).__getValue(),
        });
        pos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_evt, gesture) => {
        const isPullDown = gesture.dy > 0 && Math.abs(gesture.dx) < 22;

        if (isPullDown) {
          const y = Math.min(110, gesture.dy * 0.55);
          pos.setValue({ x: 0, y });
          swipeX.setValue(0);
          pullDistance.setValue(y);
          return;
        }

        pos.setValue({ x: gesture.dx, y: gesture.dy });
        swipeX.setValue(gesture.dx);
        pullDistance.setValue(0);
      },
      onPanResponderRelease: (_evt, gesture) => {
        pos.flattenOffset();

        const isPullDownRelease = gesture.dy > 90 && Math.abs(gesture.dx) < 26;
        if (isPullDownRelease) {
          refreshAlgorithm().catch((e: unknown) => {
            console.log("[Discover] refreshAlgorithm unhandled error", e);
          });
          return;
        }

        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe("right");
          return;
        }

        if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe("left");
          return;
        }

        resetCard();
      },
    });
  }, [forceSwipe, pos, pullDistance, refreshAlgorithm, resetCard, swipeX]);

  useEffect(() => {
    setIndex(0);
    pos.setValue({ x: 0, y: 0 });
    pullDistance.setValue(0);
  }, [filteredSpots.length, pos, prefs, pullDistance]);

  const likeOpacity = swipeX.interpolate({
    inputRange: [0, 90, 160],
    outputRange: [0, 0.35, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = swipeX.interpolate({
    inputRange: [-160, -90, 0],
    outputRange: [1, 0.35, 0],
    extrapolate: "clamp",
  });

  const cardRotate = swipeX.interpolate({
    inputRange: [-280, 0, 280],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const likeScale = swipeX.interpolate({
    inputRange: [0, 160],
    outputRange: [0.98, 1],
    extrapolate: "clamp",
  });

  const headerSubtitle = useMemo(() => {
    const parts: string[] = [];
    parts.push(`${prefs.priceMin}–${prefs.priceMax}`);
    if (prefs.maxDistanceKm != null) parts.push(`≤ ${prefs.maxDistanceKm} km`);
    if (prefs.minRating != null) parts.push(`${prefs.minRating.toFixed(1)}★+`);
    if (prefs.halalOnly) parts.push("Halal");
    if (prefs.includedCategories.length > 0) parts.push(prefs.includedCategories.join(", "));
    return parts.join(" · ");
  }, [
    prefs.halalOnly,
    prefs.includedCategories,
    prefs.maxDistanceKm,
    prefs.minRating,
    prefs.priceMax,
    prefs.priceMin,
  ]);

  return (
    <View style={styles.screen} testID="discover-screen">
      <Stack.Screen
        options={{
          headerTitle: "",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: "#FFFFFF",
          },
        }}
      />

      <View style={styles.topRow} testID="discover-top-row">
        <Text style={styles.subtitle} numberOfLines={1} testID="discover-subtitle">
          {headerSubtitle}
        </Text>
      </View>

      <View style={styles.deck} testID="discover-deck">
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pullIndicator,
            {
              opacity: pullDistance.interpolate({
                inputRange: [0, 16, 70],
                outputRange: [0, 0.55, 1],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateY: pullDistance.interpolate({
                    inputRange: [0, 110],
                    outputRange: [-22, 6],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
          testID="discover-pull-indicator"
        >
          <View style={styles.pullPill}>
            <Text style={styles.pullText}>
              {isPullRefreshing || isPlacesFetching ? "Refreshing…" : "Pull to refresh"}
            </Text>
          </View>
        </Animated.View>

        {next ? <SpotCard spot={next} variant="next" /> : null}

        {isLocLoading || isPlacesLoading ? (
          <View style={styles.empty} testID="discover-loading">
            <Text style={styles.emptyTitle}>Finding fast food near you…</Text>
            <Text style={styles.emptyText}>Pulling real places from OSM (and more).</Text>
          </View>
        ) : locationError ? (
          <View style={styles.empty} testID="discover-location-error">
            <Text style={styles.emptyTitle}>Location needed</Text>
            <Text style={styles.emptyText}>{locationError}</Text>
          </View>
        ) : placesError ? (
          <View style={styles.empty} testID="discover-places-error">
            <Text style={styles.emptyTitle}>Couldn’t load places</Text>
            <Text style={styles.emptyText}>
              Try again in a moment. Some providers can rate-limit.
            </Text>
          </View>
        ) : current ? (
          <Animated.View
            style={[
              styles.activeCard,
              {
                transform: [
                  { translateX: pos.x },
                  { translateY: pos.y },
                  { rotate: cardRotate },
                  { scale: likeScale },
                ],
              },
            ]}
            {...panResponder.panHandlers}
            testID={`card-${current.id}`}
          >
            <SpotCard spot={current} variant="active" />

            <Animated.View
              pointerEvents="none"
              style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}
            >
              <Text style={styles.stampText}>GO</Text>
            </Animated.View>

            <Animated.View
              pointerEvents="none"
              style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}
            >
              <Text style={styles.stampText}>SKIP</Text>
            </Animated.View>
          </Animated.View>
        ) : (
          <EmptyState />
        )}
      </View>

      <View style={styles.actions} testID="discover-actions">
        <ActionButton
          label="Pass"
          tone="secondary"
          onPress={() => forceSwipe("left")}
          testID="btn-pass"
        />
        <ActionButton
          label="Take me"
          tone="primary"
          onPress={() => forceSwipe("right")}
          testID="btn-like"
        />
      </View>

      <View style={styles.footer} testID="discover-footer">
        <Text style={styles.footerText}>
          Swipe right to open directions · Swipe left to pass
        </Text>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty} testID="discover-empty">
      <Text style={styles.emptyTitle}>Nothing matches your filters</Text>
      <Text style={styles.emptyText}>
        Try increasing your distance limit, lowering minimum rating, or widening price range.
      </Text>
    </View>
  );
}

function SpotCard({ spot, variant }: { spot: FoodSpot; variant: "active" | "next" }) {
  const spotId = spot.id;
  const spotName = spot.name;
  const spotLat = spot.location.lat;
  const spotLng = spot.location.lng;

  const { data: googleLogo } = useQuery({
    queryKey: [
      "googleLogo",
      spotId,
      spotName,
      Math.round(spotLat * 1000) / 1000,
      Math.round(spotLng * 1000) / 1000,
    ],
    queryFn: async ({ signal }) => {
      console.log("[SpotCard] fetching google logo", { spotId, spotName });
      return fetchGoogleLogoForSpot({
        spotId,
        spotName,
        spotLocation: { lat: spotLat, lng: spotLng },
        signal,
      });
    },
    enabled: Boolean(spotName) && Boolean(process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY),
    staleTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });

  const resolvedLogoUri =
    googleLogo?.primaryLogoUri ??
    spot.logoUrl ??
    googleLogo?.fallbackLogoUri ??
    spot.logoFallbackUrl ??
    null;

  const cuisineLabel = useMemo(() => {
    const raw = spot.cuisine ?? "";
    return raw.split("·")[0]?.trim() || "Restaurant";
  }, [spot.cuisine]);

  return (
    <View style={[styles.card, variant === "next" ? styles.cardNext : null]} testID="spot-card">
      <View style={styles.cardInner}>
        <View style={styles.cardHeader} testID="spot-card-header">
          <View style={styles.logoWrap} testID="spot-card-logo-wrap">
            {resolvedLogoUri ? (
              <Image
                source={{ uri: resolvedLogoUri }}
                style={styles.logo}
                contentFit="contain"
                transition={150}
                testID="spot-logo"
              />
            ) : (
              <View style={styles.logoFallback} testID="spot-logo-fallback">
                <Text style={styles.logoFallbackText}>
                  {(spot.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase() || "FO")
                    .slice(0, 2)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerText} testID="spot-header-text">
            <Text style={styles.name} numberOfLines={1} testID="spot-name">
              {spot.name}
            </Text>
            <Text style={styles.cuisine} numberOfLines={1} testID="spot-cuisine">
              {cuisineLabel}
            </Text>
          </View>
        </View>

        <View style={styles.divider} testID="spot-divider" />

        <View style={styles.ratingRow} testID="spot-rating-row">
          <StarRating rating={spot.rating} size={24} testID="spot-stars" />
          <Text style={styles.ratingNumber} testID="spot-rating-number">
            {spot.rating.toFixed(1)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function StarRating({
  rating,
  size,
  testID,
}: {
  rating: number;
  size: number;
  testID: string;
}) {
  const clamped = Math.max(0, Math.min(5, rating));
  const full = Math.floor(clamped);
  const frac = clamped - full;
  const hasHalf = frac >= 0.25 && frac < 0.75;
  const filledCount = full + (frac >= 0.75 ? 1 : 0);

  const stars = Array.from({ length: 5 }).map((_, i) => {
    const idx = i + 1;
    const isFilled = idx <= filledCount;
    const isHalf = !isFilled && hasHalf && idx === full + 1;

    return (
      <View key={`star-${i}`} style={styles.starCell} testID={`${testID}-cell-${i}`}>
        <StarIcon filled={false} size={size} />
        {isFilled ? (
          <View style={StyleSheet.absoluteFill}>
            <StarIcon filled size={size} />
          </View>
        ) : isHalf ? (
          <View style={[StyleSheet.absoluteFill, { overflow: "hidden", width: size / 2 }]}>
            <StarIcon filled size={size} />
          </View>
        ) : null}
      </View>
    );
  });

  return (
    <View style={styles.starsRow} testID={testID}>
      {stars}
    </View>
  );
}

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  const fill = filled ? "#F5B301" : "transparent";
  const stroke = filled ? "#F5B301" : "rgba(0,0,0,0.22)";
  return <Star size={size} color={stroke} fill={fill} />;
}

function ActionButton({
  label,
  onPress,
  tone,
  testID,
}: {
  label: string;
  onPress: () => void;
  tone: "primary" | "secondary";
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        tone === "primary" ? styles.actionPrimary : styles.actionSecondary,
        pressed ? { transform: [{ scale: 0.98 }], opacity: 0.96 } : null,
      ]}
      testID={testID}
    >
      <Text
        style={[
          styles.actionText,
          tone === "primary" ? styles.actionTextPrimary : styles.actionTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  subtitle: {
    color: "rgba(0,0,0,0.55)",
    fontSize: 12,
    textAlign: "right",
    fontWeight: "700" as const,
  },
  deck: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 12,
  },
  pullIndicator: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  pullPill: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pullText: {
    color: "rgba(0,0,0,0.72)",
    fontWeight: "800" as const,
    fontSize: 12,
    letterSpacing: 0.1,
  },
  activeCard: {
    width: "100%",
  },
  card: {
    width: "100%",
    height: 260,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardInner: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  cardNext: {
    position: "absolute",
    top: 14,
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 56,
    height: 56,
  },
  logoFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  logoFallbackText: {
    color: "#0B0B0C",
    fontWeight: "900" as const,
    fontSize: 16,
    letterSpacing: 0.6,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  divider: {
    marginTop: 18,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  cuisine: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "rgba(0,0,0,0.45)",
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starCell: {
    width: 24,
    height: 24,
  },
  ratingNumber: {
    marginLeft: 10,
    fontSize: 28,
    fontWeight: "900" as const,
    color: "rgba(0,0,0,0.45)",
    letterSpacing: -0.2,
  },
  stamp: {
    position: "absolute",
    top: 26,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  likeStamp: {
    left: 18,
    borderColor: "rgba(14,159,110,0.6)",
  },
  nopeStamp: {
    right: 18,
    borderColor: "rgba(217,45,32,0.55)",
  },
  stampText: {
    fontWeight: "900" as const,
    fontSize: 16,
    color: "#0B0B0C",
    letterSpacing: 1.2,
  },
  name: {
    color: "#000000",
    fontWeight: "900" as const,
    fontSize: 30,
    letterSpacing: -0.4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  pill: {
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 220,
  },
  pillAccent: {
    backgroundColor: "rgba(255,77,46,0.10)",
    borderColor: "rgba(255,77,46,0.18)",
  },
  pillText: {
    color: "rgba(0,0,0,0.82)",
    fontWeight: "700" as const,
    fontSize: 12,
  },
  pillTextAccent: {
    color: "#B62814",
  },
  address: {
    color: "rgba(0,0,0,0.60)",
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPrimary: {
    backgroundColor: Colors.light.tint,
  },
  actionSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  actionText: {
    fontWeight: "800" as const,
    fontSize: 15,
  },
  actionTextPrimary: {
    color: "#FFFFFF",
  },
  actionTextSecondary: {
    color: "#0B0B0C",
  },
  footer: {
    paddingBottom: 10,
  },
  footerText: {
    color: Colors.light.subtext,
    fontSize: 12,
    textAlign: "center",
  },
  empty: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "#FFFFFF",
    padding: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#0B0B0C",
  },
  emptyText: {
    marginTop: 6,
    color: Colors.light.subtext,
    fontSize: 13,
    lineHeight: 18,
  },
});
