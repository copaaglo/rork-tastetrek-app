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

export default function LoginScreen() {
  const { login } = useAuth();
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canSubmit = useMemo(() => {
    return name.trim().length >= 2 && isEmailLike(email);
  }, [email, name]);

  const onSubmit = useCallback(async () => {
    if (!canSubmit || isSubmitting) return;

    try {
      setIsSubmitting(true);
      console.log("[Login] submit", { name, email });
      await login({ name, email });
      router.replace("/(tabs)");
    } catch (e: unknown) {
      console.log("[Login] error", e);
      Alert.alert("Couldn’t sign in", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, email, isSubmitting, login, name]);

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
          <Text style={styles.cardTitle}>Sign in</Text>
          <Text style={styles.cardHint}>We’ll use this to personalize your picks.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Amina"
              placeholderTextColor="rgba(11,11,12,0.35)"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.input}
              testID="login-name"
              returnKeyType="next"
            />
          </View>

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
              testID="login-email"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
          </View>

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit || isSubmitting}
            style={({ pressed }) => [
              styles.cta,
              !canSubmit || isSubmitting ? styles.ctaDisabled : null,
              pressed ? { transform: [{ scale: 0.99 }], opacity: 0.96 } : null,
            ]}
            testID="login-submit"
          >
            <Text style={styles.ctaText}>
              {isSubmitting ? "Signing in…" : "Continue"}
            </Text>
          </Pressable>

          <Text style={styles.smallPrint}>
            This is a demo login for the first version.
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
  field: {
    marginTop: 14,
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
