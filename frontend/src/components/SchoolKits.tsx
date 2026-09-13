import React, { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, type Kit } from "@/src/lib/api";
import { useCart } from "@/src/context/CartContext";

function KitCard({ kit, onOpen, onAdd, added }: { kit: Kit; onOpen: () => void; onAdd: () => void; added: boolean }) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onOpen} style={styles.card} testID={`kit-card-${kit.id}`}>
      <View style={[styles.cardTop, { backgroundColor: kit.color }]}>
        <View style={styles.gradePill}>
          <Text style={styles.gradeText}>{kit.grade}</Text>
        </View>
        <Image source={{ uri: kit.image }} style={styles.cardImg} contentFit="cover" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{kit.title}</Text>
        <Text style={styles.cardMeta}>{kit.itemCount} items • Save ₹{kit.savings}</Text>
        <View style={styles.cardFooter}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.cardPrice}>₹{kit.kitPrice}</Text>
            <Text style={styles.cardMrp}>₹{kit.mrpTotal}</Text>
          </View>
          <TouchableOpacity
            onPress={onAdd}
            style={[styles.addBtn, added && styles.addBtnDone]}
            testID={`kit-add-${kit.id}`}
          >
            <Ionicons name={added ? "checkmark" : "add"} size={14} color={added ? colors.onBrandPrimary : colors.brandPrimary} />
            <Text style={[styles.addText, added && styles.addTextDone]}>{added ? "ADDED" : "ADD KIT"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function SchoolKitsSection() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addMany } = useCart();
  const kits = useQuery({ queryKey: ["kits"], queryFn: api.kits });
  const [openKit, setOpenKit] = useState<Kit | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  const addKit = (kit: Kit) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addMany(kit.items);
    setAddedIds((prev) => (prev.includes(kit.id) ? prev : [...prev, kit.id]));
    setTimeout(() => setAddedIds((prev) => prev.filter((id) => id !== kit.id)), 2200);
  };

  if (kits.isLoading) return <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.lg }} />;
  if (!kits.data?.length) return null;

  return (
    <View>
      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionTitle}>School Kits by Class</Text>
          <Text style={styles.sectionSub}>Everything for a grade, one tap</Text>
        </View>
        <View style={styles.bulkPill}>
          <Ionicons name="cube" size={12} color={colors.brandPrimary} />
          <Text style={styles.bulkText}>BULK</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingTop: spacing.md }}
        style={{ marginHorizontal: -spacing.lg }}
      >
        {kits.data.map((kit) => (
          <KitCard
            key={kit.id}
            kit={kit}
            added={addedIds.includes(kit.id)}
            onOpen={() => setOpenKit(kit)}
            onAdd={() => addKit(kit)}
          />
        ))}
      </ScrollView>

      <Modal visible={!!openKit} transparent animationType="slide" onRequestClose={() => setOpenKit(null)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpenKit(null)} />
          {openKit && (
            <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
              <View style={styles.handle} />
              <View style={styles.sheetHead}>
                <View style={[styles.sheetThumb, { backgroundColor: openKit.color }]}>
                  <Image source={{ uri: openKit.image }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetGrade}>{openKit.grade}</Text>
                  <Text style={styles.sheetTitle}>{openKit.title}</Text>
                  <Text style={styles.sheetTagline}>{openKit.tagline}</Text>
                </View>
                <TouchableOpacity onPress={() => setOpenKit(null)} style={styles.closeBtn} testID="kit-sheet-close">
                  <Ionicons name="close" size={20} color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <Text style={styles.contentsTitle}>What's inside ({openKit.itemCount} items)</Text>
              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                {openKit.items.map((it) => (
                  <View key={it.product.id} style={styles.itemRow}>
                    <Image source={{ uri: it.product.images[0] }} style={styles.itemImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{it.product.title}</Text>
                      <Text style={styles.itemSub} numberOfLines={1}>{it.product.subtitle}</Text>
                    </View>
                    <Text style={styles.itemQty}>×{it.quantity}</Text>
                    <Text style={styles.itemPrice}>₹{it.product.salePrice * it.quantity}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Kit total</Text>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                    <Text style={styles.totalPrice}>₹{openKit.kitPrice}</Text>
                    <Text style={styles.totalMrp}>₹{openKit.mrpTotal}</Text>
                  </View>
                </View>
                <View style={styles.savePill}>
                  <Text style={styles.saveText}>You save ₹{openKit.savings}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cta}
                onPress={() => {
                  addKit(openKit);
                  setOpenKit(null);
                  router.push("/checkout");
                }}
                testID="kit-sheet-add-btn"
              >
                <Ionicons name="cart" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.ctaText}>Add all {openKit.itemCount} items to cart</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const CARD_W = 168;

const styles = StyleSheet.create({
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  sectionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  bulkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  bulkText: { fontSize: 10, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.4 },

  card: {
    width: CARD_W,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  cardTop: { height: 96, position: "relative" },
  cardImg: { width: "100%", height: "100%", opacity: 0.85 },
  gradePill: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 2,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  gradeText: { fontSize: 10, fontWeight: "800", color: colors.onSurface },
  cardBody: { padding: spacing.sm, gap: 2 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: colors.onSurface },
  cardMeta: { fontSize: 11, color: colors.brandPrimary, fontWeight: "600" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm, gap: 4 },
  cardPrice: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  cardMrp: { fontSize: 11, color: colors.muted, textDecorationLine: "line-through" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    backgroundColor: colors.surface,
  },
  addBtnDone: { backgroundColor: colors.brandPrimary },
  addText: { fontSize: 11, fontWeight: "800", color: colors.brandPrimary },
  addTextDone: { color: colors.onBrandPrimary },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetHead: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  sheetThumb: { width: 56, height: 56, borderRadius: radius.md, overflow: "hidden" },
  sheetGrade: { fontSize: 11, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.4 },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  sheetTagline: { fontSize: 12, color: colors.muted, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  contentsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemImg: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.surfaceSecondary },
  itemTitle: { fontSize: 13, fontWeight: "600", color: colors.onSurface },
  itemSub: { fontSize: 11, color: colors.muted },
  itemQty: { fontSize: 12, fontWeight: "700", color: colors.muted, width: 28, textAlign: "right" },
  itemPrice: { fontSize: 13, fontWeight: "700", color: colors.onSurface, width: 56, textAlign: "right" },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  totalLabel: { fontSize: 11, color: colors.muted, fontWeight: "600" },
  totalPrice: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  totalMrp: { fontSize: 13, color: colors.muted, textDecorationLine: "line-through" },
  savePill: { backgroundColor: colors.brandSecondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  saveText: { fontSize: 12, fontWeight: "800", color: colors.brandPrimary },

  cta: {
    marginTop: spacing.md,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 15 },
});
