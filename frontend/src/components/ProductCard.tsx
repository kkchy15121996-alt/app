import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { colors, radius, spacing } from "@/src/theme";
import { QuantityStepper } from "@/src/components/QuantityStepper";
import { useCart } from "@/src/context/CartContext";
import { imageUrl, type Product } from "@/src/lib/api";

type Props = {
  product: Product;
  compact?: boolean;
};

export function ProductCard({ product, compact }: Props) {
  const { quantityOf, addOne, removeOne } = useCart();
  const qty = quantityOf(product.id);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, compact && styles.cardCompact]}
      testID={`product-card-${product.sku}`}
    >
      <View style={styles.imageWrap}>
        {product.discountPercentage > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discountPercentage}% OFF</Text>
          </View>
        )}
        <Image
          source={{ uri: imageUrl(product.images[0]) }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {product.subtitle}
        </Text>
        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.salePrice}</Text>
            {product.mrp > product.salePrice && (
              <Text style={styles.mrp}>₹{product.mrp}</Text>
            )}
          </View>
          <View style={styles.stepperRow}>
            <QuantityStepper
              quantity={qty}
              onAdd={() => addOne(product)}
              onRemove={() => removeOne(product.id)}
              size="sm"
              testIDPrefix={`product-${product.sku}`}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cardCompact: {},
  imageWrap: {
    aspectRatio: 1,
    backgroundColor: colors.surfaceSecondary,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  discountBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 2,
  },
  discountText: {
    color: colors.onBrandPrimary,
    fontSize: 10,
    fontWeight: "700",
  },
  info: {
    padding: spacing.sm,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.onSurface,
    lineHeight: 17,
  },
  subtitle: {
    fontSize: 11,
    color: colors.muted,
  },
  footer: {
    marginTop: spacing.sm,
    gap: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.onSurface,
  },
  mrp: {
    fontSize: 11,
    color: colors.muted,
    textDecorationLine: "line-through",
  },
});
