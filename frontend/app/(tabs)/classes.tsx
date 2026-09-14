import React, { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { WebView } from "react-native-webview";
import { Image } from "expo-image";
import dayjs from "dayjs";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api, imageUrl, type ClassSession } from "@/src/lib/api";
import { useCart } from "@/src/context/CartContext";

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

function playerHtml(c: ClassSession): string | null {
  if (c.videoType === "youtube") {
    const id = youtubeId(c.videoUrl);
    if (!id) return null;
    return `<html><body style="margin:0;background:#000"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/${id}?playsinline=1&rel=0" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></body></html>`;
  }
  if (c.videoType === "hls") {
    return `<html><body style="margin:0;background:#000"><video controls playsinline autoplay style="width:100%;height:100%" src="${c.videoUrl}"></video><script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script><script>var v=document.querySelector('video');if(window.Hls&&Hls.isSupported()&&!v.canPlayType('application/vnd.apple.mpegurl')){var h=new Hls();h.loadSource(${JSON.stringify(c.videoUrl)});h.attachMedia(v);}</script></body></html>`;
  }
  return null;
}

function statusOf(c: ClassSession): { label: string; color: string } {
  if (!c.scheduledAt) return { label: "Recorded", color: colors.info };
  const start = dayjs(c.scheduledAt);
  const end = start.add(c.durationMinutes, "minute");
  const now = dayjs();
  if (now.isBefore(start)) return { label: `Starts ${start.format("D MMM, h:mm A")}`, color: colors.warning };
  if (now.isBefore(end)) return { label: "LIVE NOW", color: colors.error };
  return { label: "Recorded", color: colors.info };
}

