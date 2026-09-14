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
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";

const { width } = Dimensions.get("window");
const MAP_W = width;
const MAP_H = Math.min(320, Dimensions.get("window").height * 0.42);

// Route geometry: cubic Bézier from the dark store (top-right) to the customer (bottom-left)
const P0 = { x: MAP_W - 56, y: 64 };
const P1 = { x: MAP_W - 40, y: MAP_H * 0.62 };
const P2 = { x: MAP_W * 0.35, y: MAP_H * 0.28 };
const P3 = { x: 56, y: MAP_H - 56 };
const ROUTE_D = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P3.x} ${P3.y}`;

function bezierPoint(t: number) {
  "worklet";
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * P0.x + b * P1.x + c * P2.x + d * P3.x,
    y: a * P0.y + b * P1.y + c * P2.y + d * P3.y,
  };
}

// Approximate total path length so stroke-dash animation maps 1:1 to progress
const ROUTE_LENGTH = (() => {
  let len = 0;
  let prev = bezierPoint(0);
  for (let i = 1; i <= 200; i++) {
    const p = bezierPoint(i / 200);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
})();

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

/** Animated SVG polyline: travelled segment fills in, rider glides along the curve. */
function RouteVisual({ progress, arrived }: { progress: number; arrived: boolean }) {
  const t = useSharedValue(0);
  const wobble = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 2600, easing: Easing.inOut(Easing.cubic) });
  }, [progress, t]);

  useEffect(() => {
    wobble.value = withRepeat(withSequence(withTiming(-2, { duration: 420 }), withTiming(2, { duration: 420 })), -1, true);
  }, [wobble]);

  const travelledProps = useAnimatedProps(() => ({
    strokeDashoffset: ROUTE_LENGTH * (1 - t.value),
  }));

  const riderPos = useDerivedValue(() => bezierPoint(t.value));

  const riderStyle = useAnimatedStyle(() => {
    const p = riderPos.value;
    const ahead = bezierPoint(Math.min(1, t.value + 0.01));
    const angle = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI;
    // Flip the bike so it never renders upside-down while heading left
    const flip = Math.abs(angle) > 90;
    return {
      transform: [
        { translateX: p.x - 22 },
        { translateY: p.y - 22 + wobble.value },
        { rotate: `${flip ? angle - 180 : angle}deg` },
        { scaleX: flip ? -1 : 1 },
      ],
    };
  });

  const haloProps = useAnimatedProps(() => ({ cx: riderPos.value.x, cy: riderPos.value.y }));

  return (
    <View style={styles.mapWrap}>
      <Svg width={MAP_W} height={MAP_H}>
        <Defs>
          <LinearGradient id="mapBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#EAF4EC" />
            <Stop offset="1" stopColor="#DDEBE0" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill="url(#mapBg)" />
        {/* Faux city blocks */}
        <G opacity={0.9}>
          {[0.12, 0.42, 0.7].map((fy, i) =>
            [0.08, 0.36, 0.62].map((fx, j) => (
              <Rect
                key={`b${i}${j}`}
                x={MAP_W * fx}
                y={MAP_H * fy}
                width={MAP_W * 0.2}
                height={MAP_H * 0.18}
                rx={6}
                fill={(i + j) % 2 ? "#D4E6D8" : "#CFE2D4"}
              />
            )),
          )}
        </G>
        {/* Street grid */}
        {Array.from({ length: 7 }).map((_, i) => (
          <Line key={`h${i}`} x1={0} y1={(MAP_H / 7) * i} x2={MAP_W} y2={(MAP_H / 7) * i} stroke="rgba(255,255,255,0.85)" strokeWidth={3} />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <Line key={`v${i}`} x1={(MAP_W / 7) * i} y1={0} x2={(MAP_W / 7) * i} y2={MAP_H} stroke="rgba(255,255,255,0.85)" strokeWidth={3} />
        ))}
        {/* Remaining route (dotted) */}
        <Path d={ROUTE_D} stroke={colors.brandPrimary} strokeOpacity={0.3} strokeWidth={5} strokeLinecap="round" fill="none" strokeDasharray="1 10" />
        {/* Travelled route (solid, animates with progress) */}
        <AnimatedPath
          d={ROUTE_D}
          stroke={colors.brandPrimary}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${ROUTE_LENGTH} ${ROUTE_LENGTH}`}
          animatedProps={travelledProps}
        />
        {/* Rider halo */}
        <AnimatedCircle r={26} fill={colors.brandPrimary} fillOpacity={0.15} animatedProps={haloProps} />
      </Svg>

      {/* Store pin */}
      <View style={[styles.storePin, { left: P0.x - 17, top: P0.y - 17 }]} testID="store-pin">
        <Ionicons name="storefront" size={16} color={colors.onBrandPrimary} />
      </View>
      <View style={[styles.pinLabel, { left: P0.x - 90, top: P0.y + 22 }]}>
        <Text style={styles.pinLabelText}>Kapa Dark Store</Text>
      </View>

      {/* Destination pin */}
      <View style={[styles.destPin, { left: P3.x - 17, top: P3.y - 17 }]} testID="destination-pin">
        <PulseRing />
        <View style={styles.destInner}>
          <Ionicons name={arrived ? "checkmark" : "location"} size={16} color={colors.onError} />
        </View>
      </View>
      <View style={[styles.pinLabel, { left: P3.x + 22, top: P3.y - 12 }]}>
        <Text style={styles.pinLabelText}>{arrived ? "Delivered" : "Your gate"}</Text>
      </View>

      {/* Rider marker */}
      <Animated.View style={[styles.riderMarker, riderStyle]} testID="rider-marker">
        <View style={styles.riderBubble}>
          <Ionicons name="bicycle" size={20} color={colors.onBrandPrimary} />
        </View>
      </Animated.View>
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
  const arrived = tracking.data?.status === "delivered" || progress >= 1;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.backBtn} testID="tracking-back">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Live Order Tracking</Text>
        <View style={{ width: 36 }} />
      </View>

      <RouteVisual progress={progress} arrived={arrived} />

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.etaCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.etaLabel}>{arrived ? "Order status" : "Arriving in"}</Text>
            <Text style={styles.etaValue}>
              {arrived ? "Delivered" : `${tracking.data?.etaMinutes ?? "—"} min`}
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
    overflow: "hidden",
    position: "relative",
  },
  pinLabel: {
    position: "absolute",
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  pinLabelText: { fontSize: 10, fontWeight: "800", color: colors.onSurface },
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
