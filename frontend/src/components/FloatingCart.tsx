import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius, spacing } from "@/src/theme";
import { useCart } from "@/src/context/CartContext";
import { imageUrl } from "@/src/lib/api";

const TAB_HEIGHT_BASE = 60;

export function FloatingCart() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { totalCount, totalPrice, lines } = useCart();

  const bottomOffset = TAB_HEIGHT_BASE + Math.max(insets.bottom, 8) + 8;
  // Slide fully below the screen edge when hidden (pill height + bottom offset)
  const hiddenY = bottomOffset + 90;
  const translateY = useSharedValue(hiddenY);
  const visible = totalCount > 0;

  useEffect(() => {
    translateY.value = withSpring(visible ? 0 : hiddenY, { damping: 22, stiffness: 220 });
  }, [visible, translateY, hiddenY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: visible ? 1 : Math.max(0, 1 - translateY.value / 60),
  }));
  const previews = Object.values(lines).slice(0, 3);

  return (
    <Animated.View
      style={[styles.wrap, { bottom: bottomOffset }, style]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.pill}
        onPress={() => router.push("/checkout")}
        testID="floating-cart-view-btn"
      >
        <View style={styles.avatarStack}>
          {previews.map((line, idx) => (
            <View
              key={line.product.id}
              style={[styles.avatar, { marginLeft: idx === 0 ? 0 : -12, zIndex: 10 - idx }]}
            >
              <Image
                source={{ uri: imageUrl(line.product.images[0]) }}
                style={styles.avatarImg}
                contentFit="cover"
              />
            </View>
          ))}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.itemsText} testID="floating-cart-count">
            {totalCount} {totalCount === 1 ? "Item" : "Items"} • ₹{totalPrice.toFixed(0)}
          </Text>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>View Cart</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.onBrandPrimary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#054A25",
    borderRadius: radius.md,
    padding: 10,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: colors.onBrandPrimary,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  avatarImg: { width: "100%", height: "100%" },
  textCol: { flex: 1, marginLeft: spacing.xs },
  itemsText: {
    color: colors.onBrandPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  ctaText: {
    color: colors.onBrandPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
});
