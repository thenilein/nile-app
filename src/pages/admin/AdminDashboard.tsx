import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
    ShoppingBag, TrendingUp, Users, IceCream2,
    AlertTriangle, DollarSign, ArrowUpRight, Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StatCard { label: string; value: string | number; icon: React.ElementType; color: string; bg: string; trend?: string }

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayOrders: 0, todayRevenue: 0, totalOrders: 0,
        totalCustomers: 0, popularItem: '—', lowStockCount: 0,
    });
    const [salesData, setSalesData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [hourlyData, setHourlyData] = useState<any[]>([]);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];

            // Today's orders
            const { data: todayOrd } = await supabase
                .from('orders')
                .select('id, total_amount, created_at')
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`);

            // Total counts
            const { count: totalOrders } = await supabase.from('orders').select('id', { count: 'exact', head: true });
            const { count: totalCustomers } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user');

            // Low stock
            const { count: lowStock } = await supabase.from('products')
                .select('id', { count: 'exact', head: true })
                .lt('stock_quantity', 20);

            // Recent orders
            const { data: recent } = await supabase
                .from('orders')
                .select('id, total_amount, status, created_at, profiles(phone, full_name)')
                .order('created_at', { ascending: false })
                .limit(8);

            // Top products via order_items
            const { data: topProd } = await supabase
                .from('order_items')
                .select('product_id, quantity, products(name)')
                .limit(100);

            // Aggregate top products
            const prodMap: Record<string, { name: string; qty: number }> = {};
            (topProd || []).forEach((item: any) => {
                const key = item.product_id;
                if (!prodMap[key]) prodMap[key] = { name: item.products?.name || 'Unknown', qty: 0 };
                prodMap[key].qty += item.quantity;
            });
            const top5 = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

            // Simulate last 7-day sales
            const days7: any[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dateStr = d.toISOString().split('T')[0];
                days7.push({
                    day: d.toLocaleDateString('en', { weekday: 'short' }),
                    revenue: Math.floor(Math.random() * 5000 + 800),
                    orders: Math.floor(Math.random() * 30 + 5),
                    date: dateStr,
                });
            }

            // Hourly distribution (simulated)
            const hours = Array.from({ length: 14 }, (_, i) => ({
                hour: `${i + 9}:00`,
                orders: Math.floor(Math.random() * 20),
            }));

            setStats({
                todayOrders: todayOrd?.length || 0,
                todayRevenue: (todayOrd || []).reduce((s: number, o: any) => s + Number(o.total_amount), 0),
                totalOrders: totalOrders || 0,
                totalCustomers: totalCustomers || 0,
                popularItem: top5[0]?.name || '—',
                lowStockCount: lowStock || 0,
            });
            setSalesData(days7);
            setTopProducts(top5);
            setRecentOrders(recent || []);
            setHourlyData(hours);
        } finally {
            setLoading(false);
        }
    };

    const statCards: StatCard[] = [
        { label: "Today's Orders", value: stats.todayOrders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: "Today's Revenue", value: `₹${stats.todayRevenue.toFixed(0)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', trend: '+12%' },
        { label: 'Total Orders', value: stats.totalOrders, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Total Customers', value: stats.totalCustomers, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Popular Item', value: stats.popularItem, icon: IceCream2, color: 'text-pink-600', bg: 'bg-pink-50' },
        { label: 'Low Stock Items', value: stats.lowStockCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    const statusColor: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-700',
        accepted: 'bg-blue-100 text-blue-700',
        preparing: 'bg-purple-100 text-purple-700',
        ready: 'bg-indigo-100 text-indigo-700',
        delivered: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700',
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Welcome back — here's what's happening today</p>
                </div>
                <button onClick={fetchAll} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Refresh
                </button>
            </div>

            {/* Stat Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {statCards.map(({ label, value, icon: Icon, color, bg, trend }) => (
                    <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
                        <div className={`${bg} ${color} p-3 rounded-xl flex-shrink-0`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
                            <p className="text-xl font-bold mt-1 truncate">{value}</p>
                            {trend && (
                                <div className="flex items-center gap-1 mt-1">
                                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                                    <span className="text-xs text-green-500 font-medium">{trend} vs yesterday</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Area Chart */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className="font-semibold text-sm mb-4">Revenue (Last 7 Days)</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={salesData}>
                            <defs>
                                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: any) => [`₹${v}`, 'Revenue']} />
                            <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#revenueGrad)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Orders by Hour */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className="font-semibold text-sm mb-4">Orders by Hour</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={hourlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top products + Recent orders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className="font-semibold text-sm mb-4">Top Selling Products</h2>
                    {topProducts.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No sales data yet</p>
                    ) : (
                        <div className="space-y-3">
                            {topProducts.map((p, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium">{p.name}</div>
                                        <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (p.qty / (topProducts[0]?.qty || 1)) * 100)}%` }} />
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold text-gray-600 flex-shrink-0">{p.qty} sold</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-sm">Recent Orders</h2>
                        <button onClick={() => navigate('/admin/orders')} className="text-xs text-green-600 hover:underline">View all →</button>
                    </div>
                    {recentOrders.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>
                    ) : (
                        <div className="space-y-2">
                            {recentOrders.map((o: any) => (
                                <div key={o.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate">{o.profiles?.phone || o.profiles?.full_name || 'Guest'}</div>
                                        <div className="text-xs text-gray-400">{new Date(o.created_at).toLocaleTimeString()}</div>
                                    </div>
                                    <span className="text-xs font-semibold">₹{Number(o.total_amount).toFixed(0)}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor[o.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {o.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
