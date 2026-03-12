import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Truck, Store, ShoppingBag, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase.ts";
import { useAuth } from "../context/AuthContext.tsx";
import { useCart } from "../context/CartContext.tsx";
import { useLocation } from "../context/LocationContext.tsx";
import MenuSidebar from "../components/MenuSidebar.tsx";
import MenuItemCard, { Product } from "../components/MenuItemCard.tsx";
import CartPanel from "../components/CartPanel.tsx";
import PromoBanner from "../components/PromoBanner.tsx";
import MenuSearch from "../components/MenuSearch.tsx";
import CheckoutDrawer from "../components/CheckoutDrawer.tsx";
import { motion } from "framer-motion";

interface Category {
    id: string;
    name: string;
    slug: string;
    display_order?: number;
    is_active?: boolean;
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
        <div className="h-44 bg-gray-100" />
        <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
            <div className="flex justify-between items-center pt-2">
                <div className="h-4 bg-gray-100 rounded w-12" />
                <div className="h-7 w-14 bg-gray-100 rounded-lg" />
            </div>
        </div>
    </div>
);

// ─── Mobile Category Tabs ────────────────────────────────────────────────────
const categoryEmojis: Record<string, string> = {
    'Scoops': '🍦',
    'Sundaes': '🍨',
    'Shakes': '🥤',
    'Waffles': '🧇',
    'Specials': '✨',
    'Burgers': '🍔',
    'Pizzas': '🍕',
    'Combos': '🎁',
};

