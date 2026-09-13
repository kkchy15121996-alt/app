import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "@/src/theme";
import { api } from "@/src/lib/api";
import { ProductCard } from "@/src/components/ProductCard";
import { useCart } from "@/src/context/CartContext";

const { width } = Dimensions.get("window");
const RAIL_WIDTH = Math.max(88, width * 0.24);
const GRID_WIDTH = width - RAIL_WIDTH;
const CARD_WIDTH = (GRID_WIDTH - spacing.md * 3) / 2;

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const { totalCount } = useCart();

  const cats = useQuery({ queryKey: ["categories"], queryFn: api.categories });

  const [activeCat, setActiveCat] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCat && cats.data && cats.data.length > 0) {
      setActiveCat((params.categoryId as string) || cats.data[0].id);
    }
  }, [cats.data, params.categoryId, activeCat]);

  useEffect(() => {
    if (params.categoryId && cats.data?.find((c) => c.id === params.categoryId)) {
      setActiveCat(params.categoryId as string);
    }
  }, [params.categoryId, cats.data]);

  const products = useQuery({
    queryKey: ["products", activeCat],
    queryFn: () => api.products(activeCat!),
    enabled: !!activeCat,
  });

  const activeCategory = useMemo(
    () => cats.data?.find((c) => c.id === activeCat),
    [cats.data, activeCat],
  );

  const bottomPad = (totalCount > 0 ? 90 : 24) + insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity style={styles.searchIconBtn} testID="cat-search-btn">
          <Ionicons name="search" size={20} color={colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Left rail */}
        <View style={[styles.rail, { width: RAIL_WIDTH }]}>
          <FlatList
            data={cats.data ?? []}
            keyExtractor={(it) => it.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomPad }}
            renderItem={({ item }) => {
              const active = item.id === activeCat;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setActiveCat(item.id);
                  }}
                  style={[styles.railItem, active && styles.railItemActive]}
                  testID={`rail-item-${item.id}`}
                >
                  {active && <View style={styles.activeIndicator} />}
                  <View style={[styles.railImgWrap, { backgroundColor: item.color }]}>
                    <Image source={{ uri: item.image }} style={styles.railImg} contentFit="cover" />
                  </View>
                  <Text
                    style={[styles.railLabel, active && styles.railLabelActive]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Right grid */}
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, paddingBottom: bottomPad }}
            showsVerticalScrollIndicator={false}
          >
            {activeCategory && (
              <Text style={styles.gridTitle}>{activeCategory.name}</Text>
            )}
            {products.isLoading ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator color={colors.brandPrimary} />
              </View>
            ) : products.data && products.data.length > 0 ? (
              <View style={styles.grid}>
                {products.data.map((p) => (
                  <View key={p.id} style={{ width: CARD_WIDTH }}>
                    <ProductCard product={p} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Text style={{ color: colors.muted }}>No products in this category</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: colors.onSurface },
  searchIconBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
  },

  body: { flex: 1, flexDirection: "row" },

  rail: {
    backgroundColor: colors.surfaceSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  railItem: {
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  railItemActive: {
    backgroundColor: colors.surface,
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    backgroundColor: colors.brandPrimary,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  railImgWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  railImg: { width: "100%", height: "100%" },
  railLabel: {
    fontSize: 10,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    paddingHorizontal: 4,
    fontWeight: "500",
  },
  railLabelActive: {
    color: colors.brandPrimary,
    fontWeight: "700",
  },

  gridTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
});
