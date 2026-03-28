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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CartSheet } from "../src/components/CartSheet";
import { CategoryPickerSheet, type CategoryOriginRect } from "../src/components/CategoryPickerSheet";
import { StartScreenFlow } from "../src/components/flowSheet/StartScreenFlow";
import { MenuItemCard, type Product } from "../src/components/MenuItemCard";
import { useCart } from "../src/context/CartContext";
import { useLocation } from "../src/context/LocationContext";
import type { ItemOptionRow } from "../src/lib/itemOptions";
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

/** Menu sections on home; category picker uses a flat list derived from this order. */
type MenuGroup = {
  id: string;
  name?: string;
  categories: Category[];
};

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

type MenuSection = {
  key: string;
  title: string;
  menuBanner?: string;
  /** Product count (for header); `data` is paired rows for the grid. */
  itemCount: number;
  data: Product[][];
};

function chunkProductsForGrid(products: Product[]): Product[][] {
  const clean = products.filter((p): p is Product => Boolean(p?.id));
  const rows: Product[][] = [];
  for (let i = 0; i < clean.length; i += 2) {
    rows.push(clean.slice(i, i + 2));
  }
  return rows;
}

function gridRowKey(pair: Product[] | undefined | null, index: number): string {
  const row = pair ?? [];
  const a = row[0]?.id;
  const b = row[1]?.id;
  if (a && b) return `${a}-${b}`;
  if (a) return `${a}-solo-${index}`;
  return `grid-fallback-${index}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { totalItems } = useCart();
  const { locationData, nearestOutlet, setLocationData, getCurrentLocation, isLoadingLocation } = useLocation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menus, setMenus] = useState<TopMenu[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemOptionsRows, setItemOptionsRows] = useState<ItemOptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);

  const [locationOpen, setLocationOpen] = useState(false);
  const [profileLoginOpen, setProfileLoginOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryOrigin, setCategoryOrigin] = useState<CategoryOriginRect | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const listRef = useRef<SectionList<Product[], MenuSection>>(null);
  const categoryFabRef = useRef<View>(null);
  /** While set, ignore viewability updates unless they match this category (picker scroll vs list fighting). */
  const programmaticCategoryTargetRef = useRef<string | null>(null);
  const programmaticCategoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (programmaticCategoryTimerRef.current) {
        clearTimeout(programmaticCategoryTimerRef.current);
        programmaticCategoryTimerRef.current = null;
      }
    };
  }, []);

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
        const plist = (prodRes.data || []) as Product[];
        const pids = plist.map((p) => p.id).filter(Boolean);
        let mappedOpts: ItemOptionRow[] = [];
        if (pids.length > 0) {
          const { data: optData, error: optErr } = await supabase.from("item_options").select("*").in("product_id", pids);
          if (optErr) throw optErr;
          mappedOpts = (optData || []).map((r: Record<string, unknown>) => ({
            id: String(r.id),
            product_id: String(r.product_id),
            option_type: String(r.option_type),
            label: String(r.label),
            price_delta: Number(r.price_delta) || 0,
            is_default: Boolean(r.is_default),
            display_order: Number(r.display_order) || 0,
          }));
        }
        setProducts(plist);
        setItemOptionsRows(mappedOpts);
        if (cats.length > 0) setActiveCategoryId(cats[0].id);
      } catch (e) {
        console.error(e);
        setError("Failed to load menu. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const itemOptionsByProduct = useMemo(() => {
    const m = new Map<string, ItemOptionRow[]>();
    for (const o of itemOptionsRows) {
      const arr = m.get(o.product_id) ?? [];
      arr.push(o);
      m.set(o.product_id, arr);
    }
    return m;
  }, [itemOptionsRows]);

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
    type Acc = MenuGroup & { display_order: number };
    const grouped = new Map<string, Acc>();

    menus.forEach((menu) => {
      grouped.set(menu.id, {
        id: menu.id,
        name: menu.name,
        categories: [],
        display_order: menu.display_order ?? 99,
      });
    });

    const uncategorized: Acc = {
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

  const categoryPickerCategories = useMemo(
    () => menuGroups.flatMap((g) => g.categories),
    [menuGroups]
  );

  const sections = useMemo<MenuSection[]>(() => {
    const out: MenuSection[] = [];
    for (const group of menuGroups) {
      let firstInGroup = true;
      for (const cat of group.categories) {
        const data = filteredProducts.filter((p) => p.category_id === cat.id && p?.id);
        if (data.length === 0) continue;
        out.push({
          key: cat.id,
          title: cat.name,
          menuBanner: firstInGroup ? group.name : undefined,
          itemCount: data.length,
          data: chunkProductsForGrid(data),
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
    ({ viewableItems }: { viewableItems: ViewToken<Product[]>[] }) => {
      const first = viewableItems[0];
      const key = first?.section?.key;
      if (typeof key !== "string") return;

      const pending = programmaticCategoryTargetRef.current;
      if (pending != null) {
        if (key !== pending) return;
        programmaticCategoryTargetRef.current = null;
        if (programmaticCategoryTimerRef.current) {
          clearTimeout(programmaticCategoryTimerRef.current);
          programmaticCategoryTimerRef.current = null;
        }
      }

      setActiveCategoryId(key);
      const mid = categoryToMenuId.get(key);
      if (mid) setActiveMenuId(mid);
    },
    [categoryToMenuId]
  );

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || null;
  const activeCategoryLabel = activeCategory?.name || menuGroups[0]?.categories[0]?.name || "Categories";


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

  const openCategoryPicker = useCallback(() => {
    categoryFabRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      setCategoryOrigin({ x, y, width, height });
      setCategoryOpen(true);
    });
  }, []);

  const closeCategoryPicker = useCallback(() => {
    setCategoryOpen(false);
  }, []);

  const scrollToCategory = useCallback(
    (id: string) => {
      if (programmaticCategoryTimerRef.current) {
        clearTimeout(programmaticCategoryTimerRef.current);
        programmaticCategoryTimerRef.current = null;
      }
      programmaticCategoryTargetRef.current = id;
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
          programmaticCategoryTimerRef.current = setTimeout(() => {
            programmaticCategoryTargetRef.current = null;
            programmaticCategoryTimerRef.current = null;
          }, 2800);
        } catch {
          programmaticCategoryTargetRef.current = null;
        }
      } else {
        programmaticCategoryTargetRef.current = null;
      }
      closeCategoryPicker();
    },
    [categoryToMenuId, closeCategoryPicker, sections]
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
          <Ionicons name="location-outline" size={18} color={colors.textPrimary} style={styles.locIcon} accessibilityLabel="Location" />
          <View style={styles.locTextCol}>
            <View style={styles.locTitleRow}>
              <Text style={styles.locCity} numberOfLines={1}>
                {locationCityLine}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textSecondary} style={styles.chevIcon} />
            </View>
            {locationAddressLine ? (
              <Text style={styles.locAddr} numberOfLines={1}>
                {locationAddressLine}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable style={styles.userBtn} onPress={() => setProfileLoginOpen(true)} accessibilityLabel="Account">
          <Ionicons name="person-outline" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <SectionList<Product[], MenuSection>
        ref={listRef}
        sections={sections}
        keyExtractor={(pair, index) => gridRowKey(pair, index)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 20, minimumViewTime: 80 }}
        ListHeaderComponent={
          <View style={styles.sticky}>
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
              <Text style={styles.catCount}>({section.itemCount})</Text>
            </View>
          </View>
        )}
        renderItem={({ item: pair }) => {
          const row = (pair ?? []).filter((p): p is Product => Boolean(p?.id));
          if (row.length === 0) return null;
          return (
            <View style={styles.menuGridRow}>
              {row.map((product) => (
                <View key={product.id} style={styles.menuGridCell}>
                  <MenuItemCard product={product} itemOptions={itemOptionsByProduct.get(product.id) ?? []} />
                </View>
              ))}
              {row.length === 1 ? <View style={styles.menuGridCell} /> : null}
            </View>
          );
        }}
      />

      <View style={[styles.fabWrap, { bottom: Math.max(16, insets.bottom + 12) }]}>
        <View
          ref={categoryFabRef}
          collapsable={false}
          style={[styles.fabCat, categoryOpen && styles.fabCatHidden]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={openCategoryPicker} />
          <View pointerEvents="none" style={styles.fabCatRow}>
            <View style={styles.fabCatIcon}>
              <Text style={styles.fabCatLetter}>{activeCategoryLabel.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.fabCatLabel} numberOfLines={1}>
              {activeCategoryLabel}
            </Text>
          </View>
        </View>
        {!cartOpen ? (
          <Pressable style={styles.fabCart} onPress={() => setCartOpen(true)}>
            <Text style={styles.fabCartText}>Cart{totalItems > 0 ? ` (${totalItems})` : ""}</Text>
          </Pressable>
        ) : null}
      </View>

      <StartScreenFlow
        visible={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSelectLocation={onSelectLocation}
        onUseCurrentLocation={async (): Promise<void> => {
          await getCurrentLocation();
        }}
        locationLoading={isLoadingLocation}
        showBackButton={false}
      />

      <StartScreenFlow
        visible={profileLoginOpen}
        onClose={() => setProfileLoginOpen(false)}
        onSelectLocation={async (): Promise<void> => { }}
        onUseCurrentLocation={async (): Promise<void> => { }}
        requireAuthFirst
        authOnly
      />

      <CategoryPickerSheet
        visible={categoryOpen}
        onClose={closeCategoryPicker}
        categories={categoryPickerCategories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={scrollToCategory}
        originRect={categoryOrigin}
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
  locIcon: { marginTop: 2 },
  chevIcon: { marginTop: 1, marginLeft: 2 },
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
  menuGridRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  menuGridCell: { flex: 1, minWidth: 0 },
  fabWrap: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    maxWidth: "92%",
  },
  fabCat: {
    flex: 1,
    minWidth: 0,
    maxWidth: "68%",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    position: "relative",
  },
  fabCatHidden: {
    opacity: 0,
  },
  fabCatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 12,
    flex: 1,
    minWidth: 0,
  },
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
  fabCart: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  fabCartText: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
});
