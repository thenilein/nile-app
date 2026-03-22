import React, { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Navbar from "./components/Navbar.tsx";

const Landing = lazy(() => import("./pages/Landing.tsx"));
const Menu = lazy(() => import("./pages/Menu.tsx"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess.tsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminMenu = lazy(() => import("./pages/admin/AdminMenu.tsx"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories.tsx"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders.tsx"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers.tsx"));
const AdminPromotions = lazy(() => import("./pages/admin/AdminPromotions.tsx"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs.tsx"));

// Context
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LocationProvider } from "./context/LocationContext";
import { CartProvider } from "./context/CartContext";
import { AdminProvider } from "./context/AdminContext";
import { isUserAdmin } from "./lib/adminRole";

// ─── Route Guards ──────────────────────────────────────────────────────────────



const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        const check = async () => {
            if (user && await isUserAdmin(user.id)) {
                setIsAdmin(true);
                return;
            }
            setIsAdmin(false);
        };
        if (!isLoading) check();
    }, [user, isLoading]);

    if (isLoading || isAdmin === null) {
        return <div className="flex-1 flex justify-center items-center h-screen text-gray-500 text-sm">Verifying admin access...</div>;
    }
    if (!isAdmin) return <Navigate to="/admin/login" replace />;
    return <>{children}</>;
};

// ─── Routes ────────────────────────────────────────────────────────────────────

const AppRoutes = () => {
    const location = useLocation();
    const showNavbar =
        !location.pathname.startsWith("/admin") && location.pathname !== "/menu" && location.pathname !== "/";

    return (
        <div
            className={`min-h-screen font-sans flex flex-col items-stretch ${
                location.pathname === "/" ? "bg-[#fbfbfd]" : "bg-white"
            }`}
        >
            {showNavbar && <Navbar />}
            <Suspense
                fallback={
                    <div className="flex flex-1 items-center justify-center py-24 text-sm text-gray-500">
                        Loading…
                    </div>
                }
            >
            <Routes>
                {/* Customer routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/cart" element={<Navigate to="/menu" replace />} />
                <Route path="/checkout" element={<Navigate to="/menu" replace />} />
                <Route path="/order-success" element={<OrderSuccess />} />

                {/* Admin auth */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                {/* Admin panel (nested under AdminLayout) */}
                <Route
                    path="/admin/*"
                    element={
                        <AdminRoute>
                            <AdminProvider>
                                <AdminLayout />
                            </AdminProvider>
                        </AdminRoute>
                    }
                >
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="menu" element={<AdminMenu />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="promotions" element={<AdminPromotions />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="logs" element={<AdminLogs />} />
                </Route>
            </Routes>
            </Suspense>
        </div>
    );
};

// ─── App ───────────────────────────────────────────────────────────────────────

const App = () => {
    return (
        <MotionConfig reducedMotion="user" transition={{ duration: 0.15 }}>
            <AuthProvider>
                <CartProvider>
                    <LocationProvider>
                        <Router>
                            <AppRoutes />
                        </Router>
                    </LocationProvider>
                </CartProvider>
            </AuthProvider>
        </MotionConfig>
    );
};

export default App;