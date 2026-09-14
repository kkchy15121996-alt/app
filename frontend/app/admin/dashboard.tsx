import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { useAdminAuth } from "@/src/admin/AdminAuthContext";
import { adminApi } from "@/src/admin/adminApi";
import { ProductsManager } from "@/src/admin/ProductsManager";
import { ClassesManager } from "@/src/admin/ClassesManager";
import { OrdersManager } from "@/src/admin/OrdersManager";
import { Banner, Button, Field, ui } from "@/src/admin/ui";

type Tab = "products" | "classes" | "orders";
const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { key: "products", label: "Products", icon: "pricetags" },
  { key: "classes", label: "Classes", icon: "school" },
  { key: "orders", label: "Orders", icon: "receipt" },
];

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { ready, email, signOut } = useAdminAuth();
  const [tab, setTab] = useState<Tab>("products");
  const [pwOpen, setPwOpen] = useState(false);
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminApi.stats, enabled: !!email, refetchInterval: 15000 });
  const wide = width >= 900;

  useEffect(() => {
    if (ready && !email) router.replace("/admin");
  }, [ready, email, router]);

  if (!ready || !email) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={18} color={colors.onBrandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Kapa Book Bazaar Admin</Text>
            <Text style={styles.sub} numberOfLines={1}>{email}</Text>
          </View>
          <TouchableOpacity onPress={() => setPwOpen(true)} style={styles.hBtn} testID="admin-change-password-btn">
            <Ionicons name="key-outline" size={18} color={colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.hBtn} testID="admin-view-app-btn">
            <Ionicons name="storefront-outline" size={18} color={colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              await signOut();
              router.replace("/admin");
            }}
            style={styles.hBtn}
            testID="admin-logout-btn"
          >
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.content, wide && styles.contentWide]}>
        {/* Stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }} style={{ flexGrow: 0, marginBottom: spacing.sm }}>
          <Stat label="Live products" value={stats.data?.products} icon="pricetags" />
          <Stat label="Low stock" value={stats.data?.lowStock} icon="alert-circle" warn={(stats.data?.lowStock ?? 0) > 0} />
          <Stat label="To dispatch" value={stats.data?.pendingOrders} icon="bicycle" warn={(stats.data?.pendingOrders ?? 0) > 0} />
          <Stat label="Orders" value={stats.data?.orders} icon="receipt" />
          <Stat label="Revenue" value={stats.data ? `₹${stats.data.revenue}` : undefined} icon="cash" />
          <Stat label="Classes" value={stats.data?.classes} icon="school" />
        </ScrollView>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, active && styles.tabActive]} testID={`admin-tab-${t.key}`}>
                <Ionicons name={t.icon} size={16} color={active ? colors.onBrandPrimary : colors.onSurfaceSecondary} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ flex: 1 }}>
          {tab === "products" && <ProductsManager />}
          {tab === "classes" && <ClassesManager />}
          {tab === "orders" && <OrdersManager />}
        </View>
      </View>

      <PasswordSheet visible={pwOpen} onClose={() => setPwOpen(false)} />
    </View>
  );
}

function Stat({ label, value, icon, warn }: { label: string; value?: number | string; icon: React.ComponentProps<typeof Ionicons>["name"]; warn?: boolean }) {
  return (
    <View style={[styles.stat, warn && { borderColor: colors.warning, backgroundColor: "#FFF9EE" }]}>
      <Ionicons name={icon} size={16} color={warn ? colors.warning : colors.brandPrimary} />
      <Text style={styles.statValue}>{value ?? "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    if (visible) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setMsg(null);
    }
  }, [visible]);

  const change = useMutation({
    mutationFn: () => adminApi.changePassword(current, next),
    onSuccess: () => setMsg({ kind: "success", text: "Password updated. Use it on your next sign-in." }),
    onError: (e: Error) => setMsg({ kind: "error", text: e.message }),
  });

  const submit = () => {
    if (next.length < 8) return setMsg({ kind: "error", text: "New password must be at least 8 characters" });
    if (next !== confirm) return setMsg({ kind: "error", text: "Passwords don't match" });
    change.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ui.sheetBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[ui.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={ui.sheetHandle} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={ui.sheetTitle}>Change password</Text>
            <TouchableOpacity onPress={onClose} style={ui.closeBtn}><Ionicons name="close" size={20} color={colors.onSurface} /></TouchableOpacity>
          </View>
          <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry testID="pw-current" />
          <Field label="New password" value={next} onChangeText={setNext} secureTextEntry hint="At least 8 characters" testID="pw-new" />
          <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry testID="pw-confirm" />
          {msg && <Banner kind={msg.kind} text={msg.text} />}
          <View style={{ marginTop: spacing.lg }}>
            <Button title="Update password" loading={change.isPending} onPress={submit} testID="pw-save" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, width: "100%", maxWidth: 1100, alignSelf: "center" },
  logo: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.brandPrimary, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  sub: { fontSize: 11, color: colors.muted },
  hBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, justifyContent: "center", alignItems: "center" },
  content: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, width: "100%" },
  contentWide: { maxWidth: 1100, alignSelf: "center" },
  stat: {
    minWidth: 118,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  tabs: { flexDirection: "row", gap: 6, backgroundColor: colors.surface, padding: 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: radius.sm },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabText: { fontSize: 13, fontWeight: "700", color: colors.onSurfaceSecondary },
  tabTextActive: { color: colors.onBrandPrimary },
});
