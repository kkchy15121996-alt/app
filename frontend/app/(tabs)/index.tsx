import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";
import { ProductCard } from "@/src/components/ProductCard";
import { useCart } from "@/src/context/CartContext";
import { useAddress } from "@/src/context/AddressContext";
import { SchoolKitsSection } from "@/src/components/SchoolKits";
import { StreakCard } from "@/src/components/StreakRewards";

const { width } = Dimensions.get("window");
const BANNER_WIDTH = width - spacing.lg * 2;

const PLACEHOLDERS = [
  "Search 'Class 10 NCERT Solutions'",
  "Search 'Classmate Spiral Registers'",
  "Search 'Reynolds Blue Gel Pens'",
  "Search 'UPSC Prelims Mock Papers'",
];

const BANNERS = [
  {
    id: "b1",
    title: "Exam Ready in 2-3 Hours",
    subtitle: "Up to 50% Off on Test Prep",
    color: "#0C8346",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
  },
  {
    id: "b2",
    title: "Back to School Sale",
    subtitle: "NCERT Books • Registers • More",
    color: "#F5A623",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800",
  },
  {
    id: "b3",
    title: "Art Supplies Bonanza",
    subtitle: "Everything for creators",
    color: "#D93025",
    image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800",
  },
];

function RotatingPlaceholder() {
  const [idx, setIdx] = useState(0);
  const offset = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const t = setInterval(() => {
      offset.value = withTiming(-20, { duration: 300, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(0, { duration: 300 }, (fin) => {
        if (fin) {
          offset.value = 20;
        }
      });
      setTimeout(() => {
        setIdx((i) => (i + 1) % PLACEHOLDERS.length);
        offset.value = withTiming(0, { duration: 300 });
        opacity.value = withTiming(1, { duration: 300 });
      }, 300);
    }, 2800);
    return () => clearInterval(t);
  }, [offset, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.searchPlaceholder, style]} numberOfLines={1}>
      {PLACEHOLDERS[idx]}
    </Animated.Text>
  );
}

function PulsingDot() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.pulseDot, style]} />;
}

function BannerCarousel() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % BANNERS.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <View>
      <FlatList
        ref={listRef}
        data={BANNERS}
        keyExtractor={(it) => it.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={BANNER_WIDTH + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.lg }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + spacing.md));
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.banner, { backgroundColor: item.color, width: BANNER_WIDTH, marginRight: spacing.md }]}
            testID={`banner-${item.id}`}
          >
            <View style={{ flex: 1, padding: spacing.lg }}>
              <Text style={styles.bannerTitle}>{item.title}</Text>
              <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>
              <View style={styles.bannerCta}>
                <Text style={styles.bannerCtaText}>Shop Now</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.onBrandPrimary} />
              </View>
            </View>
            <Image source={{ uri: item.image }} style={styles.bannerImg} contentFit="cover" />
          </TouchableOpacity>
        )}
      />
      <View style={styles.pagination}>
        {BANNERS.map((_, i) => (
          <View key={i} style={[styles.pill, i === index && styles.pillActive]} />
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { totalCount } = useCart();
  const { selected: address, openSheet } = useAddress();

  const store = useQuery({ queryKey: ["nearest"], queryFn: api.nearestStore });
  const cats = useQuery({ queryKey: ["categories"], queryFn: api.categories });
  const featured = useQuery({ queryKey: ["featured"], queryFn: api.featured });

  const gridPad = totalCount > 0 ? 92 : 24;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Ionicons name="book" size={14} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.brandText} testID="brand-title">Kapa Book Bazaar</Text>
          <Text style={styles.brandDomain}>kapabookbazaar.in</Text>
        </View>
        <View style={styles.headerTop}>
          <View style={styles.slaBadge} testID="sla-badge">
            <PulsingDot />
            <Text style={styles.slaText}>{store.data?.slaMinutes ?? "2-3 HRS"}</Text>
          </View>
          <TouchableOpacity style={styles.locationBtn} onPress={openSheet} testID="location-selector">
            <Text style={styles.locationLabel}>Delivery to</Text>
            <View style={styles.locationRow}>
              <Text style={styles.locationText} numberOfLines={1}>
                {address ? `${address.label} - ${address.street}` : "Select address"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.onSurface} />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="person-circle-outline" size={28} color={colors.onSurface} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar} testID="search-bar">
          <Ionicons name="search" size={18} color={colors.muted} />
          <View style={styles.searchTextWrap}>
            <RotatingPlaceholder />
          </View>
          <View style={styles.searchDivider} />
          <Ionicons name="mic" size={18} color={colors.brandPrimary} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: gridPad }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: spacing.md }}>
          <BannerCarousel />
        </View>

        {/* Exam streak rewards */}
        <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
          <StreakCard />
        </View>

        {/* Categories 4x2 grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <View style={styles.categoryGrid}>
            {cats.data?.slice(0, 8).map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => router.push({ pathname: "/(tabs)/categories", params: { categoryId: cat.id } })}
                style={styles.categoryCard}
                testID={`category-card-${cat.id}`}
              >
                <View style={[styles.categoryImgWrap, { backgroundColor: cat.color }]}>
                  <Image source={{ uri: cat.image }} style={styles.categoryImg} contentFit="cover" />
                </View>
                <Text style={styles.categoryLabel} numberOfLines={2}>{cat.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Bulk school kits */}
        <View style={styles.section}>
          <SchoolKitsSection />
        </View>

        {/* Featured products */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Bestsellers</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/categories")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.productGrid}>
            {featured.data?.slice(0, 6).map((p) => (
              <View key={p.id} style={styles.productCell}>
                <ProductCard product={p} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: spacing.sm },
  brandMark: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.brandPrimary, justifyContent: "center", alignItems: "center" },
  brandText: { fontSize: 15, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 0.2 },
  brandDomain: { marginLeft: "auto", fontSize: 10, color: colors.muted, fontWeight: "600" },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  slaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandPrimary,
  },
  slaText: {
    color: colors.brandPrimary,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  locationBtn: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  locationLabel: { fontSize: 10, color: colors.muted, fontWeight: "600" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 13, color: colors.onSurface, fontWeight: "700", flexShrink: 1 },
  iconBtn: { padding: 4 },

  searchBar: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  searchTextWrap: { flex: 1, overflow: "hidden", height: 20, justifyContent: "center" },
  searchPlaceholder: { color: colors.muted, fontSize: 13 },
  searchDivider: { width: 1, height: 20, backgroundColor: colors.border },

  banner: {
    height: 130,
    borderRadius: radius.md,
    flexDirection: "row",
    overflow: "hidden",
  },
  bannerTitle: { fontSize: 18, fontWeight: "800", color: colors.onBrandPrimary },
  bannerSubtitle: { fontSize: 12, color: colors.onBrandPrimary, opacity: 0.9, marginTop: 4 },
  bannerCta: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  bannerCtaText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: 12 },
  bannerImg: { width: 120, height: "100%" },

  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    marginTop: spacing.md,
  },
  pill: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  pillActive: {
    width: 18,
    backgroundColor: colors.brandPrimary,
  },

  section: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  seeAll: { fontSize: 13, color: colors.brandPrimary, fontWeight: "700" },

  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.md,
    gap: 0,
  },
  categoryCard: {
    width: "25%",
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingHorizontal: 4,
  },
  categoryImgWrap: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryImg: { width: "100%", height: "100%" },
  categoryLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: colors.onSurface,
    textAlign: "center",
  },

  productGrid: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  productCell: {
    width: (width - spacing.lg * 2 - spacing.md) / 2,
  },
});
