import React, { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const { width } = Dimensions.get("window");
const MAP_W = width;
const MAP_H = Math.min(320, Dimensions.get("window").height * 0.42);

function PulseRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(2.2, { duration: 1600, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1600, easing: Easing.out(Easing.quad) }),
        withTiming(0.5, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [scale, opacity]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return <Animated.View style={[styles.pulseRing, style]} />;
}

function RiderMarker({ progress }: { progress: number }) {
  const px = useSharedValue(0);
  const py = useSharedValue(0);

  useEffect(() => {
    // Curved route from top-right (store) to bottom-left (destination)
    const startX = MAP_W - 60;
    const startY = 60;
    const endX = 60;
    const endY = MAP_H - 60;
    // Simple curved bezier position by progress
    const t = Math.max(0, Math.min(1, progress));
    const cx = MAP_W / 2 + 40;
    const cy = MAP_H / 2 - 40;
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * cx + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * cy + t * t * endY;
    px.value = withTiming(x, { duration: 800 });
    py.value = withTiming(y, { duration: 800 });
  }, [progress, px, py]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: px.value - 22 },
      { translateY: py.value - 22 },
    ],
  }));

  return (
    <Animated.View style={[styles.riderMarker, style]}>
      <View style={styles.riderBubble}>
        <Ionicons name="bicycle" size={20} color={colors.onBrandPrimary} />
      </View>
    </Animated.View>
  );
}

function RouteVisual({ progress }: { progress: number }) {
  return (
    <View style={styles.mapWrap}>
      {/* Faux street grid */}
      <View style={styles.mapBg}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridLine, { top: (MAP_H / 6) * i, width: "100%", height: 1 }]} />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridLine, { left: (MAP_W / 6) * i, top: 0, bottom: 0, width: 1 }]} />
        ))}
      </View>

      {/* Route curve using rotated pill */}
      <View style={styles.routeLine} />

      {/* Store pin */}
      <View style={[styles.storePin, { right: 40, top: 40 }]}>
        <Ionicons name="storefront" size={16} color={colors.onBrandPrimary} />
      </View>

      {/* Destination pin */}
      <View style={[styles.destPin, { left: 40, bottom: 40 }]}>
        <PulseRing />
        <View style={styles.destInner}>
          <Ionicons name="location" size={16} color={colors.onError} />
        </View>
      </View>

      <RiderMarker progress={progress} />
    </View>
  );
}

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const tracking = useQuery({
    queryKey: ["tracking", orderId],
    queryFn: () => api.tracking(orderId as string),
    enabled: !!orderId,
    refetchInterval: 3000,
  });

  const progress = tracking.data?.progress ?? 0;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.backBtn} testID="tracking-back">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Live Order Tracking</Text>
        <View style={{ width: 36 }} />
      </View>

      <RouteVisual progress={progress} />

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.etaCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.etaLabel}>Arriving in</Text>
            <Text style={styles.etaValue}>
              {tracking.data?.etaMinutes ?? "—"} min
            </Text>
          </View>
          <View style={styles.riderInfo}>
            <View style={styles.riderAvatar}>
              <Ionicons name="person" size={20} color={colors.onBrandPrimary} />
            </View>
            <View>
              <Text style={styles.riderName}>{tracking.data?.rider?.name ?? "Assigning..."}</Text>
              <Text style={styles.riderPhone}>{tracking.data?.rider?.phone ?? ""}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn} testID="call-rider-btn">
              <Ionicons name="call" size={18} color={colors.onBrandPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.stepsTitle}>Order Progress</Text>
        {tracking.isLoading && !tracking.data ? (
          <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.brandPrimary} />
        ) : (
          <View style={styles.steps}>
            {tracking.data?.stages?.map((s: any, i: number) => {
              const isCurrent = i === tracking.data?.currentStage;
              const isDone = s.completed;
              return (
                <View key={s.key} style={styles.stepRow}>
                  <View style={styles.stepIconCol}>
                    <View
                      style={[
                        styles.stepDot,
                        isDone && styles.stepDotDone,
                        isCurrent && !isDone && styles.stepDotCurrent,
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={14} color={colors.onBrandPrimary} />
                      ) : isCurrent ? (
                        <View style={styles.stepInnerDot} />
                      ) : null}
                    </View>
                    {i < 3 && (
                      <View
                        style={[
                          styles.stepConnector,
                          isDone && styles.stepConnectorDone,
                        ]}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1, paddingTop: 2, paddingBottom: spacing.md }}>
                    <Text style={[styles.stepLabel, (isDone || isCurrent) && styles.stepLabelActive]}>
                      {s.label}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.stepMeta}>In progress...</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.detailsBtn} testID="order-details-btn">
          <Ionicons name="document-text-outline" size={18} color={colors.brandPrimary} />
          <Text style={styles.detailsText}>Order Details • #{String(orderId).slice(0, 8).toUpperCase()}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  topTitle: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "800", color: colors.onSurface },

  mapWrap: {
    width: MAP_W,
    height: MAP_H,
    backgroundColor: "#E8F0EA",
    overflow: "hidden",
  },
  mapBg: { ...StyleSheet.absoluteFillObject },
  gridLine: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  routeLine: {
    position: "absolute",
    top: MAP_H / 2 - 3,
    left: 40,
    right: 40,
    height: 6,
    backgroundColor: colors.brandPrimary,
    borderRadius: 3,
    transform: [{ rotate: "-25deg" }],
    opacity: 0.4,
  },
  storePin: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.surface,
  },
  destPin: {
    position: "absolute",
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  destInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.error,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.surface,
  },
  pulseRing: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.error,
  },
  riderMarker: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  riderBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    marginTop: -20,
  },

  etaCard: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  etaLabel: { fontSize: 12, color: colors.onBrandTertiary, fontWeight: "600" },
  etaValue: { fontSize: 28, fontWeight: "800", color: colors.brandPrimary },

  riderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.brandSecondary,
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  riderName: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  riderPhone: { fontSize: 11, color: colors.muted },
  callBtn: {
    marginLeft: "auto",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
  },

  stepsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.onSurface,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  steps: {},
  stepRow: { flexDirection: "row", gap: spacing.md },
  stepIconCol: { alignItems: "center", width: 24 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotDone: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary,
  },
  stepDotCurrent: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.surface,
  },
  stepInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandPrimary,
  },
  stepConnector: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    minHeight: 30,
    marginTop: 2,
  },
  stepConnectorDone: { backgroundColor: colors.brandPrimary },
  stepLabel: { fontSize: 13, color: colors.muted, fontWeight: "500" },
  stepLabelActive: { color: colors.onSurface, fontWeight: "700" },
  stepMeta: { fontSize: 11, color: colors.brandPrimary, marginTop: 2, fontWeight: "600" },

  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    marginTop: spacing.lg,
  },
  detailsText: { flex: 1, fontSize: 13, color: colors.onSurface, fontWeight: "600" },
});