const MobileCategoryTabs: React.FC<{
    categories: Category[];
    activeCategoryId: string | null;
    onSelect: (id: string) => void;
}> = ({ categories, activeCategoryId, onSelect }) => {
    const activeChipRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (activeChipRef.current) {
            activeChipRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeCategoryId]);

    return (
        <div className="lg:hidden sticky top-[64px] z-30 bg-white border-b border-[#F3F4F6] px-[16px] py-[12px] w-full">
            <style>{`
                .hide-scroll::-webkit-scrollbar { display: none; }
            `}</style>
            <div
                className="hide-scroll flex items-center gap-2 overflow-x-auto w-full"
                style={{ 
                    scrollbarWidth: 'none', 
                    scrollSnapType: 'x mandatory',
                    scrollBehavior: 'smooth' 
                }}
            >
                {categories.map((cat) => {
                    const isActive = activeCategoryId === cat.id;
                    const emoji = categoryEmojis[cat.name] || '';
                    return (
                        <button
                            key={cat.id}
                            ref={isActive ? activeChipRef : null}
                            onClick={() => onSelect(cat.id)}
                            style={{ scrollSnapAlign: 'start' }}
                            className={`flex-shrink-0 flex items-center justify-center h-[32px] px-[16px] rounded-full text-[13px] font-[600] transition-all whitespace-nowrap ${
                                isActive
                                    ? "bg-[#16A34A] text-white shadow-[0_2px_8px_rgba(22,163,74,0.35)]"
                                    : "bg-[#F3F4F6] text-[#6B7280]"
                            }`}
                        >
                            {emoji && <span className="mr-1.5">{emoji}</span>}
                            {cat.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};



// ─── Main Menu Component ──────────────────────────────────────────────────────
const Menu: React.FC = () => {
    const { user } = useAuth();
    const { locationData } = useLocation();
    const navigate = useNavigate();

    // Data
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [vegOnly, setVegOnly] = useState(false);
    const [popularOnly, setPopularOnly] = useState(false);

    // Checkout drawer state
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Section refs for scroll-spy
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // Prevents IntersectionObserver from overwriting active state right after a click
    const clickLockRef = useRef(false);
    const clickLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Listen for open-checkout events from AuthModal
    useEffect(() => {
        const handleOpenCheckout = () => {
            setIsCheckoutOpen(true);
        };
        window.addEventListener('open-checkout', handleOpenCheckout);
        return () => window.removeEventListener('open-checkout', handleOpenCheckout);
    }, []);

    // ── Fetch data ────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchMenu = async () => {
            setLoading(true);
            setError(null);
            try {
                const [catRes, prodRes] = await Promise.all([
                    // Fetch all categories — filter client-side for schema compatibility
                    supabase.from("categories").select("*"),
                    supabase.from("products").select("*").eq("is_active", true),
                ]);

                if (catRes.error) throw catRes.error;
                if (prodRes.error) throw prodRes.error;

                // Client-side active filter (works with both old and new schema)
                const cats: Category[] = (catRes.data || [])
                    .filter((c: Category) => c.is_active !== false)
                    .sort((a: Category, b: Category) => (a.display_order ?? 99) - (b.display_order ?? 99));
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

    // ── Scroll to section ─────────────────────────────────────────────────────
    const scrollToCategory = useCallback((id: string) => {
        // 1. Update active state immediately on click
        setActiveCategoryId(id);
        // 2. Lock the observer so it doesn't override us while smooth-scrolling
        clickLockRef.current = true;
        if (clickLockTimerRef.current) clearTimeout(clickLockTimerRef.current);
        clickLockTimerRef.current = setTimeout(() => {
            clickLockRef.current = false;
        }, 1200);
        // 3. Scroll the section into view
        const el = sectionRefs.current[id];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    // ── Scroll-spy: IntersectionObserver ─────────────────────────────────────
    useEffect(() => {
        if (categories.length === 0) return;
        const container = scrollContainerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (clickLockRef.current) return; // ignore while user just clicked
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // entry.target.id is the category id stored as the data-cat-id attr
                        const catId = (entry.target as HTMLElement).dataset.catId;
                        if (catId) setActiveCategoryId(catId);
                    }
                });
            },
            {
                root: container,
                threshold: 0.25,
                rootMargin: "-60px 0px -50% 0px",
            }
        );

        // Observe all section elements
        Object.values(sectionRefs.current).forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [categories]);

    // ── Filtered products ─────────────────────────────────────────────────────
    const filteredProducts = products.filter((p) => {
        if (vegOnly && p.is_veg === false) return false;
        if (popularOnly && !p.is_popular) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                p.name.toLowerCase().includes(q) ||
                (p.description?.toLowerCase().includes(q) ?? false)
            );
        }
        return true;
    });

    const popularProducts = products.filter((p) => p.is_popular).slice(0, 6);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
            <motion.div
                animate={{ scale: isCheckoutOpen ? 0.97 : 1, transformOrigin: 'top center', borderRadius: isCheckoutOpen ? '16px' : '0px', overflow: isCheckoutOpen ? 'hidden' : 'visible' }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col min-h-0 bg-gray-50"
            >
                {/* ── Top Bar ── */}
                <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex flex-col gap-3">
                    {/* Row 1: Store + Order type */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                            <h1 className="font-bold text-gray-900 text-base leading-tight">Nile Ice Creams</h1>
                            {locationData && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                    <MapPin className="w-3 h-3 text-green-700" />
                                    <span className="truncate">{locationData.displayName}</span>
                                </div>
                            )}
                        </div>

                        {/* Delivery / Pickup toggle */}
                        <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1 flex-shrink-0">
                            <button
                                onClick={() => setOrderType("delivery")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${orderType === "delivery"
                                    ? "bg-white text-green-800 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <Truck className="w-3.5 h-3.5" />
                                Delivery
                            </button>
                            <button
                                onClick={() => setOrderType("pickup")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${orderType === "pickup"
                                    ? "bg-white text-green-800 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <Store className="w-3.5 h-3.5" />
                                Pickup
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Search + Filters */}
                    <MenuSearch
                        query={searchQuery}
                        onQueryChange={setSearchQuery}
                        vegOnly={vegOnly}
                        onVegToggle={() => setVegOnly((v) => !v)}
                        popularOnly={popularOnly}
                        onPopularToggle={() => setPopularOnly((v) => !v)}
                    />

                </div>

                {/* ── Mobile category tabs ── */}
                <MobileCategoryTabs
                    categories={categories}
                    activeCategoryId={activeCategoryId}
                    onSelect={scrollToCategory}
                />

                {/* ── Main 3-column layout ── */}
                <div className="flex flex-1 min-h-0 gap-0 px-4 md:px-6 py-4 max-w-[1600px] mx-auto w-full">
                    {/* Left: Category sidebar */}
                    <div className="lg:pr-5">
                        <MenuSidebar
                            categories={categories}
                            activeCategoryId={activeCategoryId}
                            onSelect={scrollToCategory}
                        />
                    </div>

                    {/* Center: Scrollable menu content */}
                    <div
                        ref={scrollContainerRef}
                        className="flex-1 min-w-0 overflow-y-auto space-y-8 pr-0 xl:pr-5"
                        style={{ maxHeight: "calc(100vh - 180px)" }}
                    >
                        {loading ? (
                            <>
                                {/* Promo skeleton */}
                                <div className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
                                {/* Grid skeleton */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                                    {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
                                </div>
                            </>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <span className="text-5xl mb-3">😞</span>
                                <p className="text-gray-700 font-semibold">{error}</p>
                            </div>
                        ) : (
                            <>
                                {/* Promo Banner */}
                                <PromoBanner />

                                {/* ── Top Items (popular) ── */}
                                {!searchQuery && !popularOnly && popularProducts.length > 0 && (
                                    <section>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-base">🔥</span>
                                            <h2 className="text-base font-bold text-gray-900">Top Items</h2>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                                            {popularProducts.map((p) => (
                                                <MenuItemCard key={`top-${p.id}`} product={p} />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* ── Category Sections ── */}
                                {categories.map((cat) => {
                                    const catProducts = filteredProducts.filter(
                                        (p) => p.category_id === cat.id
                                    );
                                    if (catProducts.length === 0) return null;
                                    return (
                                        <section
                                            key={cat.id}
                                            ref={(el) => { sectionRefs.current[cat.id] = el; }}
                                            data-cat-id={cat.id}
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <h2 className="text-base font-bold text-gray-900">{cat.name}</h2>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    ({catProducts.length})
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                                                {catProducts.map((p) => (
                                                    <MenuItemCard key={p.id} product={p} />
                                                ))}
                                            </div>
                                        </section>
                                    );
                                })}

                                {/* Empty state after filtering */}
                                {filteredProducts.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <span className="text-5xl mb-3">🍦</span>
                                        <p className="font-semibold text-gray-700 mb-1">No items found</p>
                                        <p className="text-sm text-gray-400">Try a different search or remove filters</p>
                                    </div>
                                )}

                                {/* Bottom padding for mobile FAB */}
                                <div className="h-16 xl:h-0" />
                            </>
                        )}
                    </div>

                    {/* Right: Cart panel */}
                    <CartPanel orderType={orderType} onCheckoutClick={() => setIsCheckoutOpen(true)} isCheckoutOpen={isCheckoutOpen} />
                </div>
            </motion.div>

            {/* Checkout Drawer (handles OTP inline for unauthenticated users) */}
            <CheckoutDrawer isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
        </>
    );
};

export default Menu;
