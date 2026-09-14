import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { imageUrl, type ClassSession } from "@/src/lib/api";
import { adminApi, type ClassInput } from "@/src/admin/adminApi";
import { Banner, Button, Chip, Field, Toggle, ui } from "@/src/admin/ui";
import { pickAndUploadPdf } from "@/src/admin/upload";

const GRADES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "UPSC", "All"];

export function detectVideoType(url: string): "youtube" | "hls" | "none" {
  if (!url.trim()) return "none";
  if (/youtu\.?be/.test(url)) return "youtube";
  return "hls";
}

function ClassForm({ visible, onClose, item }: { visible: boolean; onClose: () => void; item?: ClassSession | null }) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("Class 10");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [date, setDate] = useState(""); // DD/MM/YYYY
  const [time, setTime] = useState(""); // HH:MM (24h)
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState<{ name: string; url: string }[]>([]);
  const [published, setPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(item?.title ?? "");
    setSubject(item?.subject ?? "");
    setGrade(item?.grade || "Class 10");
    setDescription(item?.description ?? "");
    setVideoUrl(item?.videoUrl ?? "");
    const d = item?.scheduledAt ? dayjs(item.scheduledAt) : null;
    setDate(d ? d.format("DD/MM/YYYY") : "");
    setTime(d ? d.format("HH:mm") : "");
    setDuration(String(item?.durationMinutes ?? 60));
    setNotes(item?.notes ?? []);
    setPublished(item?.isPublished ?? true);
    setError(null);
  }, [visible, item]);

  const save = useMutation({
    mutationFn: (body: ClassInput) => (item ? adminApi.updateClass(item.id, body) : adminApi.createClass(body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const fmtDate = (t: string) => {
    const digits = t.replace(/[^0-9]/g, "").slice(0, 8);
    if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };
  const fmtTime = (t: string) => {
    const digits = t.replace(/[^0-9]/g, "").slice(0, 4);
    return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
  };

  const onSave = () => {
    if (title.trim().length < 2) return setError("Title is required");
    let scheduledAt: string | null = null;
    if (date || time) {
      const m = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const tm = (time || "00:00").match(/^(\d{2}):(\d{2})$/);
      if (!m || !tm) return setError("Enter date as DD/MM/YYYY and time as HH:MM");
      const iso = dayjs(`${m[3]}-${m[2]}-${m[1]}T${tm[1]}:${tm[2]}:00`);
      if (!iso.isValid()) return setError("That date/time doesn't look right");
      scheduledAt = iso.toISOString();
    }
    const dur = Number(duration);
    if (!dur || dur < 5) return setError("Duration must be at least 5 minutes");
    setError(null);
    save.mutate({
      title: title.trim(),
      subject: subject.trim(),
      grade,
      description: description.trim(),
      videoUrl: videoUrl.trim(),
      videoType: detectVideoType(videoUrl),
      scheduledAt,
      durationMinutes: dur,
      notes,
      isPublished: published,
    });
  };

  const addPdf = async () => {
    setUploading(true);
    setError(null);
    try {
      const res = await pickAndUploadPdf();
      if (res) setNotes((n) => [...n, res]);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ui.sheetBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[ui.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={ui.sheetHandle} />
            <View style={styles.head}>
              <Text style={ui.sheetTitle}>{item ? "Edit class" : "New class / batch"}</Text>
              <TouchableOpacity onPress={onClose} style={ui.closeBtn} testID="class-form-close">
                <Ionicons name="close" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Field label="Class title *" value={title} onChangeText={setTitle} placeholder="Trigonometry – Heights & Distances" testID="class-title-input" />
              <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Mathematics" testID="class-subject-input" />
              <Text style={[ui.label, { marginTop: spacing.md }]}>Grade / Batch</Text>
              <View style={styles.chips}>
                {GRADES.map((g) => <Chip key={g} label={g} active={grade === g} onPress={() => setGrade(g)} testID={`class-grade-${g}`} />)}
              </View>
              <Field
                label="Video URL (YouTube or HLS .m3u8)"
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="https://youtu.be/… or https://…/stream.m3u8"
                autoCapitalize="none"
                hint={videoUrl ? `Detected: ${detectVideoType(videoUrl).toUpperCase()}` : undefined}
                testID="class-video-input"
              />
              <View style={styles.row}>
                <View style={{ flex: 1.2 }}>
                  <Field label="Date" value={date} onChangeText={(t) => setDate(fmtDate(t))} placeholder="DD/MM/YYYY" keyboardType="number-pad" maxLength={10} testID="class-date-input" />
                </View>
                <View style={{ flex: 0.8 }}>
                  <Field label="Time (24h)" value={time} onChangeText={(t) => setTime(fmtTime(t))} placeholder="17:30" keyboardType="number-pad" maxLength={5} testID="class-time-input" />
                </View>
                <View style={{ flex: 0.8 }}>
                  <Field label="Mins" value={duration} onChangeText={(t) => setDuration(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="60" testID="class-duration-input" />
                </View>
              </View>
              <Field label="Description" value={description} onChangeText={setDescription} placeholder="What will students learn?" multiline testID="class-desc-input" />

              <Text style={[ui.label, { marginTop: spacing.md }]}>PDF study notes</Text>
              {notes.map((n, i) => (
                <View key={`${n.url}-${i}`} style={styles.noteRow}>
                  <Ionicons name="document-text" size={16} color={colors.brandPrimary} />
                  <Text style={styles.noteName} numberOfLines={1}>{n.name}</Text>
                  <TouchableOpacity onPress={() => setNotes((all) => all.filter((_, j) => j !== i))} hitSlop={8} testID={`class-note-remove-${i}`}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </TouchableOpacity>
                </View>
              ))}
              <Button title="Attach PDF" icon="attach" variant="outline" small loading={uploading} onPress={addPdf} testID="class-attach-pdf-btn" />

              <Toggle value={published} onChange={setPublished} label="Visible to students" testID="class-published-toggle" />
              {error && <Banner kind="error" text={error} />}
              <View style={{ marginTop: spacing.lg }}>
                <Button title={item ? "Save class" : "Create class"} icon="save-outline" loading={save.isPending} onPress={onSave} testID="class-save-btn" />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function ClassesManager() {
  const qc = useQueryClient();
  const classes = useQuery({ queryKey: ["admin", "classes"], queryFn: adminApi.classes });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClassSession | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: adminApi.deleteClass,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{classes.data?.length ?? 0} classes</Text>
        <Button title="New class" icon="add" small onPress={() => setCreating(true)} testID="admin-new-class-btn" />
      </View>
      {msg && <Banner kind="error" text={msg} />}
      {classes.isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: spacing.sm, paddingTop: spacing.sm }} showsVerticalScrollIndicator={false}>
          {classes.data?.map((c) => (
            <View key={c.id} style={ui.card} testID={`admin-class-row-${c.id}`}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
                <View style={[styles.videoIcon, c.videoType === "none" && { backgroundColor: colors.surfaceSecondary }]}>
                  <Ionicons name={c.videoType === "youtube" ? "logo-youtube" : c.videoType === "hls" ? "videocam" : "videocam-off"} size={18} color={c.videoType === "none" ? colors.muted : colors.onBrandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{c.title}</Text>
                  <Text style={styles.meta}>
                    {c.grade}{c.subject ? ` • ${c.subject}` : ""} • {c.durationMinutes} min{!c.isPublished ? " • Hidden" : ""}
                  </Text>
                  <Text style={styles.when}>
                    {c.scheduledAt ? dayjs(c.scheduledAt).format("ddd, D MMM YYYY • h:mm A") : "Not scheduled"}
                  </Text>
                  {c.notes.length > 0 && (
                    <View style={styles.notesRow}>
                      {c.notes.map((n, i) => (
                        <TouchableOpacity key={i} onPress={() => Linking.openURL(imageUrl(n.url)!)} style={styles.notePill}>
                          <Ionicons name="document-text" size={12} color={colors.brandPrimary} />
                          <Text style={styles.notePillText} numberOfLines={1}>{n.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.rowActions}>
                <Button title="Edit" icon="create-outline" variant="outline" small onPress={() => setEditing(c)} testID={`admin-class-edit-${c.id}`} />
                <Button title="Delete" icon="trash-outline" variant="ghost" small onPress={() => del.mutate(c.id)} testID={`admin-class-delete-${c.id}`} />
              </View>
            </View>
          ))}
          {classes.data?.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="school-outline" size={40} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: spacing.sm, textAlign: "center" }}>
                No classes yet. Add a YouTube/HLS lesson with timings and PDF notes.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
      <ClassForm visible={creating} onClose={() => setCreating(false)} />
      <ClassForm visible={!!editing} item={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  count: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  row: { flexDirection: "row", gap: spacing.sm },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, minHeight: 40 },
  noteName: { flex: 1, fontSize: 13, color: colors.onSurface },
  videoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.error, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  when: { fontSize: 12, color: colors.brandPrimary, fontWeight: "700", marginTop: 4 },
  notesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  notePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandTertiary, paddingHorizontal: 8, height: 26, borderRadius: radius.pill, maxWidth: 200 },
  notePillText: { fontSize: 11, color: colors.brandPrimary, fontWeight: "600" },
  rowActions: { flexDirection: "row", justifyContent: "flex-end", gap: 6, marginTop: spacing.sm },
  empty: { alignItems: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
});
