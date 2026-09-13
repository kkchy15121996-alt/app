import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Asset } from "expo-asset";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { CartProvider } from "@/src/context/CartContext";

LogBox.ignoreAllLogs(true);

// Prewarm the icon asset so Ionicons renders in Expo Go on Android without a flash.
// Keep this logic intact.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const IoniconsFont = require("@react-native-vector-icons/ionicons/fonts/Ionicons.ttf");
  Asset.fromModule(IoniconsFont).downloadAsync().catch(() => {});
} catch {}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = "Kapa Learning";
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <CartProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="checkout"
                  options={{ presentation: "modal", animation: "slide_from_bottom" }}
                />
                <Stack.Screen
                  name="tracking/[orderId]"
                  options={{ animation: "slide_from_right" }}
                />
              </Stack>
            </CartProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
