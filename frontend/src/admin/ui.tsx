import React from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";

export function Field({
  label,
  hint,
  error,
  testID,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string | null; testID?: string }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[ui.input, props.multiline && { height: 88, paddingTop: 12, textAlignVertical: "top" }, error && { borderColor: colors.error }]}
        testID={testID}
        {...props}
      />
      {hint && !error ? <Text style={ui.hint}>{hint}</Text> : null}
      {error ? <Text style={ui.error}>{error}</Text> : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  testID,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  testID?: string;
  small?: boolean;
}) {
  const bg =
    variant === "primary" ? colors.brandPrimary : variant === "danger" ? colors.error : "transparent";
  const fg =
    variant === "primary" || variant === "danger"
      ? colors.onBrandPrimary
      : variant === "ghost"
        ? colors.onSurfaceSecondary
        : colors.brandPrimary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      testID={testID}
      style={[
        ui.btn,
        small && ui.btnSmall,
        { backgroundColor: bg },
        variant === "outline" && { borderWidth: 1, borderColor: colors.brandPrimary },
        (disabled || loading) && { opacity: 0.6 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 14 : 16} color={fg} />}
          <Text style={[ui.btnText, small && { fontSize: 12 }, { color: fg }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[ui.chip, active && ui.chipActive]} testID={testID}>
      <Text style={[ui.chipText, active && ui.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Toggle({ value, onChange, label, testID }: { value: boolean; onChange: (v: boolean) => void; label: string; testID?: string }) {
  return (
    <TouchableOpacity onPress={() => onChange(!value)} style={ui.toggleRow} testID={testID}>
      <View style={[ui.track, value && ui.trackOn]}>
        <View style={[ui.knob, value && ui.knobOn]} />
      </View>
      <Text style={ui.toggleLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Banner({ kind, text }: { kind: "error" | "success" | "info"; text: string }) {
  const bg = kind === "error" ? "#FDECEA" : kind === "success" ? colors.brandSecondary : colors.surfaceSecondary;
  const fg = kind === "error" ? colors.error : kind === "success" ? colors.brandPrimary : colors.onSurfaceSecondary;
  return (
    <View style={[ui.banner, { backgroundColor: bg }]}>
      <Ionicons name={kind === "error" ? "alert-circle" : kind === "success" ? "checkmark-circle" : "information-circle"} size={16} color={fg} />
      <Text style={[ui.bannerText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", color: colors.onSurfaceSecondary, marginBottom: 6 },
  input: {
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.onSurface,
  },
  hint: { fontSize: 11, color: colors.muted, marginTop: 4 },
  error: { fontSize: 11, color: colors.error, marginTop: 4, fontWeight: "600" },
  btn: {
    height: 46,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnSmall: { height: 34, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  btnText: { fontWeight: "800", fontSize: 14 },
  chip: {
    paddingHorizontal: 12,
    height: 34,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  chipTextActive: { color: colors.onBrandPrimary },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: spacing.md, minHeight: 44 },
  track: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.border, padding: 3 },
  trackOn: { backgroundColor: colors.brandPrimary },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface },
  knobOn: { alignSelf: "flex-end" },
  toggleLabel: { fontSize: 14, color: colors.onSurface, fontWeight: "600" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, padding: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  bannerText: { flex: 1, fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: "92%",
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
});
