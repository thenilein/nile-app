import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/context/AuthContext";
import { CartProvider } from "../src/context/CartContext";
import { LocationProvider } from "../src/context/LocationContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <LocationProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#fff" },
            }}
          />
        </LocationProvider>
      </CartProvider>
    </AuthProvider>
  );
}
