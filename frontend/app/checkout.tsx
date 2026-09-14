import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { useCart } from "@/src/context/CartContext";
import { ADDRESS_ICONS, useAddress } from "@/src/context/AddressContext";
import { useStreak } from "@/src/components/StreakRewards";
import { QuantityStepper } from "@/src/components/QuantityStepper";
import { api, imageUrl } from "@/src/lib/api";

const INSTRUCTIONS = [
  { id: "avoid-call", label: "Avoid Calling", icon: "call" as const },
  { id: "no-ring", label: "Don't Ring Bell", icon: "notifications-off" as const },
  { id: "leave-door", label: "Leave at Door", icon: "home" as const },
  { id: "security", label: "Leave with Security", icon: "shield-checkmark" as const },
];

const TIP_OPTIONS = [10, 20, 30, 50];

const PAYMENT_METHODS = [
  { id: "UPI" as const, label: "UPI (GPay, PhonePe, Paytm)", icon: "phone-portrait" as const, primary: true },
  { id: "CARD" as const, label: "Credit / Debit Card", icon: "card" as const, primary: false },
  { id: "COD" as const, label: "Cash on Delivery", icon: "cash" as const, primary: false },
];

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { lines, totalCount, totalPrice, addOne, removeOne, clear } = useCart();
  const { selected: address, openSheet } = useAddress();
  const streak = useStreak();
  const qc = useQueryClient();

  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([]);
  const [tip, setTip] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payingWith, setPayingWith] = useState<null | "UPI" | "CARD" | "COD">(null);
  const [placing, setPlacing] = useState(false);

  const handlingFee = 9;
  const deliveryCharge = totalPrice >= 199 ? 0 : 25;

  // Streak reward: % off study-supply items when ordering before the scheduled exam date
  const reward = streak.data;
  const studySubtotal = useMemo(() => {
    if (!reward?.active) return 0;
    return Object.values(lines).reduce(
      (sum, l) => (reward.studyCategories.includes(l.product.category) ? sum + l.quantity * l.product.salePrice : sum),
      0,
    );
  }, [lines, reward]);
  const streakDiscount = reward?.active && studySubtotal > 0 ? Math.round((studySubtotal * reward.discountPercent) / 100) : 0;

  const grandTotal = totalPrice + handlingFee + deliveryCharge + tip - streakDiscount;

  // Expected delivery window: 2-3 hours from now
  const deliveryWindow = useMemo(() => {
    const start = dayjs().add(2, "hour");
    const end = dayjs().add(3, "hour");
    return `${start.format("h:mm A")} – ${end.format("h:mm A")}${end.isSame(dayjs(), "day") ? ", today" : ", tomorrow"}`;
  }, []);

  const toggleInstruction = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedInstructions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submitOrder = async (method: "UPI" | "CARD" | "COD") => {
    setPayingWith(method);
    setPlacing(true);
    try {
      const payload = {
        userId: "guest",
        deliveryAddress: {
          street: address ? `${address.label} - ${address.street}${address.landmark ? `, ${address.landmark}` : ""}` : "Home - Swaroop Nagar, Delhi",
          pincode: address?.pincode ?? "110042",
          lat: address?.lat ?? 28.7085,
          lng: address?.lng ?? 77.1930,
          instructions: selectedInstructions,
        },
        items: Object.values(lines).map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          unitPrice: l.product.salePrice,
        })),
        tipAmount: tip,
        handlingFee,
        streakDiscount,
        totalAmount: Number(grandTotal.toFixed(2)),
        paymentMethod: method,
      };
      const res = await api.createOrder(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clear();
      qc.invalidateQueries({ queryKey: ["streak"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      setPaymentOpen(false);
      router.replace(`/tracking/${res.orderId}`);
    } catch (e) {
      // fail quietly for MVP; button re-enables
    } finally {
      setPlacing(false);
      setPayingWith(null);
    }
  };

  const empty = totalCount === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="checkout-close">
          <Ionicons name="close" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <Text style={styles.headerSub}>Delivery to {address?.label ?? "Home"} in 2-3 hrs</Text>
        </View>
      </View>

      {empty ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.back()}
            testID="empty-continue-shopping"
          >
            <Text style={styles.emptyBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Delivery Promise */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="time" size={16} color={colors.brandPrimary} />
                    <Text style={styles.cardTitle}>Delivery in 2-3 hours</Text>
                  </View>
                  <Text style={styles.cardSub}>Kapa Book Bazaar • Swaroop Nagar Store, Delhi</Text>
                </View>
                <View style={styles.slaBadge}>
                  <Text style={styles.slaText}>SAME DAY</Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.85} style={styles.etaBtn} testID="expected-delivery-btn">
                <Ionicons name="calendar-outline" size={16} color={colors.onBrandPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.etaBtnLabel}>Expected delivery time</Text>
                  <Text style={styles.etaBtnValue}>{deliveryWindow}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={18} color={colors.onBrandPrimary} />
              </TouchableOpacity>
            </View>

            {/* Delivery address (one-tap switch) */}
            <TouchableOpacity activeOpacity={0.85} onPress={openSheet} style={styles.card} testID="checkout-address-card">
              <View style={styles.rowBetween}>
                <View style={styles.addrIcon}>
                  <Ionicons name={address ? ADDRESS_ICONS[address.label] : "location"} size={18} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.cardTitle}>Delivering to {address?.label ?? "…"}</Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    {address ? `${address.street}${address.landmark ? `, ${address.landmark}` : ""} • ${address.pincode}` : "Select a saved address"}
                  </Text>
                </View>
                <Text style={styles.changeText}>CHANGE</Text>
              </View>
            </TouchableOpacity>

            {/* Streak reward banner */}
            {reward?.active && (
              <View style={[styles.card, styles.rewardCard]} testID="checkout-streak-banner">
                <Ionicons name="flame" size={18} color={colors.brandPrimary} />
                <Text style={styles.rewardText}>
                  {streakDiscount > 0
                    ? `Exam streak: ${reward.discountPercent}% off study supplies applied (−₹${streakDiscount})`
                    : `Add study supplies to get ${reward.discountPercent}% off before ${reward.examName}`}
                </Text>
              </View>
            )}

            {/* Items list */}
            <Text style={styles.sectionTitle}>{totalCount} items in cart</Text>
            <View style={styles.card}>
              {Object.values(lines).map((line, i) => (
                <View
                  key={line.product.id}
                  style={[
                    styles.itemRow,
                    i < Object.values(lines).length - 1 && styles.itemDivider,
                  ]}
                >
                  <Image
                    source={{ uri: imageUrl(line.product.images[0]) }}
                    style={styles.itemImg}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {line.product.title}
                    </Text>
                    <Text style={styles.itemSub}>{line.product.subtitle}</Text>
                    <Text style={styles.itemPrice}>₹{line.product.salePrice * line.quantity}</Text>
                  </View>
                  <QuantityStepper
                    quantity={line.quantity}
                    onAdd={() => addOne(line.product)}
                    onRemove={() => removeOne(line.product.id)}
                    testIDPrefix={`cart-${line.product.sku}`}
                  />
                </View>
              ))}
            </View>

            {/* Delivery instructions */}
            <Text style={styles.sectionTitle}>Delivery instructions</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
              style={{ flexGrow: 0 }}
            >
              {INSTRUCTIONS.map((it) => {
                const active = selectedInstructions.includes(it.id);
                return (
                  <TouchableOpacity
                    key={it.id}
                    activeOpacity={0.8}
                    onPress={() => toggleInstruction(it.id)}
                    style={[styles.chip, active && styles.chipActive]}
                    testID={`instr-${it.id}`}
                  >
                    <Ionicons
                      name={active ? "checkmark-circle" : (it.icon as any)}
                      size={14}
                      color={active ? colors.onBrandPrimary : colors.onSurface}
                    />
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {it.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Tip */}
            <Text style={styles.sectionTitle}>Tip your delivery partner</Text>
            <View style={styles.tipRow}>
              {TIP_OPTIONS.map((amt) => {
                const active = tip === amt;
                return (
                  <TouchableOpacity
                    key={amt}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setTip(active ? 0 : amt);
                    }}
                    style={[styles.tipChip, active && styles.tipChipActive]}
                    testID={`tip-${amt}`}
                  >
                    <Text style={[styles.tipText, active && styles.tipTextActive]}>₹{amt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Bill Summary */}
            <Text style={styles.sectionTitle}>Bill details • Kapa Book Bazaar</Text>
            <View style={styles.card}>
              <BillRow label="Item total" value={`₹${totalPrice.toFixed(0)}`} />
              <BillRow label="Handling fee" value={`₹${handlingFee}`} info />
              <BillRow
                label="Delivery charge"
                value={deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                valueColor={deliveryCharge === 0 ? colors.brandPrimary : colors.onSurface}
              />
              {tip > 0 && <BillRow label="Delivery tip" value={`₹${tip}`} />}
              {streakDiscount > 0 && (
                <BillRow
                  label={`Exam streak discount (${reward?.discountPercent}%)`}
                  value={`−₹${streakDiscount}`}
                  valueColor={colors.brandPrimary}
                />
              )}
              <View style={styles.billDivider} />
              <BillRow label="Grand Total" value={`₹${grandTotal.toFixed(0)}`} bold />
            </View>
          </ScrollView>

          {/* Pay Button */}
          <View style={[styles.payBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.payAmount}>₹{grandTotal.toFixed(0)}</Text>
              <Text style={styles.payHint}>TOTAL</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.payBtn}
              onPress={() => setPaymentOpen(true)}
              testID="proceed-to-pay-btn"
            >
              <Text style={styles.payBtnText}>Proceed to Pay</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.onBrandPrimary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Payment Modal */}
      <Modal
        visible={paymentOpen}
        transparent
        animationType="slide"
        onRequestClose={() => (!placing ? setPaymentOpen(false) : null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.paymentSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.dragHandle} />
            <Text style={styles.paymentTitle}>Choose payment method</Text>
            <Text style={styles.paymentSub}>You will pay ₹{grandTotal.toFixed(0)}</Text>

            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  disabled={placing}
                  activeOpacity={0.85}
                  onPress={() => submitOrder(m.id)}
                  style={[styles.payMethod, m.primary && styles.payMethodPrimary]}
                  testID={`pay-method-${m.id}`}
                >
                  <View style={styles.payMethodIcon}>
                    <Ionicons name={m.icon as any} size={20} color={colors.brandPrimary} />
                  </View>
                  <Text style={styles.payMethodLabel}>{m.label}</Text>
                  {payingWith === m.id && placing ? (
                    <ActivityIndicator color={colors.brandPrimary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              disabled={placing}
              onPress={() => setPaymentOpen(false)}
              style={styles.cancelBtn}
              testID="pay-cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function BillRow({
  label,
  value,
  bold,
  info,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  info?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={styles.billRow}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
        {info && <Ionicons name="information-circle-outline" size={12} color={colors.muted} />}
      </View>
      <Text style={[styles.billValue, bold && styles.billBold, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  headerSub: { fontSize: 12, color: colors.muted, marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  cardSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  slaBadge: {
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  slaText: { fontSize: 10, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.3 },
  etaBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    minHeight: 48,
  },
  etaBtnLabel: { fontSize: 10, fontWeight: "700", color: colors.onBrandPrimary, opacity: 0.85, letterSpacing: 0.3 },
  etaBtnValue: { fontSize: 14, fontWeight: "800", color: colors.onBrandPrimary, marginTop: 1 },
  addrIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  changeText: { fontSize: 11, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.3 },
  rewardCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    borderWidth: 1,
    borderColor: colors.brandSecondary,
  },
  rewardText: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.onBrandTertiary },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemImg: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.surfaceSecondary },
  itemTitle: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  itemSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: "700", color: colors.onSurface, marginTop: 4 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 36,
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  chipText: { fontSize: 12, color: colors.onSurface, fontWeight: "600" },
  chipTextActive: { color: colors.onBrandPrimary },

  tipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tipChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  tipChipActive: {
    backgroundColor: colors.brandSecondary,
    borderColor: colors.brandPrimary,
  },
  tipText: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  tipTextActive: { color: colors.brandPrimary },

  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  billLabel: { fontSize: 13, color: colors.onSurfaceSecondary },
  billValue: { fontSize: 13, color: colors.onSurface, fontWeight: "600" },
  billBold: { fontWeight: "800", fontSize: 15, color: colors.onSurface },
  billDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },

  payBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  payAmount: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  payHint: { fontSize: 10, color: colors.muted, fontWeight: "600" },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
  },
  payBtnText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 15 },

  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyText: { color: colors.muted, fontSize: 14 },
  emptyBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
  },
  emptyBtnText: { color: colors.onBrandPrimary, fontWeight: "700" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  paymentSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  paymentTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  paymentSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  payMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  payMethodPrimary: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandTertiary,
  },
  payMethodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  payMethodLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.onSurface },

  cancelBtn: {
    marginTop: spacing.md,
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  cancelText: { fontSize: 14, color: colors.muted, fontWeight: "600" },
});
