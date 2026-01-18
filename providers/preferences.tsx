import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

export type FoodCategory =
  | "burgers"
  | "pizza"
  | "chicken"
  | "tacos"
  | "sandwiches"
  | "coffee"
  | "dessert";

export type Preferences = {
  priceMin: 1 | 2 | 3 | 4;
  priceMax: 1 | 2 | 3 | 4;
  halalOnly: boolean;
  maxDistanceKm: number | null;
  minRating: number | null;
  includedCategories: FoodCategory[];
  excludedSpotIds: string[];
};

export type PreferencesState = {
  isReady: boolean;
  prefs: Preferences;
  setPriceRange: (min: 1 | 2 | 3 | 4, max: 1 | 2 | 3 | 4) => void;
  setHalalOnly: (val: boolean) => void;
  setMaxDistanceKm: (val: number | null) => void;
  setMinRating: (val: number | null) => void;
  toggleIncludedCategory: (cat: FoodCategory) => void;
  toggleExcludedSpotId: (spotId: string) => void;
  reset: () => void;
};

const STORAGE_KEY = "tastetrek.prefs.v2";

const DEFAULT_PREFS: Preferences = {
  priceMin: 1,
  priceMax: 4,
  halalOnly: false,
  maxDistanceKm: 20,
  minRating: null,
  includedCategories: [],
  excludedSpotIds: [],
};

export const [PreferencesProvider, usePreferences] = createContextHook<PreferencesState>(
  () => {
    const [isReady, setIsReady] = useState<boolean>(false);
    const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);

    useEffect(() => {
      let mounted = true;

      const run = async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (!mounted) return;
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<Preferences>;
            const merged: Preferences = {
              ...DEFAULT_PREFS,
              ...parsed,
              maxDistanceKm:
                typeof parsed.maxDistanceKm === "number" ? parsed.maxDistanceKm : DEFAULT_PREFS.maxDistanceKm,
              minRating: typeof parsed.minRating === "number" ? parsed.minRating : DEFAULT_PREFS.minRating,
              includedCategories: Array.isArray(parsed.includedCategories)
                ? (parsed.includedCategories.filter(Boolean) as Preferences["includedCategories"])
                : [],
              excludedSpotIds: Array.isArray(parsed.excludedSpotIds)
                ? parsed.excludedSpotIds
                : [],
            };
            setPrefs(merged);
            console.log("[Prefs] restored", merged);
          } else {
            console.log("[Prefs] no stored prefs");
          }
        } catch (e: unknown) {
          console.log("[Prefs] restore error", e);
        } finally {
          if (mounted) setIsReady(true);
        }
      };

      run();
      return () => {
        mounted = false;
      };
    }, []);

    const persist = useCallback(async (next: Preferences) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e: unknown) {
        console.log("[Prefs] persist error", e);
      }
    }, []);

    const setPriceRange = useCallback(
      (min: 1 | 2 | 3 | 4, max: 1 | 2 | 3 | 4) => {
        const next: Preferences = {
          ...prefs,
          priceMin: min,
          priceMax: max,
        };
        setPrefs(next);
        persist(next);
        console.log("[Prefs] setPriceRange", { min, max });
      },
      [persist, prefs]
    );

    const setHalalOnly = useCallback(
      (val: boolean) => {
        const next: Preferences = { ...prefs, halalOnly: val };
        setPrefs(next);
        persist(next);
        console.log("[Prefs] setHalalOnly", val);
      },
      [persist, prefs]
    );

    const setMaxDistanceKm = useCallback(
      (val: number | null) => {
        const next: Preferences = { ...prefs, maxDistanceKm: val };
        setPrefs(next);
        persist(next);
        console.log("[Prefs] setMaxDistanceKm", val);
      },
      [persist, prefs]
    );

    const setMinRating = useCallback(
      (val: number | null) => {
        const next: Preferences = { ...prefs, minRating: val };
        setPrefs(next);
        persist(next);
        console.log("[Prefs] setMinRating", val);
      },
      [persist, prefs]
    );

    const toggleIncludedCategory = useCallback(
      (cat: FoodCategory) => {
        const exists = prefs.includedCategories.includes(cat);
        const includedCategories = exists
          ? prefs.includedCategories.filter((x) => x !== cat)
          : [...prefs.includedCategories, cat];
        const next: Preferences = { ...prefs, includedCategories };
        setPrefs(next);
        persist(next);
        console.log("[Prefs] toggleIncludedCategory", { cat, exists });
      },
      [persist, prefs]
    );

    const toggleExcludedSpotId = useCallback(
      (spotId: string) => {
        const exists = prefs.excludedSpotIds.includes(spotId);
        const excludedSpotIds = exists
          ? prefs.excludedSpotIds.filter((x) => x !== spotId)
          : [...prefs.excludedSpotIds, spotId];
        const next: Preferences = { ...prefs, excludedSpotIds };
        setPrefs(next);
        persist(next);
        console.log("[Prefs] toggleExcludedSpotId", { spotId, exists });
      },
      [persist, prefs]
    );

    const reset = useCallback(() => {
      setPrefs(DEFAULT_PREFS);
      persist(DEFAULT_PREFS);
      console.log("[Prefs] reset");
    }, [persist]);

    return useMemo<PreferencesState>(() => {
      return {
        isReady,
        prefs,
        setPriceRange,
        setHalalOnly,
        setMaxDistanceKm,
        setMinRating,
        toggleIncludedCategory,
        toggleExcludedSpotId,
        reset,
      };
    }, [
      isReady,
      prefs,
      reset,
      setHalalOnly,
      setMaxDistanceKm,
      setMinRating,
      setPriceRange,
      toggleExcludedSpotId,
      toggleIncludedCategory,
    ]);
  }
);
