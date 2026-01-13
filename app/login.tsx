import React, { useCallback, useMemo, useState } from "react";

import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { ShieldCheck } from "lucide-react-native";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import { useAuth } from "@/providers/auth";

function isEmailLike(v: string) {
  return /.+@.+\..+/.test(v.trim());
}

type AuthMode = "signIn" | "signUp";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signIn");

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [passwordConfirm, setPasswordConfirm] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const passwordOk = useMemo(() => {
    return password.trim().length >= 6;
  }, [password]);

  const canSubmit = useMemo(() => {
    if (!isEmailLike(email)) return false;

    if (mode === "signIn") {
      return passwordOk;
    }

    if (name.trim().length < 2) return false;
    if (!passwordOk) return false;
    if (password !== passwordConfirm) return false;
    return true;
  }, [email, mode, name, password, passwordConfirm, passwordOk]);

  const onSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    try {
      setIsSubmitting(true);
      console.log("[Login] submit", { mode, email: email.trim() });

      if (mode === "signIn") {
        await signIn({ email, password });
      } else {
        await signUp({ name, email, password });
      }

      router.replace("/(tabs)");
    } catch (e: unknown) {
      console.log("[Login] error", e);

      const msg =
        e instanceof Error && e.message === "EMAIL_IN_USE"
          ? "That email is already used. Try signing in instead."
          : e instanceof Error && e.message === "INVALID_CREDENTIALS"
            ? "Wrong email or password."
            : "Please try again.";

      Alert.alert(mode === "signIn" ? "Couldn’t sign in" : "Couldn’t sign up", msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, email, isSubmitting, mode, password, signIn, signUp, name]);

  return (
    <View style={styles.screen} testID="login-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#FFF2EF", "#F7F6F2", "#F7F6F2"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.content}
      >
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <ShieldCheck color={"#FFFFFF"} size={20} />
          </View>
          <Text style={styles.brandTitle}>TasteTrek</Text>
          <Text style={styles.brandSubtitle}>
            Swipe through nearby food spots, save your vibe, and get directions in
            one tap.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === "signIn" ? "Sign in" : "Create account"}
          </Text>
          <Text style={styles.cardHint}>
            {mode === "signIn"
              ? "Enter your email and password."
              : "Create a username, email, and password."}
          </Text>

          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setMode("signIn")}
              style={({ pressed }) => [
                styles.modePill,
                mode === "signIn" ? styles.modePillActive : null,
                pressed ? { opacity: 0.95 } : null,
              ]}
              testID="auth-tab-signin"
            >
              <Text
                style={[
                  styles.modePillText,
                  mode === "signIn" ? styles.modePillTextActive : null,
                ]}
              >
                Sign in
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode("signUp")}
              style={({ pressed }) => [
                styles.modePill,
                mode === "signUp" ? styles.modePillActive : null,
                pressed ? { opacity: 0.95 } : null,
              ]}
              testID="auth-tab-signup"
            >
              <Text
                style={[
                  styles.modePillText,
                  mode === "signUp" ? styles.modePillTextActive : null,
                ]}
              >
                Sign up
              </Text>
            </Pressable>
          </View>

          {mode === "signUp" ? (
            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Amina"
                placeholderTextColor="rgba(11,11,12,0.35)"
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.input}
                testID="signup-name"
                returnKeyType="next"
              />
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="amina@email.com"
              placeholderTextColor="rgba(11,11,12,0.35)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
              testID={mode === "signIn" ? "signin-email" : "signup-email"}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={"••••••••"}
              placeholderTextColor="rgba(11,11,12,0.35)"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={true}
              style={styles.input}
              testID={mode === "signIn" ? "signin-password" : "signup-password"}
              returnKeyType={mode === "signIn" ? "done" : "next"}
              onSubmitEditing={mode === "signIn" ? onSubmit : undefined}
            />
          </View>

          {mode === "signUp" ? (
            <View style={styles.field}>
              <Text style={styles.label}>Re-enter password</Text>
              <TextInput
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                placeholder={"••••••••"}
                placeholderTextColor="rgba(11,11,12,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={true}
                style={styles.input}
                testID="signup-password-confirm"
                returnKeyType="done"
                onSubmitEditing={onSubmit}
              />
              {passwordConfirm.length > 0 && password !== passwordConfirm ? (
                <Text style={styles.inlineError} testID="signup-password-mismatch">
                  Passwords don’t match
                </Text>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || isSubmitting}
            style={({ pressed }) => [
              styles.cta,
              !canSubmit || isSubmitting ? styles.ctaDisabled : null,
              pressed ? { transform: [{ scale: 0.99 }], opacity: 0.96 } : null,
            ]}
            testID={mode === "signIn" ? "signin-submit" : "signup-submit"}
          >
            <Text style={styles.ctaText}>
              {isSubmitting
                ? mode === "signIn"
                  ? "Signing in…"
                  : "Creating…"
                : mode === "signIn"
                  ? "Sign in"
                  : "Create account"}
            </Text>
          </Pressable>

          <Text style={styles.smallPrint}>
            Passwords are stored locally on this device for the demo.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 74,
  },
  brand: {
    paddingHorizontal: 4,
    paddingBottom: 18,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  brandTitle: {
    marginTop: 14,
    fontSize: 34,
    fontWeight: "900" as const,
    color: Colors.light.text,
    letterSpacing: -1.0,
  },
  brandSubtitle: {
    marginTop: 8,
    color: Colors.light.subtext,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 340,
  },
  card: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900" as const,
    color: Colors.light.text,
  },
  cardHint: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.light.subtext,
  },
  modeRow: {
    marginTop: 14,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 4,
    borderRadius: 16,
    gap: 6,
  },
  modePill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  modePillActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  modePillText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: "rgba(11,11,12,0.60)",
  },
  modePillTextActive: {
    color: "rgba(11,11,12,0.95)",
  },
  field: {
    marginTop: 14,
  },
  inlineError: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "800" as const,
    color: "rgba(217,45,32,0.95)",
  },
  label: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "rgba(11,11,12,0.7)",
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  cta: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.tint,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900" as const,
    letterSpacing: 0.2,
  },
  smallPrint: {
    marginTop: 12,
    fontSize: 12,
    color: "rgba(11,11,12,0.55)",
  },
});
