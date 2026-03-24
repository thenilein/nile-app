import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../lib/theme";

export type MenuGroup = {
  id: string;
  name?: string;
  categories: { id: string; name: string; image_url?: string | null }[];
};

export function CategoryPickerSheet({
  visible,
  onClose,
  menuGroups,
  activeCategoryId,
  onSelectCategory,
}: {
  visible: boolean;
  onClose: () => void;
  menuGroups: MenuGroup[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Categories</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {menuGroups.map((group) => (
            <View key={group.id} style={styles.group}>
              {group.name ? <Text style={styles.groupLabel}>{group.name}</Text> : null}
              {group.categories.map((cat) => {
                const active = activeCategoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    style={[styles.catRow, active && styles.catRowActive]}
                    onPress={() => {
                      onSelectCategory(cat.id);
                      onClose();
                    }}
                  >
                    <View style={styles.catIcon}>
                      {cat.image_url ? (
                        <Image source={{ uri: cat.image_url }} style={styles.catImg} contentFit="cover" />
                      ) : (
                        <Text style={styles.catLetter}>{cat.name.charAt(0).toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={[styles.catName, active && styles.catNameActive]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "58%",
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  close: { fontSize: 18, color: colors.textMuted, padding: 8 },
  scroll: { flexGrow: 0 },
  group: { marginBottom: 20 },
  groupLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  catRowActive: { backgroundColor: colors.greenSoft },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.pillBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  catImg: { width: "100%", height: "100%" },
  catLetter: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
  catName: { flex: 1, fontSize: 15, fontWeight: "500", color: "#374151" },
  catNameActive: { color: colors.greenDark, fontWeight: "600" },
});
