import React, { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { imageUrl } from "@/src/lib/api";
import { adminApi, type AdminProduct } from "@/src/admin/adminApi";
import { Banner, Button, Chip, ui } from "@/src/admin/ui";
import { ProductForm } from "@/src/admin/ProductForm";

export function ProductsManager() {
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["admin", "products"], queryFn: adminApi.products });
  const cats = useQuery({ queryKey: ["admin", "categories"], queryFn: adminApi.categories });
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const move = useMutation({
    mutationFn: ({ id, dir }: { id: string; dir: "up" | "down" }) => adminApi.moveProduct(id, dir),
    onSuccess: invalidate,
    onError: (e: Error) => setMsg({ kind: "error", text: e.message }),
  });
  const toggle = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => adminApi.updateProduct(id, body),
    onSuccess: invalidate,
    onError: (e: Error) => setMsg({ kind: "error", text: e.message }),
  });

  const catName = useMemo(() => Object.fromEntries((cats.data ?? []).map((c) => [c.id, c.name])), [cats.data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products.data ?? []).filter(
      (p) => (filter === "all" || p.category === filter) && (!q || p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    );
  }, [products.data, filter, search]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search title or SKU"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            testID="admin-product-search"
          />
        </View>
        <Button title="New product" icon="add" small onPress={() => setCreating(true)} testID="admin-new-product-btn" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: spacing.sm }} style={{ flexGrow: 0 }}>
        <Chip label="All" active={filter === "all"} onPress={() => setFilter("all")} testID="admin-filter-all" />
        {cats.data?.map((c) => (
          <Chip key={c.id} label={c.name} active={filter === c.id} onPress={() => setFilter(c.id)} testID={`admin-filter-${c.id}`} />
        ))}
      </ScrollView>
      {msg && <Banner kind={msg.kind} text={msg.text} />}
      <Text style={styles.hint}>
        Arrows change the order customers see inside each category. Changes go live in the app within seconds.
      </Text>

      {products.isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120, gap: spacing.sm }} showsVerticalScrollIndicator={false}>
          {visible.map((p) => (
            <View key={p.id} style={[ui.card, styles.row, !p.isActive && { opacity: 0.55 }]} testID={`admin-product-row-${p.sku}`}>
              <Image source={{ uri: imageUrl(p.images[0]) }} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title} numberOfLines={1}>{p.title}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {catName[p.category] ?? p.category} • {p.sku} • #{p.sortOrder}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>₹{p.salePrice}</Text>
                  <Text style={styles.mrp}>₹{p.mrp}</Text>
                  <View style={styles.badge}><Text style={styles.badgeText}>{p.discountPercentage}% OFF</Text></View>
                  <View style={[styles.badge, p.stockQuantity <= 5 && { backgroundColor: "#FDECEA" }]}>
                    <Text style={[styles.badgeText, p.stockQuantity <= 5 && { color: colors.error }]}>Stock {p.stockQuantity}</Text>
                  </View>
                  {p.featured && <View style={[styles.badge, { backgroundColor: "#FFF4DE" }]}><Text style={[styles.badgeText, { color: colors.warning }]}>★ Home</Text></View>}
                  {!p.isActive && <View style={styles.badge}><Text style={styles.badgeText}>Hidden</Text></View>}
                </View>
              </View>
              <View style={styles.actions}>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <TouchableOpacity onPress={() => move.mutate({ id: p.id, dir: "up" })} style={styles.iconBtn} testID={`admin-move-up-${p.sku}`}>
                    <Ionicons name="chevron-up" size={18} color={colors.onSurface} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => move.mutate({ id: p.id, dir: "down" })} style={styles.iconBtn} testID={`admin-move-down-${p.sku}`}>
                    <Ionicons name="chevron-down" size={18} color={colors.onSurface} />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <TouchableOpacity
                    onPress={() => toggle.mutate({ id: p.id, body: { featured: !p.featured } })}
                    style={[styles.iconBtn, p.featured && { backgroundColor: "#FFF4DE" }]}
                    testID={`admin-feature-${p.sku}`}
                  >
                    <Ionicons name={p.featured ? "star" : "star-outline"} size={16} color={p.featured ? colors.warning : colors.onSurface} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggle.mutate({ id: p.id, body: { isActive: !p.isActive } })}
                    style={styles.iconBtn}
                    testID={`admin-toggle-active-${p.sku}`}
                  >
                    <Ionicons name={p.isActive ? "eye" : "eye-off"} size={16} color={colors.onSurface} />
                  </TouchableOpacity>
                </View>
                <Button title="Edit" icon="create-outline" variant="outline" small onPress={() => setEditing(p)} testID={`admin-edit-${p.sku}`} />
              </View>
            </View>
          ))}
          {visible.length === 0 && <Text style={styles.empty}>No products match.</Text>}
        </ScrollView>
      )}

      <ProductForm visible={creating} onClose={() => setCreating(false)} />
      <ProductForm visible={!!editing} product={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  search: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface },
  hint: { fontSize: 11, color: colors.muted, marginBottom: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.surfaceSecondary },
  title: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" },
  price: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  mrp: { fontSize: 11, color: colors.muted, textDecorationLine: "line-through" },
  badge: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.onSurfaceSecondary },
  actions: { alignItems: "flex-end", gap: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: { textAlign: "center", color: colors.muted, marginTop: spacing.xl },
});
