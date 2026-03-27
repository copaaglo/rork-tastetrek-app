import React, { ReactNode, useEffect } from "react";

import { router, useSegments } from "expo-router";

import { useAuth } from "@/providers/auth";

export function AppGate({ children }: { children: ReactNode }) {
  const segments = useSegments();
  const { isReady, isAuthed } = useAuth();

  useEffect(() => {
    console.log("[AppGate] segments", segments, { isReady, isAuthed });
    if (!isReady) return;

    const first = (segments[0] ?? "") as string;
    const inAuth = first === "login";

    if (!isAuthed && !inAuth) {
      console.log("[AppGate] redirect -> /login");
      router.replace("/login");
      return;
    }

    if (isAuthed && inAuth) {
      console.log("[AppGate] redirect -> /(tabs)");
      router.replace("/(tabs)");
    }
  }, [isAuthed, isReady, segments]);

  return <>{children}</>;
}
