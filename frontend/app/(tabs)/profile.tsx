import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const ROWS = [
  { icon: "location" as const, label: "Manage Addresses" },
  { icon: "help-circle" as const, label: "Help & Support" },
  { icon: "gift" as const, label: "Refer & Earn" },
  { icon: "document-text" as const, label: "Terms & Privacy" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const orders = useQuery({ queryKey: ["orders"], queryFn: api.orders });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHead}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.onBrandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Guest User</Text>
            <Text style={styles.phone}>+91 98XXXXXX21</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} testID="edit-profile-btn">
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {orders.isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.brandPrimary} />
        ) : orders.data && orders.data.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            {orders.data.slice(0, 5).map((o: any) => (
              <TouchableOpacity
                key={o.id}
                activeOpacity={0.85}
                style={styles.orderRow}
                onPress={() => router.push(`/tracking/${o.id}`)}
                testID={`order-row-${o.id}`}
              >
                <View style={styles.orderIcon}>
                  <Ionicons name="cube" size={20} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderId}>Order #{o.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={styles.orderMeta}>
                    {o.items.length} items • ₹{o.totalAmount.toFixed(0)} • {o.status}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="bag-outline" size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: spacing.sm }}>
              No orders yet. Start shopping!
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.menu}>
          {ROWS.map((row) => (
            <TouchableOpacity key={row.label} style={styles.menuRow} testID={`menu-${row.label}`}>
              <Ionicons name={row.icon as any} size={20} color={colors.brandPrimary} />
              <Text style={styles.menuLabel}>{row.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.footer}>Kapa Learning v1.0 • Made with ❤️ in Delhi</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  profileHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  phone: { fontSize: 13, color: colors.muted, marginTop: 2 },
  editBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  editText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 12 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  orderId: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  orderMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },

  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },

  divider: { height: 8, backgroundColor: colors.surfaceSecondary, marginTop: spacing.lg },

  menu: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 14, color: colors.onSurface, fontWeight: "500" },

  footer: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.xl,
  },
});
