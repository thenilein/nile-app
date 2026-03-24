import React from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { PhoneOtpAuthFlow } from "./PhoneOtpAuthFlow";
import { colors } from "../lib/theme";

export function AccountSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { user, signOut, continueAsGuest } = useAuth();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.wrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>

        {user ? (
          <View style={styles.body}>
            <Text style={styles.label}>Signed in</Text>
            <Text style={styles.meta}>
              {(user.user_metadata?.full_name as string) || user.email || user.phone || "Customer"}
            </Text>
            <Pressable
              style={styles.signOut}
              onPress={async () => {
                await signOut();
                onClose();
              }}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.body}>
            <PhoneOtpAuthFlow
              active={visible && !user}
              showToast={(type, text) => Alert.alert(type === "error" ? "Error" : "Nile Cafe", text)}
              onAuthenticated={() => onClose()}
              onGuestSkip={() => {
                continueAsGuest();
                onClose();
              }}
            />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  close: { fontSize: 16, fontWeight: "600", color: colors.green },
  body: { flex: 1 },
  label: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, letterSpacing: 1 },
  meta: { marginTop: 8, fontSize: 17, fontWeight: "600", color: colors.textPrimary },
  signOut: {
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  signOutText: { fontWeight: "700", color: "#b91c1c" },
});
