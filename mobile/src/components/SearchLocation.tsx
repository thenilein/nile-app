import React, { type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { GeocodeSuggestion } from "../lib/mapboxGeocoding";
import {
  PRIMARY_BUTTON_HEIGHT,
  PRIMARY_BUTTON_RADIUS,
  SHEET_CONTENT_GUTTER,
  iosPalette,
} from "./flowSheet/IosFlowSheetChrome";

export type SearchLocationProps = {
  query: string;
  onQueryChange: (q: string) => void;
  searching: boolean;
  hasSearch: boolean;
  suggestions: GeocodeSuggestion[];
  onPickSuggestion: (s: GeocodeSuggestion) => void;
  /** Shown below search / results when not loading (e.g. `RecentLocation`, `SavedLocation`). */
  children?: ReactNode;
};

/** Search field, geocode loading state, and result list inside a location sheet. */
export function SearchLocation({
  query,
  onQueryChange,
  searching,
  hasSearch,
  suggestions,
  onPickSuggestion,
  children,
}: SearchLocationProps) {
  return (
    <>
      <TextInput
        style={styles.search}
        placeholder="Search"
        placeholderTextColor="#9ca3af"
        value={query}
        onChangeText={onQueryChange}
        autoCorrect={false}
      />
      {searching ? (
        <ActivityIndicator style={{ marginTop: 16 }} color="#9ca3af" />
      ) : (
        <View style={styles.locationSections}>
          {hasSearch ? (
            <>
              <Text style={styles.sectionTitle}>Results</Text>
              {suggestions.length > 0 ? (
                suggestions.map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.suggestionCard}
                    onPress={() => onPickSuggestion(item)}
                  >
                    <Text style={styles.suggestionTitle}>{item.displayName}</Text>
                    <Text style={styles.suggestionMeta}>
                      {item.city}
                      {item.state ? ` · ${item.state}` : ""}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>No matches found.</Text>
              )}
            </>
          ) : null}
          {children}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    alignSelf: "stretch",
    marginTop: 12,
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    color: iosPalette.textPrimary,
    fontSize: 17,
    paddingHorizontal: SHEET_CONTENT_GUTTER,
    paddingVertical: 12,
  },
  locationSections: { marginTop: 4, paddingBottom: 4, backgroundColor: iosPalette.sheetBg },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: "600",
    color: iosPalette.textPrimary,
  },
  suggestionCard: {
    alignSelf: "stretch",
    minHeight: 92,
    borderRadius: PRIMARY_BUTTON_RADIUS,
    backgroundColor: iosPalette.cardBg,
    borderWidth: 1,
    borderColor: iosPalette.border,
    marginBottom: 12,
    paddingHorizontal: SHEET_CONTENT_GUTTER,
    paddingVertical: 12,
    justifyContent: "center",
  },
  suggestionTitle: { fontSize: 15, fontWeight: "600", color: iosPalette.textPrimary },
  suggestionMeta: { marginTop: 4, fontSize: 14, color: iosPalette.textSecondary },
  emptyText: { color: iosPalette.textSecondary, fontSize: 14, marginBottom: 10 },
});
