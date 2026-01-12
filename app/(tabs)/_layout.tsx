import React from "react";

import { Tabs } from "expo-router";
import { Compass, SlidersHorizontal } from "lucide-react-native";

import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: true,
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
          tabBarIcon: ({ color, size }) => (
            <Compass color={color} size={size ?? 24} />
          ),
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
