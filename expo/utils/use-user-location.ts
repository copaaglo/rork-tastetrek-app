import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import * as Location from "expo-location";

export type LocationCoords = {
  latitude: number;
  longitude: number;
};

export type UserLocationResult = {
  isLoading: boolean;
  errorMessage: string | null;
  location: Location.LocationObject | null;
  coords: LocationCoords | null;
};

export function useUserLocation(): UserLocationResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        if (Platform.OS === "web") {
          if (typeof navigator === "undefined" || !navigator.geolocation) {
            console.log("[useUserLocation] web: geolocation not available");
            if (mounted) setErrorMessage("Location not available on this device.");
            return;
          }

          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const loc: Location.LocationObject = {
                  coords: {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    altitude: pos.coords.altitude,
                    accuracy: pos.coords.accuracy,
                    altitudeAccuracy: pos.coords.altitudeAccuracy,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                  },
                  timestamp: pos.timestamp,
                };
                console.log("[useUserLocation] web: got location", loc.coords);
                if (mounted) setLocation(loc);
                resolve();
              },
              (err) => {
                console.log("[useUserLocation] web: geolocation error", err);
                if (mounted)
                  setErrorMessage(
                    "Enable location permissions to see nearby food spots."
                  );
                resolve();
              },
              { enableHighAccuracy: true, timeout: 8000, maximumAge: 10_000 }
            );
          });

          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log("[useUserLocation] native permission", status);
        if (status !== "granted") {
          if (mounted)
            setErrorMessage(
              "Enable location permissions to see nearby food spots."
            );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        console.log("[useUserLocation] native: got location", loc.coords);
        if (mounted) setLocation(loc);
      } catch (e: unknown) {
        console.log("[useUserLocation] error", e);
        if (mounted) setErrorMessage("Could not fetch your location.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  const coords = useMemo<LocationCoords | null>(() => {
    if (!location?.coords) return null;
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  }, [location?.coords]);

  return { isLoading, errorMessage, location, coords };
}
