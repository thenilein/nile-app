import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, ShoppingBag, Store, Truck, User, X } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase.ts";
import { useLocation } from "../context/LocationContext.tsx";
import MenuSidebar from "../components/MenuSidebar.tsx";
import MenuItemCard, { Product } from "../components/MenuItemCard.tsx";
import CartPanel from "../components/CartPanel.tsx";
import PromoBanner from "../components/PromoBanner.tsx";
import MenuSearch, { VegOnlyToggle } from "../components/MenuSearch.tsx";
import LocationSearch from "../components/LocationSearch.tsx";
import AuthModal from "../components/AuthModal.tsx";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";

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

interface MenuGroup {
    id: string;
    name?: string;
    slug: string;
    image_url?: string | null;
    display_order: number;
    categories: Category[];
}

const SkeletonCard = () => (
    <div className="animate-pulse border-b border-[#F1F5F9] py-5">
        <div className="flex gap-4">
            <div className="flex-1 space-y-3">
                <div className="h-3 w-28 rounded bg-gray-100" />
                <div className="h-5 w-52 rounded bg-gray-100" />
                <div className="h-4 w-20 rounded bg-gray-100" />
                <div className="h-3 w-full max-w-md rounded bg-gray-100" />
                <div className="h-3 w-3/4 max-w-sm rounded bg-gray-100" />
            </div>
            <div className="h-[110px] w-[118px] rounded-2xl bg-gray-100 md:h-[132px] md:w-[148px]" />
        </div>
    </div>
);

