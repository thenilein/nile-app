import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LocationProvider } from "./context/LocationContext";
import { CartProvider } from "./context/CartContext";
import { supabase } from "./lib/supabase";

// Component to protect menu route (must be logged in or guest)
const MenuRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isGuest, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex-1 flex justify-center items-center h-screen">Loading...</div>;
    }

    if (!user && !isGuest) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// Component to protect admin routes
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAdminStatus = async () => {
            if (user) {
                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();

                    if (!error && data?.role === 'admin') {
                        setIsAdmin(true);
                        return;
                    }
                } catch (e) {
                    // Ignore errors, assume false
                }
            }
            setIsAdmin(false);
        };

        if (!isLoading) {
            checkAdminStatus();
        }
    }, [user, isLoading]);

    if (isLoading || isAdmin === null) {
        return <div className="flex-1 flex justify-center items-center h-screen">Loading admin verification...</div>;
    }

    if (!isAdmin) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
};

const AppRoutes = () => {
    const location = useLocation();

    // Hide navbar on admin routes
    const showNavbar = !location.pathname.startsWith('/admin');

    return (
        <div className="min-h-screen bg-white font-sans flex flex-col items-stretch">
            {showNavbar && <Navbar />}
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route
                    path="/menu"
                    element={
                        <MenuRoute>
                            <Menu />
                        </MenuRoute>
                    }
                />
                <Route
                    path="/cart"
                    element={
                        <MenuRoute>
                            <Cart />
                        </MenuRoute>
                    }
                />
                <Route
                    path="/checkout"
                    element={
                        <MenuRoute>
                            <Checkout />
                        </MenuRoute>
                    }
                />
                <Route
                    path="/order-success"
                    element={
                        <MenuRoute>
                            <OrderSuccess />
                        </MenuRoute>
                    }
                />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                    path="/admin"
                    element={<Navigate to="/admin/dashboard" replace />}
                />
                <Route
                    path="/admin/dashboard"
                    element={
                        <AdminRoute>
                            <AdminDashboard />
                        </AdminRoute>
                    }
                />
            </Routes>
        </div>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <CartProvider>
                <LocationProvider>
                    <Router>
                        <AppRoutes />
                    </Router>
                </LocationProvider>
            </CartProvider>
        </AuthProvider>
    );
};

export default App;