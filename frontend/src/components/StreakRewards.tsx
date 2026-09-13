import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import dayjs from "dayjs";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const QUICK_DATES = [
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
  { label: "In 1 month", days: 30 },
  { label: "In 2 months", days: 60 },
];

const EXAM_SUGGESTIONS = ["Unit Test", "Half Yearly", "CBSE Boards", "JEE Main", "NEET", "UPSC Prelims"];

export function useStreak() {
  return useQuery({ queryKey: ["streak"], queryFn: api.streak });
}

export function StreakCard({ compact }: { compact?: boolean }) {
  const streak = useStreak();
  const [open, setOpen] = useState(false);
  const s = streak.data;

  if (streak.isLoading || !s) return null;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setOpen(true)}
        style={[styles.card, s.active && styles.cardActive]}
        testID="streak-card"
      >
        <View style={[styles.flameWrap, s.active && styles.flameWrapActive]}>
          <Ionicons name="flame" size={compact ? 20 : 24} color={s.active ? colors.onBrandPrimary : colors.warning} />
          {s.streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>{s.streak}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          {s.active ? (
            <>
              <Text style={styles.title}>
                {s.discountPercent}% off study supplies
                {s.streak > 0 ? ` • ${s.streak}-order streak` : ""}
              </Text>
              <Text style={styles.sub} numberOfLines={2}>
                {s.examName} in {s.daysLeft === 0 ? "today" : `${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"}`}.
                {s.discountPercent < s.maxPercent
                  ? ` Order again before it to unlock ${s.nextDiscountPercent}%.`
                  : " You're at the max reward!"}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Start an exam streak</Text>
              <Text style={styles.sub} numberOfLines={2}>
                Schedule your exam date and save {s.potentialPercent}% on study supplies every order before it.
              </Text>
            </>
          )}
        </View>
        <View style={styles.ctaPill}>
          <Text style={styles.ctaText}>{s.active ? "EDIT" : "SET DATE"}</Text>
        </View>
      </TouchableOpacity>
      <ExamDateSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ExamDateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const streak = useStreak();
  const [examName, setExamName] = useState("");
  const [dateText, setDateText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const s = streak.data;

  React.useEffect(() => {
    if (visible) {
      setExamName(s?.examName ?? "");
      setDateText(s?.examDate ? dayjs(s.examDate).format("DD/MM/YYYY") : "");
      setError(null);
    }
  }, [visible, s?.examName, s?.examDate]);

  const save = useMutation({
    mutationFn: ({ name, date }: { name: string; date: string }) => api.setExamDate(name, date),
    onSuccess: (data) => {
      qc.setQueryData(["streak"], data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
    },
    onError: (e: Error) => setError(e.message.includes("future") ? "Pick a date that hasn't passed" : "Couldn't save. Try again."),
  });

  const clear = useMutation({
    mutationFn: api.clearExamDate,
    onSuccess: (data) => {
      qc.setQueryData(["streak"], data);
      onClose();
    },
  });

  const pickQuick = (days: number) => {
    Haptics.selectionAsync().catch(() => {});
    setDateText(dayjs().add(days, "day").format("DD/MM/YYYY"));
    setError(null);
  };

  const onDateChange = (t: string) => {
    const digits = t.replace(/[^0-9]/g, "").slice(0, 8);
    let out = digits;
    if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    setDateText(out);
  };

  const onSave = () => {
    setError(null);
    if (examName.trim().length < 2) return setError("Give your exam a name");
    const m = dateText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return setError("Enter date as DD/MM/YYYY or pick a quick option");
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    if (!dayjs(iso).isValid()) return setError("That date doesn't look right");
    if (dayjs(iso).isBefore(dayjs().startOf("day"))) return setError("Pick a date that hasn't passed");
    save.mutate({ name: examName.trim(), date: iso });
  };

  const selectedDays = (() => {
    const m = dateText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    return dayjs(`${m[3]}-${m[2]}-${m[1]}`).diff(dayjs().startOf("day"), "day");
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <View style={[styles.flameWrap, styles.flameWrapActive]}>
                <Ionicons name="flame" size={22} color={colors.onBrandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Exam streak rewards</Text>
                <Text style={styles.sheetSub}>
                  Every study-supplies order before your exam adds +1% off (starts at 3%, max {s?.maxPercent ?? 10}%).
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="exam-sheet-close">
                <Ionicons name="close" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            {s && s.streak > 0 && (
              <View style={styles.streakRow}>
                <Text style={styles.streakRowText}>
                  Current streak: <Text style={{ fontWeight: "800", color: colors.brandPrimary }}>{s.streak} orders</Text>
                </Text>
                <Text style={styles.streakRowText}>Next order: {s.potentialPercent}% off</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Exam name</Text>
            <TextInput
              value={examName}
              onChangeText={setExamName}
              placeholder="e.g. CBSE Boards"
              placeholderTextColor={colors.muted}
              style={styles.input}
              testID="exam-name-input"
            />
            <View style={styles.suggestRow}>
              {EXAM_SUGGESTIONS.map((name) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => setExamName(name)}
                  style={[styles.suggestChip, examName === name && styles.suggestChipActive]}
                  testID={`exam-suggest-${name}`}
                >
                  <Text style={[styles.suggestText, examName === name && styles.suggestTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Exam date</Text>
            <View style={styles.quickRow}>
              {QUICK_DATES.map((q) => {
                const active = selectedDays === q.days;
                return (
                  <TouchableOpacity
                    key={q.days}
                    onPress={() => pickQuick(q.days)}
                    style={[styles.quickChip, active && styles.quickChipActive]}
                    testID={`exam-quick-${q.days}`}
                  >
                    <Text style={[styles.quickText, active && styles.quickTextActive]}>{q.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={dateText}
              onChangeText={onDateChange}
              placeholder="DD/MM/YYYY"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={10}
              style={styles.input}
              testID="exam-date-input"
            />
            {selectedDays !== null && selectedDays >= 0 && (
              <Text style={styles.hint}>
                {selectedDays === 0 ? "That's today" : `${selectedDays} days to go`} — orders until then earn streak rewards
              </Text>
            )}
            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              onPress={onSave}
              disabled={save.isPending}
              style={[styles.saveBtn, save.isPending && { opacity: 0.7 }]}
              testID="exam-save-btn"
            >
              {save.isPending ? (
                <ActivityIndicator color={colors.onBrandPrimary} />
              ) : (
                <Text style={styles.saveText}>{s?.active ? "Update exam date" : "Start my streak"}</Text>
              )}
            </TouchableOpacity>
            {s?.examDate && (
              <TouchableOpacity onPress={() => clear.mutate()} style={styles.clearBtn} testID="exam-clear-btn">
                <Text style={styles.clearText}>Remove exam date</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  flameWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  flameWrapActive: { backgroundColor: colors.brandPrimary },
  streakBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.warning,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  streakBadgeText: { fontSize: 9, fontWeight: "800", color: colors.onWarning },
  title: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  sub: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 2 },
  ctaPill: {
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  ctaText: { fontSize: 10, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.3 },

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
  sheetTitle: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  sheetSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.brandTertiary,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  streakRowText: { fontSize: 12, color: colors.onBrandTertiary, fontWeight: "600" },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.onSurfaceSecondary, marginTop: spacing.md, marginBottom: 6 },
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
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  suggestChip: {
    paddingHorizontal: 10,
    height: 30,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestChipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandSecondary },
  suggestText: { fontSize: 11, fontWeight: "600", color: colors.onSurface },
  suggestTextActive: { color: colors.brandPrimary },
  quickRow: { flexDirection: "row", gap: 6, marginBottom: spacing.sm },
  quickChip: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  quickText: { fontSize: 11, fontWeight: "700", color: colors.onSurface },
  quickTextActive: { color: colors.onBrandPrimary },
  hint: { fontSize: 12, color: colors.brandPrimary, marginTop: spacing.sm, fontWeight: "600" },
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
  clearBtn: { alignItems: "center", paddingVertical: spacing.md },
  clearText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
});
