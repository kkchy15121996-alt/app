import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import * as Haptics from "expo-haptics";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";
import { useCart } from "@/src/context/CartContext";
import { ADDRESS_ICONS, useAddress } from "@/src/context/AddressContext";
import { StreakCard } from "@/src/components/StreakRewards";

const ROWS = [
  { icon: "help-circle" as const, label: "Help & Support", sub: "support@kapabookbazaar.in" },
  { icon: "gift" as const, label: "Refer & Earn" },
  { icon: "document-text" as const, label: "Terms & Privacy" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addMany } = useCart();
  const { selected: address, addresses, openSheet } = useAddress();
  const orders = useQuery({ queryKey: ["orders"], queryFn: api.orders });
  const [reordering, setReordering] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reorder = async (orderId: string) => {
    setReordering(orderId);
    setReorderError(null);
    try {
      const res = await api.reorderItems(orderId);
      if (res.items.length === 0) {
        setReorderError("Those items are out of stock right now");
        return;
      }
      addMany(res.items);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push("/checkout");
    } catch {
      setReorderError("Couldn't reorder. Try again.");
    } finally {
      setReordering(null);
    }
  };

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

        <View style={{ paddingHorizontal: spacing.lg }}>
          <StreakCard compact />
        </View>

        {/* Saved addresses */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
          <TouchableOpacity onPress={openSheet} testID="profile-manage-addresses">
            <Text style={styles.link}>Manage</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
        >
          {addresses.map((a) => {
            const active = a.id === address?.id;
            return (
              <TouchableOpacity
                key={a.id}
                onPress={openSheet}
                style={[styles.addrChip, active && styles.addrChipActive]}
                testID={`profile-address-${a.label}`}
              >
                <Ionicons name={ADDRESS_ICONS[a.label]} size={14} color={active ? colors.onBrandPrimary : colors.brandPrimary} />
                <View>
                  <Text style={[styles.addrChipLabel, active && { color: colors.onBrandPrimary }]}>{a.label}</Text>
                  <Text style={[styles.addrChipStreet, active && { color: colors.onBrandPrimary }]} numberOfLines={1}>
                    {a.street}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={openSheet} style={styles.addrAdd} testID="profile-address-add">
            <Ionicons name="add" size={18} color={colors.brandPrimary} />
            <Text style={styles.addrAddText}>Add</Text>
          </TouchableOpacity>
        </ScrollView>

        <Text style={[styles.sectionTitle, { paddingHorizontal: spacing.lg, marginTop: spacing.lg }]}>Recent Orders</Text>
        {reorderError && <Text style={styles.error}>{reorderError}</Text>}
        {orders.isLoading ? (
          <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.brandPrimary} />
        ) : orders.data && orders.data.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            {orders.data.slice(0, 5).map((o: any) => {
              const itemCount = o.items.reduce((n: number, it: any) => n + it.quantity, 0);
              return (
                <View key={o.id} style={styles.orderRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.orderMain}
                    onPress={() => router.push(`/tracking/${o.id}`)}
                    testID={`order-row-${o.id}`}
                  >
                    <View style={styles.orderIcon}>
                      <Ionicons name="cube" size={20} color={colors.brandPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderId}>Order #{o.id.slice(0, 8).toUpperCase()}</Text>
                      <Text style={styles.orderMeta}>
                        {itemCount} item{itemCount === 1 ? "" : "s"} • ₹{o.totalAmount.toFixed(0)} • {dayjs(o.createdAt).format("D MMM")}
                      </Text>
                      {o.streakDiscount > 0 && (
                        <Text style={styles.orderReward}>Saved ₹{o.streakDiscount} with exam streak</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => reorder(o.id)}
                    disabled={reordering !== null}
                    style={styles.reorderBtn}
                    testID={`reorder-btn-${o.id}`}
                  >
                    {reordering === o.id ? (
                      <ActivityIndicator size="small" color={colors.brandPrimary} />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={14} color={colors.brandPrimary} />
                        <Text style={styles.reorderText}>Reorder</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
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
          <TouchableOpacity style={styles.menuRow} onPress={openSheet} testID="menu-Manage Addresses">
            <Ionicons name="location" size={20} color={colors.brandPrimary} />
            <Text style={styles.menuLabel}>Manage Addresses</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
          {ROWS.map((row) => (
            <TouchableOpacity key={row.label} style={styles.menuRow} testID={`menu-${row.label}`}>
              <Ionicons name={row.icon as any} size={20} color={colors.brandPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{row.label}</Text>
                {"sub" in row && row.sub ? <Text style={styles.menuSub}>{row.sub}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            // Hidden admin entry: tap the version footer 5 times
            tapCount.current += 1;
            if (tapTimer.current) clearTimeout(tapTimer.current);
            if (tapCount.current >= 5) {
              tapCount.current = 0;
              router.push("/admin");
              return;
            }
            tapTimer.current = setTimeout(() => (tapCount.current = 0), 1500);
          }}
          testID="profile-footer"
        >
          <Text style={styles.footer}>Kapa Book Bazaar v1.2 • Made with ❤️ in Delhi</Text>
          <Text style={styles.footer}>© 2026 Kapa Book Bazaar (kapabookbazaar.in). All rights reserved.</Text>
        </TouchableOpacity>
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

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.sm },
  link: { fontSize: 13, fontWeight: "700", color: colors.brandPrimary, marginBottom: spacing.sm },

  addrChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 200,
  },
  addrChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  addrChipLabel: { fontSize: 12, fontWeight: "800", color: colors.onSurface },
  addrChipStreet: { fontSize: 11, color: colors.muted, maxWidth: 140 },
  addrAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brandPrimary,
  },
  addrAddText: { fontSize: 12, fontWeight: "800", color: colors.brandPrimary },

  error: { color: colors.error, fontSize: 12, fontWeight: "600", paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md },
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
  orderReward: { fontSize: 11, color: colors.brandPrimary, fontWeight: "700", marginTop: 2 },
  reorderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 34,
    minWidth: 88,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandTertiary,
  },
  reorderText: { fontSize: 12, fontWeight: "800", color: colors.brandPrimary },

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
  menuLabel: { fontSize: 14, color: colors.onSurface, fontWeight: "500" },
  menuSub: { fontSize: 11, color: colors.muted, marginTop: 2 },

  footer: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 11,
    marginTop: spacing.xl,
  },
});
