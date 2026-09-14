import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { useAdminAuth } from "@/src/admin/AdminAuthContext";
import { Banner, Button, Field } from "@/src/admin/ui";

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ready, email: signedIn, signIn } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && signedIn) router.replace("/admin/dashboard");
  }, [ready, signedIn, router]);

  const submit = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password");
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.replace("/admin/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={28} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.title}>Kapa Book Bazaar Admin</Text>
          <Text style={styles.sub}>Manage catalog, classes and orders. Changes go live instantly.</Text>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@kapabookbazaar.in"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            testID="admin-email-input"
          />
          <View style={{ position: "relative" }}>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPw}
              autoCapitalize="none"
              onSubmitEditing={submit}
              testID="admin-password-input"
            />
            <TouchableOpacity onPress={() => setShowPw((s) => !s)} style={styles.eye} hitSlop={8} testID="admin-toggle-password">
              <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
          {error && <Banner kind="error" text={error} />}
          <View style={{ marginTop: spacing.lg }}>
            <Button title="Sign in" icon="log-in-outline" loading={busy} onPress={submit} testID="admin-login-btn" />
          </View>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.back} testID="admin-back-to-app">
            <Ionicons name="arrow-back" size={14} color={colors.muted} />
            <Text style={styles.backText}>Back to the shop</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  card: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.brandPrimary, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface, marginTop: spacing.lg },
  sub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  eye: { position: "absolute", right: 12, bottom: 13, width: 24, height: 24, justifyContent: "center", alignItems: "center" },
  back: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: spacing.lg, minHeight: 40 },
  backText: { fontSize: 13, color: colors.muted, fontWeight: "600" },
});
