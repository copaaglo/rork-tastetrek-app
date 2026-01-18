import React from "react";

import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { Compass, SlidersHorizontal } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { BRAND } from "@/constants/branding";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: true,
        headerTitleAlign: "center",
        headerTitle: () => (
          <View style={styles.headerTitle} testID="tabs-header-title">
            <Image
              source={{ uri: BRAND.logoUrl }}
              style={styles.headerLogo}
              contentFit="contain"
              transition={150}
              testID="tabs-header-logo"
            />
            <Text style={styles.headerText} testID="tabs-header-text">
              {BRAND.appName}
            </Text>
          </View>
        ),
        tabBarStyle: {
          borderTopColor: "rgba(0,0,0,0.08)",
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size ?? 24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Filters",
          tabBarIcon: ({ color, size }) => (
            <SlidersHorizontal color={color} size={size ?? 24} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLogo: {
    width: 22,
    height: 22,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "900" as const,
    letterSpacing: -0.3,
    color: Colors.light.text,
  },
});
