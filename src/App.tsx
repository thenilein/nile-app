import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import Navbar from "./components/Navbar.tsx";
import Landing from "./pages/Landing.tsx";
import Menu from "./pages/Menu.tsx";
import OrderSuccess from "./pages/OrderSuccess.tsx";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminMenu from "./pages/admin/AdminMenu.tsx";
import AdminCategories from "./pages/admin/AdminCategories.tsx";
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminPromotions from "./pages/admin/AdminPromotions.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminLogs from "./pages/admin/AdminLogs.tsx";

// Context
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LocationProvider } from "./context/LocationContext";
import { CartProvider } from "./context/CartContext";
import { AdminProvider } from "./context/AdminContext";
import { supabase } from "./lib/supabase";

// ─── Route Guards ──────────────────────────────────────────────────────────────



const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        const check = async () => {
            if (user) {
                try {
                    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                    if (data?.role === 'admin') { setIsAdmin(true); return; }
                } catch (_) { /* fall through */ }
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
    const showNavbar = !location.pathname.startsWith('/admin') && location.pathname !== "/menu";

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col items-stretch">
            {showNavbar && <Navbar />}
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