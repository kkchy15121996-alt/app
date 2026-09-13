// Design tokens for Kapa Learning app.
// Blinkit-inspired emerald green + clean white palette.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces
  surface: "#FFFFFF",
  onSurface: "#1A1D1C",
  surfaceSecondary: "#F5F7F6",
  onSurfaceSecondary: "#343A38",
  surfaceTertiary: "#EAECEB",
  onSurfaceTertiary: "#4B5350",
  surfaceInverse: "#1A1D1C",
  onSurfaceInverse: "#FFFFFF",
  muted: "#7A8782",

  // Brand: Emerald green
  brand: "#0C8346",
  onBrand: "#FFFFFF",
  brandPrimary: "#0C8346",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#E6F5EC",
  onBrandSecondary: "#0C8346",
  brandTertiary: "#F0F9F4",
  onBrandTertiary: "#086033",

  // Status
  success: "#0C8346",
  onSuccess: "#FFFFFF",
  warning: "#F5A623",
  onWarning: "#FFFFFF",
  error: "#D93025",
  onError: "#FFFFFF",
  info: "#17A2B8",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E1E5E3",
  borderStrong: "#B4C2BC",
  divider: "#E1E5E3",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const colors = light;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};