export default function ClassesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { totalCount } = useCart();
  const classes = useQuery({ queryKey: ["classes"], queryFn: api.classes });
  const [open, setOpen] = useState<ClassSession | null>(null);
  const [grade, setGrade] = useState<string>("All");

  const grades = useMemo(() => ["All", ...Array.from(new Set((classes.data ?? []).map((c) => c.grade).filter(Boolean)))], [classes.data]);
  const list = useMemo(() => (classes.data ?? []).filter((c) => grade === "All" || c.grade === grade || c.grade === "All"), [classes.data, grade]);
  const html = open ? playerHtml(open) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Classes</Text>
        <Text style={styles.sub}>Live batches, recorded lessons & PDF notes</Text>
      </View>
      {grades.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 6 }} style={{ flexGrow: 0, marginBottom: spacing.sm }}>
          {grades.map((g) => (
            <TouchableOpacity key={g} onPress={() => setGrade(g)} style={[styles.chip, grade === g && styles.chipActive]} testID={`classes-grade-${g}`}>
              <Text style={[styles.chipText, grade === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {classes.isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: (totalCount > 0 ? 100 : 24) + insets.bottom }} showsVerticalScrollIndicator={false}>
          {list.map((c) => {
            const st = statusOf(c);
            return (
              <TouchableOpacity key={c.id} activeOpacity={0.9} onPress={() => setOpen(c)} style={styles.card} testID={`class-card-${c.id}`}>
                <View style={styles.thumb}>
                  {c.videoType === "youtube" && youtubeId(c.videoUrl) ? (
                    <Image source={{ uri: `https://img.youtube.com/vi/${youtubeId(c.videoUrl)}/hqdefault.jpg` }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  ) : (
                    <Ionicons name={c.videoType === "none" ? "document-text" : "play-circle"} size={40} color={colors.onBrandPrimary} />
                  )}
                  <View style={styles.playOverlay}>
                    <Ionicons name="play" size={22} color={colors.onBrandPrimary} />
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: st.color }]}>
                    <Text style={styles.statusText}>{st.label}</Text>
                  </View>
                </View>
                <View style={{ padding: spacing.md }}>
                  <Text style={styles.cardGrade}>{c.grade}{c.subject ? ` • ${c.subject}` : ""}</Text>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                    <Text style={styles.meta}>{c.scheduledAt ? dayjs(c.scheduledAt).format("ddd, D MMM • h:mm A") : "Watch anytime"}</Text>
                    <Ionicons name="time-outline" size={13} color={colors.muted} style={{ marginLeft: 8 }} />
                    <Text style={styles.meta}>{c.durationMinutes} min</Text>
                  </View>
                  {c.notes.length > 0 && (
                    <View style={styles.notesRow}>
                      {c.notes.map((n, i) => (
                        <TouchableOpacity key={i} onPress={() => Linking.openURL(imageUrl(n.url)!)} style={styles.notePill} testID={`class-note-${c.id}-${i}`}>
                          <Ionicons name="document-text" size={12} color={colors.brandPrimary} />
                          <Text style={styles.noteText} numberOfLines={1}>{n.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          {list.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="school-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No classes scheduled yet</Text>
              <Text style={styles.emptyText}>New batches and recorded lessons will appear here the moment they're published.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={!!open} animationType="slide" onRequestClose={() => setOpen(null)}>
        {open && (
          <View style={[styles.player, { paddingTop: insets.top }]}>
            <View style={styles.playerHead}>
              <TouchableOpacity onPress={() => setOpen(null)} style={styles.closeBtn} testID="class-player-close">
                <Ionicons name="close" size={22} color={colors.onSurface} />
              </TouchableOpacity>
              <Text style={styles.playerTitle} numberOfLines={1}>{open.title}</Text>
            </View>
            <View style={{ width, height: Math.round((width * 9) / 16), backgroundColor: "#000" }}>
              {html ? (
                Platform.OS === "web" && open.videoType === "youtube" ? (
                  <WebView source={{ uri: `https://www.youtube.com/embed/${youtubeId(open.videoUrl)}?rel=0` }} style={{ flex: 1 }} />
                ) : (
                  <WebView source={{ html }} style={{ flex: 1 }} allowsFullscreenVideo allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} javaScriptEnabled />
                )
              ) : (
                <View style={styles.noVideo}>
                  <Ionicons name="videocam-off" size={36} color={colors.onBrandPrimary} />
                  <Text style={{ color: colors.onBrandPrimary, marginTop: 8 }}>No video attached — check the notes below</Text>
                </View>
              )}
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
              <Text style={styles.cardGrade}>{open.grade}{open.subject ? ` • ${open.subject}` : ""}</Text>
              <Text style={[styles.cardTitle, { fontSize: 18 }]}>{open.title}</Text>
              <Text style={styles.meta}>
                {open.scheduledAt ? dayjs(open.scheduledAt).format("dddd, D MMMM YYYY • h:mm A") : "Recorded lesson"} • {open.durationMinutes} min
              </Text>
              {open.description ? <Text style={styles.desc}>{open.description}</Text> : null}
              {open.notes.length > 0 && (
                <>
                  <Text style={styles.notesTitle}>Study notes</Text>
                  {open.notes.map((n, i) => (
                    <TouchableOpacity key={i} onPress={() => Linking.openURL(imageUrl(n.url)!)} style={styles.noteRow} testID={`player-note-${i}`}>
                      <View style={styles.noteIcon}><Ionicons name="document-text" size={18} color={colors.brandPrimary} /></View>
                      <Text style={styles.noteRowText} numberOfLines={1}>{n.name}</Text>
                      <Ionicons name="download-outline" size={18} color={colors.muted} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chip: { paddingHorizontal: 12, height: 32, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  chipTextActive: { color: colors.onBrandPrimary },
  card: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: "hidden" },
  thumb: { height: 160, backgroundColor: colors.brandPrimary, justifyContent: "center", alignItems: "center", position: "relative" },
  playOverlay: { position: "absolute", width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  statusPill: { position: "absolute", top: 10, left: 10, paddingHorizontal: 8, height: 22, borderRadius: radius.pill, justifyContent: "center" },
  statusText: { fontSize: 10, fontWeight: "800", color: colors.onBrandPrimary, letterSpacing: 0.3 },
  cardGrade: { fontSize: 11, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.4 },
  cardTitle: { fontSize: 15, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  meta: { fontSize: 12, color: colors.muted },
  notesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  notePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandTertiary, paddingHorizontal: 8, height: 28, borderRadius: radius.pill, maxWidth: 220 },
  noteText: { fontSize: 11, fontWeight: "700", color: colors.brandPrimary },
  empty: { alignItems: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.onSurface, marginTop: spacing.md },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 4 },
  player: { flex: 1, backgroundColor: colors.surface },
  playerHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, justifyContent: "center", alignItems: "center" },
  playerTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: colors.onSurface },
  noVideo: { flex: 1, justifyContent: "center", alignItems: "center" },
  desc: { fontSize: 14, color: colors.onSurfaceSecondary, lineHeight: 21, marginTop: spacing.md },
  notesTitle: { fontSize: 14, fontWeight: "800", color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.sm },
  noteRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, minHeight: 52 },
  noteIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, justifyContent: "center", alignItems: "center" },
  noteRowText: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.onSurface },
});
