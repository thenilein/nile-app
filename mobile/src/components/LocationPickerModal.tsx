import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { mapboxForwardGeocode, type GeocodeSuggestion } from "../lib/mapboxGeocoding";
import type { LocationData } from "../types/location";
import { colors } from "../lib/theme";

export type LocationPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (loc: LocationData) => void;
  title?: string;
  subtitle?: string;
  onUseCurrentLocation: () => Promise<void>;
  locationLoading?: boolean;
};

export function LocationPickerModal({
  visible,
  onClose,
  onSelectLocation,
  title = "Delivery location",
  subtitle = "Search, pick an address, or use GPS",
  onUseCurrentLocation,
  locationLoading,
}: LocationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setSuggestions([]);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await mapboxForwardGeocode(query.trim(), 8);
      if (!cancelled) {
        setSuggestions(res);
        setSearching(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, visible]);

  const pick = useCallback(
    (s: GeocodeSuggestion) => {
      onSelectLocation({
        latitude: s.latitude,
        longitude: s.longitude,
        city: s.city,
        state: s.state,
        displayName: s.displayName,
      });
      onClose();
    },
    [onClose, onSelectLocation]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <TextInput
          style={styles.search}
          placeholder="Search area, street, landmark…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />

        <Pressable
          style={styles.gpsBtn}
          onPress={() => onUseCurrentLocation()}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator color={colors.green} />
          ) : (
            <Text style={styles.gpsText}>Use my current location</Text>
          )}
        </Pressable>

        {searching ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={colors.textMuted} />
        ) : (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={styles.suggestion} onPress={() => pick(item)}>
                <Text style={styles.suggestionTitle}>{item.displayName}</Text>
                <Text style={styles.suggestionMeta}>
                  {item.city}
                  {item.state ? ` · ${item.state}` : ""}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              query.length >= 2 ? (
                <Text style={styles.empty}>No matches. Try another search.</Text>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  close: { fontSize: 16, fontWeight: "600", color: colors.green },
  subtitle: { marginTop: 8, fontSize: 14, color: colors.textSecondary },
  search: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  gpsBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.greenSoft,
    alignItems: "center",
  },
  gpsText: { fontSize: 15, fontWeight: "600", color: colors.greenDark },
  suggestion: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  suggestionTitle: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  suggestionMeta: { marginTop: 2, fontSize: 13, color: colors.textSecondary },
  empty: { marginTop: 24, textAlign: "center", color: colors.textMuted },
});
