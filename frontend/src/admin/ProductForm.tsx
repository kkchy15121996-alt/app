import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { imageUrl } from "@/src/lib/api";
import { adminApi, type AdminProduct } from "@/src/admin/adminApi";
import { Banner, Button, Chip, Field, Toggle, ui } from "@/src/admin/ui";
import { photoPermissionStatus, pickAndUploadImage, requestPhotoPermission, type PermissionState } from "@/src/admin/upload";

type Props = { visible: boolean; onClose: () => void; product?: AdminProduct | null };

export function ProductForm({ visible, onClose, product }: Props) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const cats = useQuery({ queryKey: ["admin", "categories"], queryFn: adminApi.categories, enabled: visible });

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState("");
  const [mrp, setMrp] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("");
  const [image, setImage] = useState<string>("");
  const [featured, setFeatured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [perm, setPerm] = useState<PermissionState>("granted");
  const [showPermExplain, setShowPermExplain] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setTitle(product?.title ?? "");
    setSubtitle(product?.subtitle ?? "");
    setCategory(product?.category ?? "");
    setMrp(product ? String(product.mrp) : "");
    setSalePrice(product ? String(product.salePrice) : "");
    setStock(product ? String(product.stockQuantity) : "");
    setImage(product?.images?.[0] ?? "");
    setFeatured(product?.featured ?? false);
    setError(null);
    setShowPermExplain(false);
    photoPermissionStatus().then(setPerm).catch(() => {});
  }, [visible, product]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        category,
        mrp: Number(mrp),
        salePrice: Number(salePrice),
        stockQuantity: Number(stock),
        images: image ? [image] : product?.images ?? [],
        featured,
      };
      return product ? adminApi.updateProduct(product.id, body) : adminApi.createProduct(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  const validate = () => {
    if (title.trim().length < 2) return "Title is required";
    if (!category) return "Pick a category";
    const m = Number(mrp);
    const s = Number(salePrice);
    if (!m || m <= 0) return "MRP must be a positive number";
    if (!s || s <= 0) return "Sale price must be a positive number";
    if (s > m) return "Sale price cannot exceed MRP";
    if (stock === "" || Number(stock) < 0 || !Number.isInteger(Number(stock))) return "Stock must be a whole number";
    return null;
  };

  const onSave = () => {
    const v = validate();
    if (v) return setError(v);
    setError(null);
    save.mutate();
  };

  const doUpload = async () => {
    setUploading(true);
    setError(null);
    try {
      const res = await pickAndUploadImage();
      if (res) setImage(res.url);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onPickPhoto = async () => {
    if (perm === "granted") return doUpload();
    if (perm === "blocked") return;
    // Show benefit-focused explanation before the native prompt
    setShowPermExplain(true);
  };

  const onAllowPhotos = async () => {
    setShowPermExplain(false);
    const next = await requestPhotoPermission();
    setPerm(next);
    if (next === "granted") doUpload();
  };

  const discount = Number(mrp) > 0 && Number(salePrice) > 0 ? Math.round(((Number(mrp) - Number(salePrice)) / Number(mrp)) * 100) : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ui.sheetBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[ui.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={ui.sheetHandle} />
            <View style={styles.head}>
              <Text style={ui.sheetTitle}>{product ? "Edit product" : "New product"}</Text>
              <TouchableOpacity onPress={onClose} style={ui.closeBtn} testID="product-form-close">
                <Ionicons name="close" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Image */}
              <View style={styles.imageRow}>
                <View style={styles.preview}>
                  {image ? (
                    <Image source={{ uri: imageUrl(image) }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={28} color={colors.muted} />
                  )}
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <Button
                    title={image ? "Replace photo" : "Upload photo"}
                    icon="cloud-upload-outline"
                    variant="outline"
                    small
                    loading={uploading}
                    disabled={perm === "blocked"}
                    onPress={onPickPhoto}
                    testID="product-upload-btn"
                  />
                  <Text style={ui.hint}>JPG, PNG or WEBP up to 10 MB. Square images look best.</Text>
                  {perm === "blocked" && (
                    <TouchableOpacity onPress={() => Linking.openSettings()} style={styles.settingsBtn} testID="open-settings-btn">
                      <Ionicons name="settings-outline" size={14} color={colors.error} />
                      <Text style={styles.settingsText}>Photo access is off — Open Settings</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {showPermExplain && (
                <View style={styles.permCard}>
                  <Text style={styles.permTitle}>Allow photo access?</Text>
                  <Text style={styles.permText}>Kapa uses your photo library only to pick product pictures for the catalog.</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Button title="Not now" variant="ghost" small onPress={() => setShowPermExplain(false)} />
                    <Button title="Allow" small onPress={onAllowPhotos} testID="perm-allow-btn" />
                  </View>
                </View>
              )}
              <Field label="Image URL (optional)" value={image} onChangeText={setImage} placeholder="https://… or upload above" autoCapitalize="none" testID="product-image-input" />

              <Field label="Title *" value={title} onChangeText={setTitle} placeholder="NCERT Class 9 Mathematics" testID="product-title-input" />
              <Field label="Subtitle" value={subtitle} onChangeText={setSubtitle} placeholder="Textbook | Latest Edition" testID="product-subtitle-input" />

              <Text style={[ui.label, { marginTop: spacing.md }]}>Category *</Text>
              <View style={styles.chips}>
                {cats.data?.map((c) => (
                  <Chip key={c.id} label={c.name} active={category === c.id} onPress={() => setCategory(c.id)} testID={`product-cat-${c.id}`} />
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field label="MRP (₹) *" value={mrp} onChangeText={setMrp} keyboardType="decimal-pad" placeholder="250" testID="product-mrp-input" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Sale price (₹) *" value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" placeholder="199" testID="product-sale-input" hint={discount > 0 ? `${discount}% OFF badge` : undefined} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Stock *" value={stock} onChangeText={(t) => setStock(t.replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholder="40" testID="product-stock-input" />
                </View>
              </View>

              <Toggle value={featured} onChange={setFeatured} label="Show in Bestsellers on Home" testID="product-featured-toggle" />

              {error && <Banner kind="error" text={error} />}

              <View style={{ marginTop: spacing.lg }}>
                <Button title={product ? "Save changes" : "Publish product"} icon={product ? "save-outline" : "rocket-outline"} loading={save.isPending} onPress={onSave} testID="product-save-btn" />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  imageRow: { flexDirection: "row", gap: spacing.md, alignItems: "center", marginTop: spacing.sm },
  preview: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsBtn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32 },
  settingsText: { fontSize: 12, color: colors.error, fontWeight: "700" },
  permCard: { backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  permTitle: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  permText: { fontSize: 12, color: colors.onSurfaceSecondary, marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  row: { flexDirection: "row", gap: spacing.sm },
});