async function fetchTopMenus(): Promise<TopMenu[]> {
    const primary = await supabase
        .from("menus")
        .select("id, name, slug, image_url, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

    if (!primary.error) {
        return primary.data || [];
    }

    const fallback = await supabase
        .from("menu")
        .select("id, name, slug, image_url, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

    if (!fallback.error) {
        return fallback.data || [];
    }

    console.warn("Failed to load top-level menus from 'menus' and 'menu'", {
        menusError: primary.error,
        menuError: fallback.error,
    });

    return [];
}

const Menu: React.FC = () => {
    const { locationData, nearestOutlet, getCurrentLocation } = useLocation();
    const { user, signOut } = useAuth();
    const { totalItems } = useCart();

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
    const [checkoutLaunchKey, setCheckoutLaunchKey] = useState(0);
    const [isCategoryDrawerOpen, setIsCategoryDrawerOpen] = useState(false);
    const [mobileCartDrawerOpen, setMobileCartDrawerOpen] = useState(false);
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);

    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const clickLockRef = useRef(false);
    const clickLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const locationPickerPrevKeyRef = useRef<string | null>(null);

    const locationKey = locationData ? `${locationData.latitude},${locationData.longitude},${locationData.displayName}` : "none";
    const overlayOpenRef = useRef(false);

    useEffect(() => {
        overlayOpenRef.current = Boolean(
            isCategoryDrawerOpen || isLocationPickerOpen || isAccountSheetOpen || mobileCartDrawerOpen
        );
    }, [isCategoryDrawerOpen, isLocationPickerOpen, isAccountSheetOpen, mobileCartDrawerOpen]);

    useEffect(() => {
        const handleOpenCheckout = () => {
            setMobileCartDrawerOpen(true);
            setCheckoutLaunchKey((k) => k + 1);
        };
        window.addEventListener("open-checkout", handleOpenCheckout);
        return () => window.removeEventListener("open-checkout", handleOpenCheckout);
    }, []);

    useEffect(() => {
        const fetchMenu = async () => {
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
            } catch (err: any) {
                console.error("Failed to load menu", err);
                setError("Failed to load menu. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, []);

    const filteredProducts = products.filter((p) => {
        if (vegOnly && p.is_veg === false) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return p.name.toLowerCase().includes(q) || (p.description?.toLowerCase().includes(q) ?? false);
        }
        return true;
    });

    const visibleCategories = useMemo(
        () => categories.filter((cat) => filteredProducts.some((p) => p.category_id === cat.id)),
        [categories, filteredProducts]
    );

    const menuGroups = useMemo<MenuGroup[]>(() => {
        const grouped = new Map<string, MenuGroup>();

        menus.forEach((menu) => {
            grouped.set(menu.id, {
                id: menu.id,
                name: menu.name,
                slug: menu.slug,
                image_url: menu.image_url,
                display_order: menu.display_order ?? 99,
                categories: [],
            });
        });

        const uncategorized: MenuGroup = {
            id: "ungrouped",
            name: "Menu",
            slug: "menu",
            image_url: null,
            display_order: 999,
            categories: [],
        };

        visibleCategories.forEach((cat) => {
            const menuId = (cat as Category & { menu_id?: string | null }).menu_id;
            if (menuId && grouped.has(menuId)) {
                grouped.get(menuId)!.categories.push(cat);
            } else {
                uncategorized.categories.push(cat);
            }
        });

        const result = Array.from(grouped.values()).filter((group) => group.categories.length > 0);
        const hasStructuredMenus = result.length > 0;
        if (uncategorized.categories.length > 0) {
            uncategorized.name = hasStructuredMenus ? "More" : undefined;
            result.push(uncategorized);
        }

        return result.sort((a, b) => a.display_order - b.display_order);
    }, [menus, visibleCategories]);

    useEffect(() => {
        if (menuGroups.length === 0) {
            setActiveMenuId(null);
            return;
        }
        if (!activeMenuId || !menuGroups.some((group) => group.id === activeMenuId)) {
            setActiveMenuId(menuGroups[0].id);
        }
    }, [menuGroups, activeMenuId]);

    const displayedMenuGroups = menuGroups;
    const activeMenuGroup = menuGroups.find((group) => group.id === activeMenuId) || menuGroups[0] || null;
    const activeCategory = categories.find((category) => category.id === activeCategoryId) || null;
    const activeCategoryLabel = activeCategory?.name || activeMenuGroup?.categories[0]?.name || "Categories";

    const categoryToMenuId = useMemo(() => {
        const map = new Map<string, string>();
        menuGroups.forEach((group) => {
            group.categories.forEach((cat) => map.set(cat.id, group.id));
        });
        return map;
    }, [menuGroups]);

    const activeCategoryIdRef = useRef<string | null>(activeCategoryId);
    const activeMenuIdRef = useRef<string | null>(activeMenuId);
    useEffect(() => { activeCategoryIdRef.current = activeCategoryId; }, [activeCategoryId]);
    useEffect(() => { activeMenuIdRef.current = activeMenuId; }, [activeMenuId]);

    const scrollToCategory = useCallback((id: string) => {
        setActiveCategoryId(id);
        const parentMenuId = categoryToMenuId.get(id);
        if (parentMenuId) setActiveMenuId(parentMenuId);
        clickLockRef.current = true;
        if (clickLockTimerRef.current) clearTimeout(clickLockTimerRef.current);
        clickLockTimerRef.current = setTimeout(() => {
            clickLockRef.current = false;
        }, 1200);

        const el = sectionRefs.current[id];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        setIsCategoryDrawerOpen(false);
    }, [categoryToMenuId]);

    const updateActiveCategoryFromScroll = useCallback(() => {
        if (clickLockRef.current) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        // Pick the category whose section intersects a fixed "focus line" inside the viewport.
        // This is much more stable than thresholding based on section tops.
        const focusLineY = containerRect.top + 140;

        let bestCatId: string | null = null;
        let bestTop = -Infinity;
        const entries = Object.entries(sectionRefs.current);

        // 1) Prefer the category whose section covers the focus line.
        for (const [catId, el] of entries) {
            if (!el) continue;
            const rect = el.getBoundingClientRect();
            const intersectsFocusLine = rect.top <= focusLineY && rect.bottom > focusLineY;
            if (intersectsFocusLine) {
                // If multiple intersect (rare), choose the one with the closest top (i.e. last one).
                if (rect.top > bestTop) {
                    bestTop = rect.top;
                    bestCatId = catId;
                }
            }
        }

        // 2) Fallback: if nothing intersects (e.g. immediate after layout), pick nearest section center.
        if (!bestCatId) {
            let bestDist = Infinity;
            let bestByCenterTop: string | null = null;
            for (const [catId, el] of entries) {
                if (!el) continue;
                const rect = el.getBoundingClientRect();
                const centerY = (rect.top + rect.bottom) / 2;
                const dist = Math.abs(centerY - focusLineY);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestByCenterTop = catId;
                }
            }
            bestCatId = bestByCenterTop;
        }

        if (!bestCatId) return;

        if (bestCatId !== activeCategoryIdRef.current) {
            activeCategoryIdRef.current = bestCatId;
            setActiveCategoryId(bestCatId);
        }

        const parentMenuId = categoryToMenuId.get(bestCatId);
        if (parentMenuId && parentMenuId !== activeMenuIdRef.current) {
            activeMenuIdRef.current = parentMenuId;
            setActiveMenuId(parentMenuId);
        }
    }, [categoryToMenuId]);

    const scrollToMenuGroup = useCallback((menuId: string) => {
        setActiveMenuId(menuId);
        const group = menuGroups.find((item) => item.id === menuId);
        const firstCategory = group?.categories[0];
        if (firstCategory) {
            scrollToCategory(firstCategory.id);
        } else {
            setIsCategoryDrawerOpen(false);
        }
    }, [menuGroups, scrollToCategory]);

    const openCategorySheet = useCallback(() => {
        setIsCategoryDrawerOpen(true);
    }, []);

    useEffect(() => {
        if (menuGroups.length === 0) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        let raf = 0;
        const onScroll = () => {
            if (clickLockRef.current) return;
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                raf = 0;
                updateActiveCategoryFromScroll();
            });
        };

        container.addEventListener("scroll", onScroll, { passive: true });
        requestAnimationFrame(() => updateActiveCategoryFromScroll());

        return () => {
            container.removeEventListener("scroll", onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [menuGroups, updateActiveCategoryFromScroll]);

    useEffect(() => {
        if (loading) return;
        // After filtering/layout changes, ensure the active highlight matches the current scroll position.
        requestAnimationFrame(() => updateActiveCategoryFromScroll());
    }, [loading, searchQuery, vegOnly, updateActiveCategoryFromScroll]);

    const openLocationPicker = useCallback(() => {
        locationPickerPrevKeyRef.current = locationKey;
        setIsLocationPickerOpen(true);
    }, [locationKey]);

    useEffect(() => {
        if (!isLocationPickerOpen) return;
        if (locationPickerPrevKeyRef.current === null) return;
        if (locationKey !== locationPickerPrevKeyRef.current) {
            setIsLocationPickerOpen(false);
        }
    }, [isLocationPickerOpen, locationKey]);

    const storeName = nearestOutlet?.name || "Nile Ice Creams";
    // User-visible subtitle should reflect the user's selected location, not the outlet address.
    const storeMeta = locationData?.displayName || "Freshly scooped favourites near you";

    const LOCATION_PLACEHOLDER = "Choose your delivery location";

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

        let city =
            loc?.city?.trim() ||
            outlet?.city?.trim() ||
            "";
        if (!city && dn.includes(",")) {
            city = dn.split(",")[0]?.trim() || "";
        }

        // Single-line displayName is usually a full label or venue — not the city row.
        // For address, prefer the user's selected location (`locationData`), not outlet address.
        let addressLine = "";
        if (loc && dn) {
            if (dn.includes(",")) {
                const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const rest =
                    city && dn
                        ? dn.replace(new RegExp(`^${escaped}\\s*,\\s*`, "i"), "").trim()
                        : dn.split(",").slice(1).join(",").trim();
                addressLine = (rest && rest.toLowerCase() !== city.toLowerCase() ? rest : "") || loc.state?.trim() || "";
            } else if (!outletNameLower || dnLower !== outletNameLower) {
                // Avoid showing outlet/shop title as "address" when displayName is just a venue name.
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

    const menuViewportRef = useRef<HTMLDivElement>(null);

    // Starbucks-like behavior: on desktop/tablet, scroll anywhere on the menu page
    // and drive the central menu list scroll container.
    useEffect(() => {
        const viewportEl = menuViewportRef.current;
        const scrollEl = scrollContainerRef.current;
        if (!viewportEl || !scrollEl) return;

        const mq = window.matchMedia("(min-width: 768px)");
        const onWheel = (e: WheelEvent) => {
            if (!mq.matches) return;
            if (!scrollContainerRef.current) return;
            if (overlayOpenRef.current) return;

            // Don't hijack wheel when user is actively interacting with form inputs.
            const active = document.activeElement;
            if (active) {
                const tag = active.tagName;
                const isEditable = (active as HTMLElement).isContentEditable;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || isEditable) return;
            }

            e.preventDefault();
            scrollContainerRef.current.scrollTop += e.deltaY;
        };

        viewportEl.addEventListener("wheel", onWheel as EventListener, { passive: false });
        return () => viewportEl.removeEventListener("wheel", onWheel as EventListener);
    }, []);

    return (
        <>
            <motion.div
                ref={menuViewportRef}
                animate={{
                    scale: 1,
                    transformOrigin: "top center",
                    borderRadius: "0px",
                    overflow: "visible",
                }}
                transition={{ duration: 0.3 }}
                className="flex min-h-0 flex-1 flex-col bg-white md:h-[100dvh] md:overflow-hidden"
            >
                <div className="border-b border-[#E5E7EB] bg-white px-4 pb-4 pt-3 md:hidden">
                    <div className="flex items-start gap-3">
                        <button
                            type="button"
                            onClick={openLocationPicker}
                            className="flex min-w-0 flex-1 items-start gap-2 rounded-xl py-0.5 text-left transition-colors active:bg-gray-50"
                        >
                            <MapPin className="mt-1 h-4 w-4 flex-shrink-0 text-[#111827]" />
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-0.5">
                                    <span className="truncate text-[15px] font-semibold leading-snug text-[#111827]">
                                        {locationCityLine}
                                    </span>
                                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-[#6B7280]" aria-hidden />
                                </div>
                                {locationAddressLine ? (
                                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#6B7280]">
                                        {locationAddressLine}
                                    </p>
                                ) : null}
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAccountSheetOpen(true)}
                            aria-label={user ? "Account" : "Log in"}
                            className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[#111827] shadow-sm transition-transform active:scale-95"
                        >
                            <User className="h-5 w-5" strokeWidth={2} />
                        </button>
                    </div>
                </div>

                <div className="hidden border-b border-[#E5E7EB] bg-white md:block">
                    <div className="mx-auto flex w-full max-w-[1480px] items-center gap-6 px-6 py-4 xl:px-10">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0B6B43] shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0B6B43] text-xl font-bold">
                                    N
                                </div>
                            </div>
                            <div className="min-w-0">
                                {!hideStoreTitleRow ? (
                                    <h1 className="truncate text-[32px] font-semibold leading-none text-[#111827]">{storeName}</h1>
                                ) : null}
                                {showStoreSubtitle ? (
                                    <p
                                        className={`truncate text-[14px] text-[#6B7280] ${hideStoreTitleRow ? "" : "mt-1"}`}
                                    >
                                        {storeMeta}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex min-w-0 flex-[1.15] items-center justify-center">
                            <button
                                type="button"
                                onClick={openLocationPicker}
                                className="flex min-w-0 max-w-full items-start gap-3 rounded-xl border border-[#E5E7EB] px-5 py-3 text-left text-[14px] text-[#374151]"
                            >
                                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#111827]" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-center gap-0.5">
                                        <span className="truncate font-semibold text-[#111827]">{locationCityLine}</span>
                                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-[#6B7280]" aria-hidden />
                                    </div>
                                    {locationAddressLine ? (
                                        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#6B7280]">
                                            {locationAddressLine}
                                        </p>
                                    ) : null}
                                </div>
                            </button>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col items-stretch justify-center gap-2">
                            <MenuSearch
                                query={searchQuery}
                                onQueryChange={setSearchQuery}
                                vegOnly={vegOnly}
                                onVegToggle={() => setVegOnly((v) => !v)}
                                hideVeg
                                className="w-full max-w-[520px] self-end"
                            />
                            <div className="flex w-full max-w-[520px] items-center justify-between gap-3 self-end">
                                <div className="flex min-w-0 flex-1 items-center gap-0 rounded-xl bg-[#F3F4F6] p-1">
                                    <button
                                        type="button"
                                        onClick={() => setOrderType("delivery")}
                                        className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors sm:h-11 sm:gap-2 sm:rounded-xl sm:px-5 sm:text-[14px] ${
                                            orderType === "delivery"
                                                ? "bg-white text-[#166534] shadow-sm"
                                                : "text-[#374151] hover:text-[#166534]"
                                        }`}
                                    >
                                        <Truck className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">Delivery</span>
                                    </button>
                                    <div className="h-6 w-px flex-shrink-0 bg-[#E5E7EB] sm:h-7" />
                                    <button
                                        type="button"
                                        onClick={() => setOrderType("pickup")}
                                        className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors sm:h-11 sm:gap-2 sm:rounded-xl sm:px-5 sm:text-[14px] ${
                                            orderType === "pickup"
                                                ? "bg-white text-[#166534] shadow-sm"
                                                : "text-[#374151] hover:text-[#166534]"
                                        }`}
                                    >
                                        <Store className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate">Pickup</span>
                                    </button>
                                </div>
                                <VegOnlyToggle
                                    vegOnly={vegOnly}
                                    onVegToggle={() => setVegOnly((v) => !v)}
                                    className="flex-shrink-0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto flex min-h-0 w-full max-w-[1480px] flex-1 gap-0 px-0 md:px-6 md:py-4 xl:px-10 md:overflow-hidden">
                    <div className="hidden lg:block lg:pr-6">
                        <MenuSidebar
                            menuGroups={menuGroups}
                            activeMenuId={activeMenuId}
                            activeCategoryId={activeCategoryId}
                            onMenuSelect={scrollToMenuGroup}
                            onSelect={scrollToCategory}
                        />
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className="flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain bg-transparent px-4 pb-28 pt-0 md:px-8 md:pb-10 md:pt-4 xl:pr-10 menu-scrollbar-hide"
                    >
                        <div className="sticky top-0 z-20 -mx-4 border-b border-[#E5E7EB] bg-white px-4 pb-3 pt-3 shadow-[0_8px_16px_-8px_rgba(15,23,42,0.12)] md:hidden">
                            <MenuSearch
                                query={searchQuery}
                                onQueryChange={setSearchQuery}
                                vegOnly={vegOnly}
                                onVegToggle={() => setVegOnly((v) => !v)}
                                hideVeg
                                className="w-full"
                            />
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-0 rounded-xl bg-[#F3F4F6] p-1">
                                    <button
                                        type="button"
                                        onClick={() => setOrderType("delivery")}
                                        className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 text-[12px] font-semibold transition-colors ${
                                            orderType === "delivery"
                                                ? "bg-white text-[#166534] shadow-sm"
                                                : "text-[#374151]"
                                        }`}
                                    >
                                        <Truck className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="truncate">Delivery</span>
                                    </button>
                                    <div className="h-5 w-px flex-shrink-0 bg-[#E5E7EB]" />
                                    <button
                                        type="button"
                                        onClick={() => setOrderType("pickup")}
                                        className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 text-[12px] font-semibold transition-colors ${
                                            orderType === "pickup"
                                                ? "bg-white text-[#166534] shadow-sm"
                                                : "text-[#374151]"
                                        }`}
                                    >
                                        <Store className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="truncate">Pickup</span>
                                    </button>
                                </div>
                                <VegOnlyToggle
                                    vegOnly={vegOnly}
                                    onVegToggle={() => setVegOnly((v) => !v)}
                                    className="flex-shrink-0"
                                />
                            </div>
                        </div>

                        <div className="mt-4 md:mt-0">
                            {loading ? (
                                <>
                                    <div className="hidden md:block">
                                        <div className="h-[248px] rounded-[24px] bg-gray-100" />
                                    </div>
                                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                                </>
                            ) : error ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="mb-4 h-12 w-12 rounded-full bg-[#F3F4F6]" />
                                    <p className="font-semibold text-gray-700">{error}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <PromoBanner />
                                    </div>

                                    {displayedMenuGroups.map((group) => (
                                        <section key={group.id} className="mt-8 first:mt-0 md:mt-10">
                                        {group.name && (
                                            <div className="mb-4 border-b border-[#E5E7EB] pb-3 md:mb-6">
                                                <h2 className="text-[22px] font-semibold text-[#111827] md:text-[30px]">
                                                    {group.name}
                                                </h2>
                                            </div>
                                        )}

                                        {group.categories.map((cat) => {
                                            const catProducts = filteredProducts.filter((p) => p.category_id === cat.id);
                                            if (catProducts.length === 0) return null;

                                            return (
                                                <section
                                                    key={cat.id}
                                                    ref={(el) => { sectionRefs.current[cat.id] = el; }}
                                                    data-cat-id={cat.id}
                                                >
                                                    <div className="mb-3 mt-6 flex items-center gap-2 md:mb-4 md:mt-8">
                                                        <h3 className="text-[18px] font-semibold text-[#111827] md:text-[24px]">{cat.name}</h3>
                                                        <span className="text-xs font-medium text-gray-400">({catProducts.length})</span>
                                                    </div>
                                                    <div>
                                                        {catProducts.map((p) => (
                                                            <MenuItemCard key={p.id} product={p} />
                                                        ))}
                                                    </div>
                                                </section>
                                            );
                                        })}
                                        </section>
                                    ))}

                                    {filteredProducts.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <div className="mb-4 h-12 w-12 rounded-full bg-[#F3F4F6]" />
                                            <p className="mb-1 font-semibold text-gray-700">No items found</p>
                                            <p className="text-sm text-gray-400">Try a different search or remove filters</p>
                                        </div>
                                    )}

                                    <div className="h-8 xl:h-0" />
                                </>
                            )}
                        </div>
                    </div>

                    <CartPanel
                        orderType={orderType}
                        onOrderTypeChange={setOrderType}
                        checkoutLaunchKey={checkoutLaunchKey}
                        hideMobileFloatingBar
                        mobileCartDrawerOpen={mobileCartDrawerOpen}
                        onMobileCartDrawerOpenChange={setMobileCartDrawerOpen}
                    />
                </div>
            </motion.div>

            {!mobileCartDrawerOpen && (
                <div
                    className="fixed z-[60] left-1/2 flex h-12 w-max max-w-[min(calc(100vw-2rem),17.5rem)] -translate-x-1/2 overflow-hidden rounded-full border border-[#E5E7EB] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] xl:hidden"
                    style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
                >
                    <button
                        type="button"
                        onClick={openCategorySheet}
                        className="flex min-w-0 max-w-[11rem] flex-1 items-center gap-2 pl-3 pr-2 text-left text-[#111827] transition-colors active:bg-gray-50"
                    >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F3F4F6] text-[10px] font-semibold text-[#6B7280]">
                            {activeCategory?.image_url ? (
                                <img
                                    src={activeCategory.image_url}
                                    alt={activeCategoryLabel}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <span>{activeCategoryLabel.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{activeCategoryLabel}</p>
                    </button>
                    <div className="my-2.5 w-px shrink-0 bg-[#E5E7EB]" aria-hidden />
                    <button
                        type="button"
                        onClick={() => setMobileCartDrawerOpen(true)}
                        className="flex shrink-0 items-center gap-1.5 pl-2 pr-3 text-[#111827] transition-colors active:bg-gray-50"
                        aria-label={`Open cart, ${totalItems} items`}
                    >
                        <ShoppingBag className="h-5 w-5 shrink-0 text-[#374151]" />
                        <span className="text-[14px] font-bold tabular-nums">{totalItems}</span>
                    </button>
                </div>
            )}

            {isCategoryDrawerOpen && (
                <>
                    <button
                        type="button"
                        onClick={() => setIsCategoryDrawerOpen(false)}
                        className="fixed inset-0 z-40 bg-black/40 xl:hidden"
                    />
                    <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-white px-5 pb-6 pt-4 shadow-[0_-18px_48px_rgba(15,23,42,0.18)] xl:hidden">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-[20px] font-semibold text-[#111827]">Categories</h2>
                            <button
                                type="button"
                                onClick={() => setIsCategoryDrawerOpen(false)}
                                className="rounded-full p-2 text-gray-500"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="max-h-[58vh] overflow-y-auto">
                            {menuGroups.map((group) => (
                                <div key={group.id} className="mb-5 last:mb-0">
                                    {group.name && (
                                        <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
                                            {group.name}
                                        </p>
                                    )}
                                    {group.categories.map((cat) => {
                                        const isActive = activeCategoryId === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => scrollToCategory(cat.id)}
                                                className={`mb-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-[15px] ${
                                                    isActive ? "bg-[#F0FDF4] text-[#166534]" : "text-[#374151]"
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F3F4F6] text-[13px] font-semibold text-[#6B7280]">
                                                        {cat.image_url ? (
                                                            <img
                                                                src={cat.image_url}
                                                                alt={cat.name}
                                                                className="h-full w-full object-cover"
                                                                loading="lazy"
                                                                decoding="async"
                                                            />
                                                        ) : (
                                                            <span>{cat.name.charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <span className="truncate">{cat.name}</span>
                                                </div>
                                                <ChevronDown className={`h-4 w-4 -rotate-90 ${isActive ? "opacity-100" : "opacity-0"}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {isLocationPickerOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close location picker"
                        onClick={() => setIsLocationPickerOpen(false)}
                        className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm"
                    />

                    {/* Desktop: popup */}
                    <div className="hidden md:block fixed inset-0 z-[130] pointer-events-none">
                        <div className="absolute inset-0 pointer-events-auto flex items-center justify-center px-6">
                            <div className="w-full max-w-[640px] rounded-[22px] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.25)] border border-[#E5E7EB]">
                                <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
                                    <div>
                                        <p className="text-[14px] font-bold text-[#111827]">Change address</p>
                                        <p className="text-[12px] text-[#6B7280] mt-1">Search for city/locality or use GPS</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsLocationPickerOpen(false)}
                                        className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <LocationSearch />
                                    <button
                                        type="button"
                                        onClick={() => getCurrentLocation()}
                                        className="mt-4 w-full h-[46px] rounded-xl bg-green-50 hover:bg-green-100 text-green-700 font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MapPin className="h-4 w-4" />
                                        Use my current GPS location
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile: bottom sheet */}
                    <div className="md:hidden fixed inset-x-0 bottom-0 z-[130] pointer-events-none">
                        <div className="pointer-events-auto bg-white rounded-t-[28px] shadow-[0_-18px_48px_rgba(15,23,42,0.18)] border-t border-[#E5E7EB] max-h-[86vh] overflow-hidden flex flex-col"
                            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
                        >
                            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                                <div className="w-12 h-1.5 rounded-full bg-gray-200" />
                            </div>
                            <div className="px-5 pb-3 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[18px] font-semibold text-[#111827]">Change address</h2>
                                    <button
                                        type="button"
                                        onClick={() => setIsLocationPickerOpen(false)}
                                        className="rounded-full p-2 text-gray-500 hover:bg-gray-100 transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className="text-[12px] text-[#6B7280] mt-1">Search for city/locality or use GPS</p>
                            </div>
                            <div className="flex-1 overflow-y-auto px-5 pb-2">
                                <LocationSearch />
                                <button
                                    type="button"
                                    onClick={() => getCurrentLocation()}
                                    className="mt-4 w-full h-[46px] rounded-xl bg-green-50 hover:bg-green-100 text-green-700 font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <MapPin className="h-4 w-4" />
                                    Use my current GPS location
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <AuthModal
                isOpen={isAccountSheetOpen && !user}
                onClose={() => setIsAccountSheetOpen(false)}
                variant="bottomSheet"
            />

            {isAccountSheetOpen && user && (
                <>
                    <button
                        type="button"
                        aria-label="Close account"
                        onClick={() => setIsAccountSheetOpen(false)}
                        className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-sm"
                    />
                    <div
                        className="fixed inset-x-0 bottom-0 z-[140] flex flex-col rounded-t-[28px] border-t border-[#E5E7EB] bg-white shadow-[0_-18px_48px_rgba(15,23,42,0.18)]"
                        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
                    >
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="h-1.5 w-12 rounded-full bg-gray-200" />
                        </div>
                        <div className="flex items-center justify-between px-5 pb-2">
                            <h2 className="text-[18px] font-semibold text-[#111827]">Account</h2>
                            <button
                                type="button"
                                onClick={() => setIsAccountSheetOpen(false)}
                                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-5 pb-4">
                            <p className="text-[14px] text-[#6B7280]">
                                Signed in as{" "}
                                <span className="font-medium text-[#111827]">
                                    {user.phone ||
                                        (user.user_metadata?.phone as string | undefined) ||
                                        user.email ||
                                        "Member"}
                                </span>
                            </p>
                        </div>
                        <div className="px-5">
                            <button
                                type="button"
                                onClick={async () => {
                                    await signOut();
                                    setIsAccountSheetOpen(false);
                                }}
                                className="w-full rounded-xl border border-red-200 bg-red-50 py-3.5 text-[15px] font-semibold text-red-700 transition-colors hover:bg-red-100"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </>
            )}

        </>
    );
};

export default Menu;
