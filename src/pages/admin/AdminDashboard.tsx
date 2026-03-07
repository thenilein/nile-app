import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, ShoppingBag, IceCream } from 'lucide-react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ orders: 0, products: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch basic counts
                const { count: ordersCount } = await supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true });

                const { count: productsCount } = await supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true });

                setStats({
                    orders: ordersCount || 0,
                    products: productsCount || 0,
                });
            } catch (err) {
                console.error("Error fetching admin stats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    if (loading) {
        return <div className="flex-1 flex justify-center items-center h-screen bg-gray-50">Loading dashboard...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-green-900 text-white min-h-screen flex flex-col hidden md:flex">
                <div className="p-6 border-b border-green-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-white text-green-900 rounded-full flex items-center justify-center font-bold text-xl cursor-default">
                        N
                    </div>
                    <span className="font-bold tracking-tight">nile admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-green-800 rounded-lg text-white font-medium transition-colors">
                        <LayoutDashboard className="w-5 h-5 opacity-80" />
                        Dashboard
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-green-800 rounded-lg text-white/80 hover:text-white transition-colors cursor-not-allowed opacity-50">
                        <ShoppingBag className="w-5 h-5 opacity-80" />
                        Orders
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-green-800 rounded-lg text-white/80 hover:text-white transition-colors cursor-not-allowed opacity-50">
                        <IceCream className="w-5 h-5 opacity-80" />
                        Menu Items
                    </a>
                </nav>

                <div className="p-4 border-t border-green-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center w-full gap-2 px-4 py-3 hover:bg-green-800 bg-green-900 rounded-lg text-red-300 hover:text-red-200 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {/* Mobile header */}
                <header className="md:hidden bg-green-900 text-white p-4 flex justify-between items-center shadow-sm">
                    <span className="font-bold tracking-tight">nile admin</span>
                    <button onClick={handleLogout} className="p-2 text-white/80 hover:text-white">
                        <LogOut className="w-5 h-5" />
                    </button>
                </header>

                <div className="p-8">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                        <p className="text-gray-500 mt-1">Welcome back to the Nile Ice Creams admin panel.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* Stats Card: Orders */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
                                <h3 className="text-3xl font-bold text-gray-900">{stats.orders}</h3>
                            </div>
                        </div>

                        {/* Stats Card: Products */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                <IceCream className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Menu Items</p>
                                <h3 className="text-3xl font-bold text-gray-900">{stats.products}</h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">More features coming soon</h3>
                        <p className="text-gray-500">The detailed order management and menu editing features are under development.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
