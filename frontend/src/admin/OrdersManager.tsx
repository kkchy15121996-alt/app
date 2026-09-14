import React, { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { adminApi, type AdminOrder } from "@/src/admin/adminApi";
import { Banner, Button, Chip, ui } from "@/src/admin/ui";

const STATUS_COLORS: Record<string, string> = {
  confirmed: colors.warning,
  packed: colors.info,
  dispatched: colors.brandPrimary,
  delivered: colors.muted,
  cancelled: colors.error,
};

const FILTERS = ["all", "confirmed", "dispatched", "delivered", "cancelled"] as const;

export function OrdersManager() {
  const qc = useQueryClient();
  const orders = useQuery({ queryKey: ["admin", "orders"], queryFn: adminApi.orders, refetchInterval: 10000 });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.setOrderStatus(id, status),
    onMutate: ({ id }) => setBusy(id),
    onSettled: () => setBusy(null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
    onError: (e: Error) => setMsg(e.message),
  });

  const list = useMemo(
    () => (orders.data ?? []).filter((o) => filter === "all" || (filter === "confirmed" ? ["confirmed", "packed"].includes(o.status) : o.status === filter)),
    [orders.data, filter],
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: spacing.sm }} style={{ flexGrow: 0 }}>
        {FILTERS.map((f) => (
          <Chip key={f} label={f === "all" ? "All" : f === "confirmed" ? "To dispatch" : f[0].toUpperCase() + f.slice(1)} active={filter === f} onPress={() => setFilter(f)} testID={`admin-orders-filter-${f}`} />
        ))}
      </ScrollView>
      {msg && <Banner kind="error" text={msg} />}
      {orders.isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: spacing.sm }} showsVerticalScrollIndicator={false}>
          {list.map((o) => <OrderCard key={o.id} order={o} busy={busy === o.id} onStatus={(s) => setStatus.mutate({ id: o.id, status: s })} />)}
          {list.length === 0 && <Text style={styles.empty}>No orders here.</Text>}
        </ScrollView>
      )}
    </View>
  );
}

function OrderCard({ order: o, busy, onStatus }: { order: AdminOrder; busy: boolean; onStatus: (s: string) => void }) {
  const itemCount = o.items.reduce((n, it) => n + it.quantity, 0);
  const color = STATUS_COLORS[o.status] ?? colors.muted;
  return (
    <View style={ui.card} testID={`admin-order-${o.id}`}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderId}>#{o.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.meta}>{dayjs(o.createdAt).format("D MMM, h:mm A")} • {itemCount} item{itemCount === 1 ? "" : "s"}</Text>
        </View>
        <View style={[styles.status, { backgroundColor: `${color}22` }]}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{o.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.addr}>
        <Ionicons name="location" size={14} color={colors.brandPrimary} />
        <Text style={styles.addrText} numberOfLines={2}>{o.address.street} • {o.address.pincode}</Text>
      </View>
      {o.address.instructions && o.address.instructions.length > 0 && (
        <Text style={styles.instr}>Note: {o.address.instructions.join(", ").replace(/-/g, " ")}</Text>
      )}

      <View style={styles.items}>
        {o.items.map((it, i) => (
          <Text key={`${it.productId}-${i}`} style={styles.item} numberOfLines={1}>
            {it.quantity} × {it.title} <Text style={{ color: colors.muted }}>₹{it.unitPrice * it.quantity}</Text>
          </Text>
        ))}
      </View>

      <View style={styles.payRow}>
        <View style={[styles.payBadge, o.paymentStatus === "paid" ? { backgroundColor: colors.brandSecondary } : { backgroundColor: "#FFF4DE" }]}>
          <Ionicons name={o.paymentStatus === "paid" ? "checkmark-circle" : "time"} size={12} color={o.paymentStatus === "paid" ? colors.brandPrimary : colors.warning} />
          <Text style={[styles.payText, { color: o.paymentStatus === "paid" ? colors.brandPrimary : colors.warning }]}>
            {o.paymentMethod} • {o.paymentStatus === "paid" ? "PAID" : "COLLECT ON DELIVERY"}
          </Text>
        </View>
        <Text style={styles.total}>₹{o.totalAmount.toFixed(0)}</Text>
      </View>

      <View style={styles.actions}>
        {["confirmed", "packed"].includes(o.status) && (
          <>
            <Button title="Mark Dispatched" icon="bicycle" small loading={busy} onPress={() => onStatus("dispatched")} testID={`admin-dispatch-${o.id}`} />
            <Button title="Cancel" variant="ghost" small disabled={busy} onPress={() => onStatus("cancelled")} testID={`admin-cancel-${o.id}`} />
          </>
        )}
        {o.status === "dispatched" && (
          <Button title="Mark Delivered" icon="checkmark-done" variant="outline" small loading={busy} onPress={() => onStatus("delivered")} testID={`admin-deliver-${o.id}`} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  orderId: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  status: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 24, borderRadius: radius.pill },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  addr: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: spacing.sm },
  addrText: { flex: 1, fontSize: 12, color: colors.onSurfaceSecondary },
  instr: { fontSize: 11, color: colors.muted, marginTop: 2, marginLeft: 20 },
  items: { marginTop: spacing.sm, gap: 2, backgroundColor: colors.surfaceSecondary, padding: spacing.sm, borderRadius: radius.sm },
  item: { fontSize: 12, color: colors.onSurface },
  payRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  payBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 24, borderRadius: radius.pill },
  payText: { fontSize: 10, fontWeight: "800" },
  total: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  actions: { flexDirection: "row", gap: 6, marginTop: spacing.sm, justifyContent: "flex-end", flexWrap: "wrap" },
  empty: { textAlign: "center", color: colors.muted, marginTop: spacing.xl },
});
