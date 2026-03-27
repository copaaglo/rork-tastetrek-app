import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type StoredUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: number;
};

export type AuthState = {
  isReady: boolean;
  isAuthed: boolean;
  user: AuthUser | null;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const USERS_KEY = "tastetrek.auth.users.v1";
const SESSION_KEY = "tastetrek.auth.session.v1";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (e: unknown) {
    console.log("[Auth] safeParseJson error", e);
    return null;
  }
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const restore = useCallback(async () => {
    try {
      const sessionRaw = await AsyncStorage.getItem(SESSION_KEY);
      const session = safeParseJson<{ userId: string }>(sessionRaw);
      if (!session?.userId) {
        console.log("[Auth] no session");
        setUser(null);
        return;
      }

      const usersRaw = await AsyncStorage.getItem(USERS_KEY);
      const users = safeParseJson<StoredUser[]>(usersRaw) ?? [];
      const found = users.find((u) => u.id === session.userId) ?? null;

      if (!found) {
        console.log("[Auth] session user missing; clearing", session.userId);
        await AsyncStorage.removeItem(SESSION_KEY);
        setUser(null);
        return;
      }

      setUser({ id: found.id, name: found.name, email: found.email });
      console.log("[Auth] restored user", found.id);
    } catch (e: unknown) {
      console.log("[Auth] restore error", e);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        await restore();
      } finally {
        if (mounted) setIsReady(true);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [restore]);

  const signUp = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const name = input.name.trim();
      const email = normalizeEmail(input.email);
      const password = input.password;

      const usersRaw = await AsyncStorage.getItem(USERS_KEY);
      const users = safeParseJson<StoredUser[]>(usersRaw) ?? [];

      const exists = users.some((u) => normalizeEmail(u.email) === email);
      if (exists) {
        const err = new Error("EMAIL_IN_USE");
        console.log("[Auth] signUp email already used", email);
        throw err;
      }

      const newUser: StoredUser = {
        id: `u_${Date.now()}`,
        name: name || "Explorer",
        email,
        password,
        createdAt: Date.now(),
      };

      const nextUsers = [newUser, ...users];
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: newUser.id }));

      setUser({ id: newUser.id, name: newUser.name, email: newUser.email });
      console.log("[Auth] signUp ok", newUser.id);
    },
    []
  );

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    const email = normalizeEmail(input.email);
    const password = input.password;

    const usersRaw = await AsyncStorage.getItem(USERS_KEY);
    const users = safeParseJson<StoredUser[]>(usersRaw) ?? [];

    const found = users.find((u) => normalizeEmail(u.email) === email) ?? null;
    if (!found) {
      console.log("[Auth] signIn no user", email);
      throw new Error("INVALID_CREDENTIALS");
    }

    if (found.password !== password) {
      console.log("[Auth] signIn wrong password", found.id);
      throw new Error("INVALID_CREDENTIALS");
    }

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: found.id }));
    setUser({ id: found.id, name: found.name, email: found.email });
    console.log("[Auth] signIn ok", found.id);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    try {
      await AsyncStorage.removeItem(SESSION_KEY);
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
      signIn,
      signUp,
      logout,
    };
  }, [isReady, logout, signIn, signUp, user]);

  return value;
});
