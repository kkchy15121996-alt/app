import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Ionicons from "@react-native-vector-icons/ionicons";
import { colors, radius } from "@/src/theme";

type Props = {
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  size?: "sm" | "md";
  testIDPrefix?: string;
};

export function QuantityStepper({ quantity, onAdd, onRemove, size = "md", testIDPrefix = "qty" }: Props) {
  const progress = useSharedValue(quantity > 0 ? 1 : 0);
  const pulse = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    progress.value = withSpring(quantity > 0 ? 1 : 0, { damping: 18, stiffness: 260 });
    if (!isFirstRender.current && quantity > 0) {
      pulse.value = 1.25;
      pulse.value = withSpring(1, { damping: 8, stiffness: 200 });
    }
    isFirstRender.current = false;
  }, [quantity, progress, pulse]);

  const containerHeight = size === "sm" ? 30 : 34;
  const width = size === "sm" ? 80 : 88;

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? colors.brandPrimary : colors.surface,
    borderColor: colors.brandPrimary,
  }));

  const addTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5], [1, 0]),
  }));

  const stepperStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.5, 1], [0, 1]),
  }));

  const qtyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handleAdd = () => {
    Haptics.selectionAsync().catch(() => {});
    onAdd();
  };
  const handleRemove = () => {
    Haptics.selectionAsync().catch(() => {});
    onRemove();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        { height: containerHeight, width },
      ]}
      testID={`${testIDPrefix}-stepper`}
    >
      {quantity === 0 ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleAdd}
          style={styles.addBtn}
          testID={`${testIDPrefix}-add`}
        >
          <Animated.Text style={[styles.addText, addTextStyle]}>ADD</Animated.Text>
        </TouchableOpacity>
      ) : (
        <Animated.View style={[styles.row, stepperStyle]}>
          <TouchableOpacity
            onPress={handleRemove}
            activeOpacity={0.7}
            style={styles.stepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            testID={`${testIDPrefix}-minus`}
          >
            <Ionicons name="remove" size={18} color={colors.onBrandPrimary} />
          </TouchableOpacity>
          <Animated.Text style={[styles.qtyText, qtyStyle]} testID={`${testIDPrefix}-count`}>
            {quantity}
          </Animated.Text>
          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={0.7}
            style={styles.stepBtn}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            testID={`${testIDPrefix}-plus`}
          >
            <Ionicons name="add" size={18} color={colors.onBrandPrimary} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  addBtn: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  addText: {
    color: colors.brandPrimary,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  row: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  stepBtn: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyText: {
    color: colors.onBrandPrimary,
    fontWeight: "700",
    fontSize: 14,
    minWidth: 16,
    textAlign: "center",
  },
});
