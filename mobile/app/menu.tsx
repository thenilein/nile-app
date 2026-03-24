import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AccountSheet } from "../src/components/AccountSheet";
import { CartSheet } from "../src/components/CartSheet";
import { CategoryPickerSheet, type MenuGroup } from "../src/components/CategoryPickerSheet";
import { LocationPickerModal } from "../src/components/LocationPickerModal";
import { MenuItemCard, type Product } from "../src/components/MenuItemCard";
import { PromoBanner } from "../src/components/PromoBanner";
import { useCart } from "../src/context/CartContext";
import { useLocation } from "../src/context/LocationContext";
import { supabase } from "../src/lib/supabase";
import { colors } from "../src/lib/theme";
import type { LocationData } from "../src/types/location";

interface Category {
  id: string;
  name: string;
  slug: string;
  menu_id?: string | null;
  display_order?: number;
  is_active?: boolean;
  image_url?: string | null;
}

interface TopMenu {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  display_order?: number;
  is_active?: boolean;
}

async function fetchTopMenus(): Promise<TopMenu[]> {
  const primary = await supabase
    .from("menus")
    .select("id, name, slug, image_url, display_order, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (!primary.error) return primary.data || [];

  const fallback = await supabase
    .from("menu")
    .select("id, name, slug, image_url, display_order, is_active")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (!fallback.error) return fallback.data || [];
  return [];
}

const LOCATION_PLACEHOLDER = "Choose your delivery location";

type MenuSection = { key: string; title: string; menuBanner?: string; data: Product[] };

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();
  const { locationData, nearestOutlet, setLocationData, getCurrentLocation, isLoadingLocation } = useLocation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menus, setMenus] = useState<TopMenu[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);

  const [locationOpen, setLocationOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const listRef = useRef<SectionList<Product, MenuSection>>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [topMenus, catRes, prodRes] = await Promise.all([
          fetchTopMenus(),
          supabase.from("categories").select("*"),
          supabase.from("products").select("*").eq("is_active", true),
        ]);
        if (catRes.error) throw catRes.error;
        if (prodRes.error) throw prodRes.error;
        const cats: Category[] = (catRes.data || [])
          .filter((c: Category) => c.is_active !== false)
          .sort((a: Category, b: Category) => (a.display_order ?? 99) - (b.display_order ?? 99));
        setMenus(topMenus);
        setCategories(cats);
        setProducts(prodRes.data || []);
        if (cats.length > 0) setActiveCategoryId(cats[0].id);
      } catch (e) {
        console.error(e);
        setError("Failed to load menu. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (vegOnly && p.is_veg === false) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [products, searchQuery, vegOnly]);

  const visibleCategories = useMemo(
    () => categories.filter((cat) => filteredProducts.some((p) => p.category_id === cat.id)),
    [categories, filteredProducts]
  );

  const menuGroups = useMemo<MenuGroup[]>(() => {
    const grouped = new Map<string, MenuGroup & { display_order: number }>();

    menus.forEach((menu) => {
      grouped.set(menu.id, {
        id: menu.id,
        name: menu.name,
        categories: [],
        display_order: menu.display_order ?? 99,
      });
    });

    const uncategorized: MenuGroup & { display_order: number } = {
      id: "ungrouped",
      name: "Menu",
      categories: [],
      display_order: 999,
    };

    visibleCategories.forEach((cat) => {
      const menuId = cat.menu_id;
      if (menuId && grouped.has(menuId)) {
        grouped.get(menuId)!.categories.push(cat);
      } else {
        uncategorized.categories.push(cat);
      }
    });

    const result = Array.from(grouped.values()).filter((g) => g.categories.length > 0);
    const hasStructured = result.length > 0;
    if (uncategorized.categories.length > 0) {
      uncategorized.name = hasStructured ? "More" : undefined;
      result.push(uncategorized);
    }

    return result.sort((a, b) => a.display_order - b.display_order).map((g) => ({
      id: g.id,
      name: g.name,
      categories: g.categories,
    }));
  }, [menus, visibleCategories]);

  const sections = useMemo<MenuSection[]>(() => {
    const out: MenuSection[] = [];
    for (const group of menuGroups) {
      let firstInGroup = true;
      for (const cat of group.categories) {
        const data = filteredProducts.filter((p) => p.category_id === cat.id);
        if (data.length === 0) continue;
        out.push({
          key: cat.id,
          title: cat.name,
          menuBanner: firstInGroup ? group.name : undefined,
          data,
        });
        firstInGroup = false;
      }
    }
    return out;
  }, [menuGroups, filteredProducts]);

  useEffect(() => {
    if (menuGroups.length === 0) {
      setActiveMenuId(null);
      return;
    }
    if (!activeMenuId || !menuGroups.some((g) => g.id === activeMenuId)) {
      setActiveMenuId(menuGroups[0].id);
    }
  }, [menuGroups, activeMenuId]);

  const categoryToMenuId = useMemo(() => {
    const map = new Map<string, string>();
    menuGroups.forEach((group) => {
      group.categories.forEach((cat) => map.set(cat.id, group.id));
    });
    return map;
  }, [menuGroups]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Product>[] }) => {
      const first = viewableItems[0];
      const key = first?.section?.key;
      if (typeof key === "string") {
        setActiveCategoryId(key);
        const mid = categoryToMenuId.get(key);
        if (mid) setActiveMenuId(mid);
      }
    },
    [categoryToMenuId]
  );

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || null;
  const activeCategoryLabel = activeCategory?.name || menuGroups[0]?.categories[0]?.name || "Categories";

  const storeName = nearestOutlet?.name || "Nile Cafe";
  const storeMeta = locationData?.displayName || "Freshly made favourites near you";

  const { locationCityLine, locationAddressLine } = useMemo(() => {
    const stripRedundantCityFromAddress = (city: string, addr: string): string => {
      const c = city.trim();
      const a = addr.trim();
      if (!c || !a || city === LOCATION_PLACEHOLDER) return addr;
      const cLow = c.toLowerCase();
      const aLow = a.toLowerCase();
      if (aLow === cLow) return "";
      if (!aLow.startsWith(cLow)) return a;
      let rest = a.slice(c.length).trim();
      rest = rest.replace(/^([,;\-–—]\s*)+/, "").trim();
      if (!rest || rest.toLowerCase() === cLow) return "";
      return rest;
    };

    const outlet = nearestOutlet;
    const loc = locationData;
    const dn = loc?.displayName?.trim() || "";
    const outletNameLower = outlet?.name?.trim().toLowerCase() || "";
    const dnLower = dn.toLowerCase();

    let city = loc?.city?.trim() || outlet?.city?.trim() || "";
    if (!city && dn.includes(",")) {
      city = dn.split(",")[0]?.trim() || "";
    }

    let addressLine = "";
    if (loc && dn) {
      if (dn.includes(",")) {
        const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rest =
          city && dn ? dn.replace(new RegExp(`^${escaped}\\s*,\\s*`, "i"), "").trim() : dn.split(",").slice(1).join(",").trim();
        addressLine = rest && rest.toLowerCase() !== city.toLowerCase() ? rest : loc.state?.trim() || "";
      } else if (!outletNameLower || dnLower !== outletNameLower) {
        addressLine = dn;
      }
    } else if (outlet?.address) {
      addressLine = outlet.address;
    }

    let cityLine = city || LOCATION_PLACEHOLDER;
    if (outletNameLower && cityLine.toLowerCase() === outletNameLower) {
      cityLine = outlet?.city?.trim() || LOCATION_PLACEHOLDER;
    }

    addressLine = stripRedundantCityFromAddress(cityLine, addressLine);
    return { locationCityLine: cityLine, locationAddressLine: addressLine };
  }, [locationData, nearestOutlet]);

  const hideStoreTitleRow = useMemo(() => {
    if (locationCityLine === LOCATION_PLACEHOLDER) return false;
    return storeName.trim().toLowerCase() === locationCityLine.trim().toLowerCase();
  }, [storeName, locationCityLine]);

  const showStoreSubtitle = useMemo(() => {
    const a = storeMeta?.trim().toLowerCase();
    const b = locationAddressLine?.trim().toLowerCase();
    if (a && b && a === b) return false;
    return true;
  }, [storeMeta, locationAddressLine]);

  const scrollToCategory = useCallback(
    (id: string) => {
      setActiveCategoryId(id);
      const parentMenuId = categoryToMenuId.get(id);
      if (parentMenuId) setActiveMenuId(parentMenuId);
      const idx = sections.findIndex((s) => s.key === id);
      if (idx >= 0) {
        try {
          listRef.current?.scrollToLocation({
            sectionIndex: idx,
            itemIndex: 0,
            animated: true,
            viewOffset: 140,
          });
        } catch {
          /* SectionList can throw if not measured yet */
        }
      }
      setCategoryOpen(false);
    },
    [categoryToMenuId, sections]
  );

  const onSelectLocation = useCallback(
    async (loc: LocationData) => {
      await setLocationData(loc);
      setLocationOpen(false);
    },
    [setLocationData]
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: Math.max(8, insets.top) }]}>
        <Pressable style={styles.locBtn} onPress={() => setLocationOpen(true)}>
          <Text style={styles.locEmoji} accessibilityLabel="Location">
            📍
          </Text>
          <View style={styles.locTextCol}>
            <View style={styles.locTitleRow}>
              <Text style={styles.locCity} numberOfLines={1}>
                {locationCityLine}
              </Text>
              <Text style={styles.chev}>▼</Text>
            </View>
            {locationAddressLine ? (
              <Text style={styles.locAddr} numberOfLines={2}>
                {locationAddressLine}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable style={styles.userBtn} onPress={() => setAccountOpen(true)} accessibilityLabel="Account">
          <Text style={styles.userEmoji}>👤</Text>
        </Pressable>
      </View>

      <SectionList<Product, MenuSection>
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 20, minimumViewTime: 80 }}
        ListHeaderComponent={
          <View style={styles.sticky}>
            {!hideStoreTitleRow ? <Text style={styles.storeName}>{storeName}</Text> : null}
            {showStoreSubtitle ? <Text style={styles.storeMeta}>{storeMeta}</Text> : null}
            <TextInput
              style={styles.search}
              placeholder="Search menu"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.toggleRow}>
              <Pressable
                style={[styles.toggleBtn, orderType === "delivery" && styles.toggleBtnOn]}
                onPress={() => setOrderType("delivery")}
              >
                <Text style={[styles.toggleTxt, orderType === "delivery" && styles.toggleTxtOn]}>Delivery</Text>
              </Pressable>
              <Pressable
                style={[styles.toggleBtn, orderType === "pickup" && styles.toggleBtnOn]}
                onPress={() => setOrderType("pickup")}
              >
                <Text style={[styles.toggleTxt, orderType === "pickup" && styles.toggleTxtOn]}>Pickup</Text>
              </Pressable>
              <Pressable style={styles.vegToggle} onPress={() => setVegOnly((v) => !v)}>
                <Text style={[styles.vegTxt, vegOnly && styles.vegTxtOn]}>Veg only</Text>
              </Pressable>
            </View>
            {!loading && !error ? (
              <View style={styles.promo}>
                <PromoBanner />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.textMuted} />
          ) : error ? (
            <Text style={styles.err}>{error}</Text>
          ) : (
            <Text style={styles.empty}>No items found. Try another search or filter.</Text>
          )
        }
        renderSectionHeader={({ section }) => (
          <View>
            {section.menuBanner ? (
              <View style={styles.groupHead}>
                <Text style={styles.groupTitle}>{section.menuBanner}</Text>
              </View>
            ) : null}
            <View style={styles.catHead}>
              <Text style={styles.catTitle}>{section.title}</Text>
              <Text style={styles.catCount}>({section.data.length})</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => <MenuItemCard product={item} />}
      />

      {!cartOpen && (
        <View style={[styles.fabRow, { bottom: Math.max(16, insets.bottom + 12) }]}>
          <Pressable style={styles.fabCat} onPress={() => setCategoryOpen(true)}>
            <View style={styles.fabCatIcon}>
              <Text style={styles.fabCatLetter}>{activeCategoryLabel.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.fabCatLabel} numberOfLines={1}>
              {activeCategoryLabel}
            </Text>
          </Pressable>
          <View style={styles.fabSep} />
          <Pressable style={styles.fabCart} onPress={() => setCartOpen(true)}>
            <Text style={styles.fabCartText}>Cart{totalItems > 0 ? ` (${totalItems})` : ""}</Text>
          </Pressable>
        </View>
      )}

      <LocationPickerModal
        visible={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSelectLocation={onSelectLocation}
        onUseCurrentLocation={async (): Promise<void> => {
          await getCurrentLocation();
        }}
        locationLoading={isLoadingLocation}
      />

      <AccountSheet visible={accountOpen} onClose={() => setAccountOpen(false)} />

      <CategoryPickerSheet
        visible={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        menuGroups={menuGroups}
        activeCategoryId={activeCategoryId}
        onSelectCategory={scrollToCategory}
      />

      <CartSheet
        visible={cartOpen}
        onClose={() => setCartOpen(false)}
        orderType={orderType}
        onOrderTypeChange={setOrderType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  locBtn: { flex: 1, flexDirection: "row", gap: 8, alignItems: "flex-start", paddingVertical: 4 },
  locEmoji: { fontSize: 16, marginTop: 2 },
  chev: { fontSize: 10, color: colors.textSecondary, marginTop: 4, marginLeft: 2 },
  userEmoji: { fontSize: 20 },
  locTextCol: { flex: 1, minWidth: 0 },
  locTitleRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locCity: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  locAddr: { marginTop: 2, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  userBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  sticky: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  storeName: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  storeMeta: { marginTop: 4, fontSize: 14, color: colors.textSecondary },
  search: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: colors.pillBg,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  toggleBtnOn: { backgroundColor: colors.white, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4 },
  toggleTxt: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  toggleTxtOn: { color: colors.greenDark },
  vegToggle: { paddingHorizontal: 12, paddingVertical: 8 },
  vegTxt: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
  vegTxtOn: { color: colors.greenDark },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  promo: { marginBottom: 16 },
  group: { marginBottom: 8 },
  groupHead: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 8 },
  groupTitle: { fontSize: 22, fontWeight: "600", color: colors.textPrimary },
  catHead: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, marginBottom: 4 },
  catTitle: { fontSize: 18, fontWeight: "600", color: colors.textPrimary },
  catCount: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  err: { textAlign: "center", marginTop: 40, color: colors.textSecondary, fontWeight: "600" },
  empty: { textAlign: "center", marginVertical: 40, color: colors.textSecondary },
  fabRow: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "92%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
  },
  fabCat: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingVertical: 12, maxWidth: "62%" },
  fabCatIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.pillBg,
    alignItems: "center",
    justifyContent: "center",
  },
  fabCatLetter: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  fabCatLabel: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  fabSep: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.border },
  fabCart: { paddingHorizontal: 16, paddingVertical: 12 },
  fabCartText: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
});
