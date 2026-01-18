import React, { useCallback, useMemo } from "react";

import { Stack } from "expo-router";
import { Check, CircleDollarSign, LogOut, MapPin, SlidersHorizontal, Star } from "lucide-react-native";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { type FoodCategory, usePreferences } from "@/providers/preferences";
import { useAuth } from "@/providers/auth";

function PriceChip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.priceChip,
        selected ? styles.priceChipSelected : null,
        pressed ? { transform: [{ scale: 0.98 }] } : null,
      ]}
      testID={testID}
    >
      <Text style={[styles.priceChipText, selected ? styles.priceChipTextSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function FiltersScreen() {
  const {
    prefs,
    setHalalOnly,
    setMaxDistanceKm,
    setMinRating,
    setPriceRange,
    toggleIncludedCategory,
    reset,
  } = usePreferences();
  const { user, logout } = useAuth();

  const tiers = useMemo(() => [1, 2, 3, 4] as const, []);
  const distanceOptions = useMemo(() => [1, 2, 5, 10, 20] as const, []);
  const ratingOptions = useMemo(() => [3, 3.5, 4, 4.5] as const, []);

  const categories = useMemo(
    () =>
      [
        { key: "burgers", label: "Burgers" },
        { key: "pizza", label: "Pizza" },
        { key: "chicken", label: "Chicken" },
        { key: "tacos", label: "Tacos" },
        { key: "sandwiches", label: "Sandwiches" },
        { key: "coffee", label: "Coffee" },
        { key: "dessert", label: "Dessert" },
      ] as const,
    []
  );

  const onSelectMin = useCallback(
    (min: 1 | 2 | 3 | 4) => {
      const max = Math.max(min, prefs.priceMax) as 1 | 2 | 3 | 4;
      setPriceRange(min, max);
    },
    [prefs.priceMax, setPriceRange]
  );

  const onSelectMax = useCallback(
    (max: 1 | 2 | 3 | 4) => {
      const min = Math.min(prefs.priceMin, max) as 1 | 2 | 3 | 4;
      setPriceRange(min, max);
    },
    [prefs.priceMin, setPriceRange]
  );

  const onLogout = useCallback(() => {
    Alert.alert("Log out?", "You can sign back in anytime.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          logout().catch((e: unknown) => {
            console.log("[Settings] logout error", e);
          });
        },
      },
    ]);
  }, [logout]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
      testID="filters-screen"
    >
      <Stack.Screen
        options={{
          title: "Filters",
          headerTitleStyle: { fontWeight: "900" as const },
        }}
      />

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <SlidersHorizontal color={"#FFFFFF"} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Tune your TasteTrek</Text>
          <Text style={styles.heroSubtitle} numberOfLines={2}>
            Price, distance, rating, and food preferences — tuned your way.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <RowTitle icon={<CircleDollarSign size={18} color={Colors.light.text} />} title="Price range" />

        <Text style={styles.sectionHint}>Min</Text>
        <View style={styles.priceRow} testID="price-min-row">
          {tiers.map((t) => (
            <PriceChip
              key={`min-${t}`}
              label={"$".repeat(t)}
              selected={t === prefs.priceMin}
              onPress={() => onSelectMin(t)}
              testID={`price-min-${t}`}
            />
          ))}
        </View>

        <Text style={[styles.sectionHint, { marginTop: 12 }]}>Max</Text>
        <View style={styles.priceRow} testID="price-max-row">
          {tiers.map((t) => (
            <PriceChip
              key={`max-${t}`}
              label={"$".repeat(t)}
              selected={t === prefs.priceMax}
              onPress={() => onSelectMax(t)}
              testID={`price-max-${t}`}
            />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <RowTitle icon={<MapPin size={18} color={Colors.light.text} />} title="Distance" />

        <Text style={styles.sectionHint}>Max distance</Text>
        <View style={styles.chipRow} testID="distance-row">
          {distanceOptions.map((d) => {
            const selected = prefs.maxDistanceKm === d;
            return (
              <PriceChip
                key={`dist-${d}`}
                label={`${d} km`}
                selected={selected}
                onPress={() => setMaxDistanceKm(d)}
                testID={`distance-${d}`}
              />
            );
          })}
          <PriceChip
            label="Any"
            selected={prefs.maxDistanceKm == null}
            onPress={() => setMaxDistanceKm(null)}
            testID="distance-any"
          />
        </View>
      </View>

      <View style={styles.card}>
        <RowTitle icon={<Star size={18} color={Colors.light.text} />} title="Rating" />

        <Text style={styles.sectionHint}>Minimum rating</Text>
        <View style={styles.chipRow} testID="rating-row">
          {ratingOptions.map((r) => {
            const selected = prefs.minRating === r;
            return (
              <PriceChip
                key={`rating-${r}`}
                label={`${r}★+`}
                selected={selected}
                onPress={() => setMinRating(r)}
                testID={`rating-${String(r).replace(".", "_")}`}
              />
            );
          })}
          <PriceChip
            label="Any"
            selected={prefs.minRating == null}
            onPress={() => setMinRating(null)}
            testID="rating-any"
          />
        </View>
      </View>

      <View style={styles.card}>
        <RowTitle icon={<Check size={18} color={Colors.light.text} />} title="Preferences" />

        <Text style={styles.sectionHint}>Food types</Text>
        <View style={styles.chipRow} testID="categories-row">
          {categories.map((c) => {
            const selected = prefs.includedCategories.includes(c.key as FoodCategory);
            return (
              <PriceChip
                key={`cat-${c.key}`}
                label={c.label}
                selected={selected}
                onPress={() => toggleIncludedCategory(c.key as FoodCategory)}
                testID={`cat-${c.key}`}
              />
            );
          })}
        </View>

        <View style={[styles.switchRow, { marginTop: 12 }]} testID="halal-row">
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Halal only</Text>
            <Text style={styles.switchHint}>Show only places marked halal in our list.</Text>
          </View>
          <Switch
            value={prefs.halalOnly}
            onValueChange={setHalalOnly}
            trackColor={{ true: Colors.light.tint, false: "rgba(0,0,0,0.18)" }}
            thumbColor={"#FFFFFF"}
            testID="toggle-halal"
          />
        </View>

        <Pressable
          onPress={reset}
          style={({ pressed }) => [
            styles.resetBtn,
            pressed ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
          ]}
          testID="reset-filters"
        >
          <Text style={styles.resetText}>Reset filters</Text>
        </Pressable>
      </View>

      <View style={styles.accountCard} testID="account-card">
        <Text style={styles.accountTitle}>Signed in as</Text>
        <Text style={styles.accountName} numberOfLines={1}>
          {user?.name ?? "Explorer"}
        </Text>
        <Text style={styles.accountEmail} numberOfLines={1}>
          {user?.email ?? ""}
        </Text>

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed ? { transform: [{ scale: 0.99 }], opacity: 0.95 } : null,
          ]}
          testID="logout"
        >
          <LogOut size={18} color={"#FFFFFF"} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function RowTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View style={styles.rowTitle}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text style={styles.rowTitleText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
  },
  screenContent: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: Colors.light.text,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.subtext,
    lineHeight: 17,
  },
  card: {
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#FFFFFF",
    padding: 14,
  },
  rowTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: "rgba(255,77,46,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitleText: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: Colors.light.text,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "rgba(11,11,12,0.58)",
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  priceChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  priceChipSelected: {
    borderColor: "rgba(255,77,46,0.45)",
    backgroundColor: "rgba(255,77,46,0.10)",
  },
  priceChipText: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "rgba(11,11,12,0.60)",
    letterSpacing: 0.2,
  },
  priceChipTextSelected: {
    color: Colors.light.chipText,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "900" as const,
    color: Colors.light.text,
  },
  switchHint: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.light.subtext,
  },
  resetBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(247,246,242,0.9)",
  },
  resetText: {
    fontSize: 13,
    fontWeight: "900" as const,
    color: "rgba(11,11,12,0.80)",
  },
  accountCard: {
    marginTop: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#0B0B0C",
    padding: 16,
  },
  accountTitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  accountName: {
    marginTop: 6,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900" as const,
  },
  accountEmail: {
    marginTop: 4,
    color: "rgba(255,255,255,0.74)",
    fontSize: 12,
  },
  logoutBtn: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.tint,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900" as const,
  },
});
