import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { ADDRESS_ICONS, useAddress } from "@/src/context/AddressContext";
import type { AddressLabel } from "@/src/lib/api";

const LABELS: AddressLabel[] = ["Home", "Office", "Hostel", "Other"];

export function AddressSheet() {
  const insets = useSafeAreaInsets();
  const { addresses, selected, sheetOpen, closeSheet, select, add, remove, isSaving, isLoading } = useAddress();

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState<AddressLabel>("Home");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setStreet("");
    setLandmark("");
    setPincode("");
    setLabel("Home");
    setError(null);
    setAdding(false);
  };

  const close = () => {
    resetForm();
    closeSheet();
  };

  const onSelect = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    select(id);
    closeSheet();
  };

  const onSave = async () => {
    setError(null);
    if (street.trim().length < 3) return setError("Enter your house / flat & street");
    if (!/^\d{6}$/.test(pincode.trim())) return setError("Pincode must be 6 digits");
    try {
      await add({ label, street: street.trim(), landmark: landmark.trim(), pincode: pincode.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      resetForm();
      closeSheet();
    } catch {
      setError("Couldn't save address. Try again.");
    }
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await remove(id);
    } catch {
      setError("You need at least one saved address");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} testID="address-backdrop" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.handle} />
            <View style={styles.headRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{adding ? "Add new address" : "Deliver to"}</Text>
                <Text style={styles.sub}>
                  {adding ? "Saved for one-tap switching later" : "Tap an address to switch destination"}
                </Text>
              </View>
              <TouchableOpacity onPress={adding ? resetForm : close} style={styles.closeBtn} testID="address-sheet-close">
                <Ionicons name={adding ? "arrow-back" : "close"} size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            {adding ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Save as</Text>
                <View style={styles.labelRow}>
                  {LABELS.map((l) => {
                    const active = l === label;
                    return (
                      <TouchableOpacity
                        key={l}
                        onPress={() => setLabel(l)}
                        style={[styles.labelChip, active && styles.labelChipActive]}
                        testID={`address-label-${l}`}
                      >
                        <Ionicons
                          name={ADDRESS_ICONS[l]}
                          size={14}
                          color={active ? colors.onBrandPrimary : colors.onSurface}
                        />
                        <Text style={[styles.labelChipText, active && styles.labelChipTextActive]}>{l}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>House / Flat / Street *</Text>
                <TextInput
                  value={street}
                  onChangeText={setStreet}
                  placeholder="e.g. B-42, Swaroop Nagar"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  testID="address-street-input"
                />
                <Text style={styles.fieldLabel}>Landmark (optional)</Text>
                <TextInput
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder="e.g. Opposite DAV School gate"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  testID="address-landmark-input"
                />
                <Text style={styles.fieldLabel}>Pincode *</Text>
                <TextInput
                  value={pincode}
                  onChangeText={(t) => setPincode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="110042"
                  placeholderTextColor={colors.muted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                  testID="address-pincode-input"
                />
                {error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity
                  onPress={onSave}
                  disabled={isSaving}
                  style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                  testID="address-save-btn"
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.onBrandPrimary} />
                  ) : (
                    <Text style={styles.saveText}>Save & deliver here</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <>
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {isLoading && <ActivityIndicator color={colors.brandPrimary} style={{ marginVertical: spacing.lg }} />}
                  {addresses.map((a) => {
                    const active = a.id === selected?.id;
                    return (
                      <TouchableOpacity
                        key={a.id}
                        activeOpacity={0.85}
                        onPress={() => onSelect(a.id)}
                        style={[styles.addrRow, active && styles.addrRowActive]}
                        testID={`address-row-${a.label}`}
                      >
                        <View style={[styles.addrIcon, active && styles.addrIconActive]}>
                          <Ionicons
                            name={ADDRESS_ICONS[a.label] ?? "location"}
                            size={18}
                            color={active ? colors.onBrandPrimary : colors.brandPrimary}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.addrLabel}>{a.label}</Text>
                            {active && (
                              <View style={styles.activePill}>
                                <Text style={styles.activePillText}>DELIVERING HERE</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.addrStreet} numberOfLines={2}>
                            {a.street}
                            {a.landmark ? `, ${a.landmark}` : ""} • {a.pincode}
                          </Text>
                        </View>
                        {active ? (
                          <Ionicons name="checkmark-circle" size={22} color={colors.brandPrimary} />
                        ) : addresses.length > 1 ? (
                          <TouchableOpacity
                            onPress={() => onDelete(a.id)}
                            style={styles.trashBtn}
                            hitSlop={8}
                            testID={`address-delete-${a.label}`}
                          >
                            {deletingId === a.id ? (
                              <ActivityIndicator size="small" color={colors.muted} />
                            ) : (
                              <Ionicons name="trash-outline" size={18} color={colors.muted} />
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {error && <Text style={styles.error}>{error}</Text>}
                <TouchableOpacity
                  onPress={() => {
                    setError(null);
                    setAdding(true);
                  }}
                  style={styles.addBtn}
                  testID="address-add-new-btn"
                >
                  <Ionicons name="add-circle" size={20} color={colors.brandPrimary} />
                  <Text style={styles.addText}>Add new address</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },

  addrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  addrRowActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  addrIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.brandSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  addrIconActive: { backgroundColor: colors.brandPrimary },
  addrLabel: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  addrStreet: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  activePill: {
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  activePillText: { fontSize: 9, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.3 },
  trashBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brandPrimary,
    marginTop: spacing.xs,
  },
  addText: { color: colors.brandPrimary, fontWeight: "800", fontSize: 14 },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onSurfaceSecondary,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  labelRow: { flexDirection: "row", gap: spacing.sm },
  labelChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  labelChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  labelChipText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  labelChipTextActive: { color: colors.onBrandPrimary },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.onSurface,
  },
  error: { color: colors.error, fontSize: 12, marginTop: spacing.sm, fontWeight: "600" },
  saveBtn: {
    marginTop: spacing.lg,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  saveText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: 15 },
});
