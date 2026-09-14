import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";

const OPTIONS = [
  { id: "op1", title: "Xerox / Photocopy", price: "₹2 / page", icon: "copy" as const, color: "#E6F5EC" },
  { id: "op2", title: "Colour Prints", price: "₹8 / page", icon: "color-palette" as const, color: "#FBCFE8" },
  { id: "op3", title: "Spiral Binding", price: "₹40 onwards", icon: "reload" as const, color: "#FDE68A" },
  { id: "op4", title: "Passport Photos", price: "₹80 / 8 copies", icon: "person" as const, color: "#BFDBFE" },
  { id: "op5", title: "Scanning", price: "₹5 / page", icon: "scan" as const, color: "#FED7AA" },
  { id: "op6", title: "Lamination", price: "₹15 onwards", icon: "layers" as const, color: "#DDD6FE" },
];

export default function PrintScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Kapa Book Bazaar Print Store</Text>
        <Text style={styles.subtitle}>Get prints & photocopies delivered in 30 mins</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, padding: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity activeOpacity={0.9} style={styles.uploadCard} testID="upload-doc-btn">
          <View style={styles.uploadIconWrap}>
            <Ionicons name="cloud-upload" size={28} color={colors.onBrandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadTitle}>Upload your document</Text>
            <Text style={styles.uploadSub}>PDF, DOC or images • up to 100 pages</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.onBrandPrimary} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Popular services</Text>
        <View style={styles.grid}>
          {OPTIONS.map((op) => (
            <TouchableOpacity
              key={op.id}
              activeOpacity={0.85}
              style={styles.optCard}
              testID={`print-opt-${op.id}`}
            >
              <View style={[styles.optIcon, { backgroundColor: op.color }]}>
                <Ionicons name={op.icon as any} size={22} color={colors.onSurface} />
              </View>
              <Text style={styles.optTitle}>{op.title}</Text>
              <Text style={styles.optPrice}>{op.price}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.brandPrimary} />
          <Text style={styles.infoText}>
            Custom bulk orders? Chat with support to get a personalised quote.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },

  uploadCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  uploadIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadTitle: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "800" },
  uploadSub: { color: colors.onBrandPrimary, fontSize: 12, opacity: 0.85, marginTop: 2 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  optCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 6,
  },
  optIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  optTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xs },
  optPrice: { fontSize: 12, color: colors.muted },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xl,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.onBrandTertiary },
});
