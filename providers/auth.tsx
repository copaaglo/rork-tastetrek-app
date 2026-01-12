import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthState = {
  isReady: boolean;
  isAuthed: boolean;
  user: AuthUser | null;
  login: (input: { name: string; email: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = "tastetrek.auth.user.v1";

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw) as AuthUser;
          setUser(parsed);
          console.log("[Auth] restored user", parsed.id);
        } else {
          console.log("[Auth] no stored user");
        }
      } catch (e: unknown) {
        console.log("[Auth] restore error", e);
      } finally {
        if (mounted) setIsReady(true);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (input: { name: string; email: string }) => {
    const newUser: AuthUser = {
      id: `u_${Date.now()}`,
      name: input.name.trim() || "Explorer",
      email: input.email.trim().toLowerCase(),
    };

    setUser(newUser);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      console.log("[Auth] login saved", newUser.id);
    } catch (e: unknown) {
      console.log("[Auth] login save error", e);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log("[Auth] logout cleared");
    } catch (e: unknown) {
      console.log("[Auth] logout remove error", e);
    }
  }, []);

  const value = useMemo<AuthState>(() => {
    return {
      isReady,
      isAuthed: Boolean(user),
      user,
      login,
      logout,
    };
  }, [isReady, login, logout, user]);

  return value;
});
