import React from "react";

import { Image } from "expo-image";
import { Tabs } from "expo-router";
import { Compass, SlidersHorizontal } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import Colors from "@/constants/colors";
import { BRAND } from "@/constants/branding";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: true,
        headerTitle: "",
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: "#FFFFFF",
        },
        headerLeft: () => (
          <View style={styles.headerLeft} testID="tabs-header-left">
            <Image
              source={{ uri: BRAND.logoUrl }}
              style={styles.headerLogo}
              contentFit="contain"
              transition={150}
              testID="tabs-header-logo"
            />
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
  headerLeft: {
    marginLeft: 8,
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerLogo: {
    width: 22,
    height: 22,
  },

});
