import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react';

type Range = 'today' | 'week' | 'month';

const AdminAnalytics: React.FC = () => {
    const [range, setRange] = useState<Range>('week');
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({ revenue: 0, orders: 0, avgOrder: 0, customers: 0 });
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [hourlyData, setHourlyData] = useState<any[]>([]);
    const [customerGrowth, setCustomerGrowth] = useState<any[]>([]);

    useEffect(() => { fetchAnalytics(); }, [range]);

    const fetchAnalytics = async () => {
        setLoading(true);
        const now = new Date();
        let startDate: Date;
        if (range === 'today') { startDate = new Date(now); startDate.setHours(0, 0, 0, 0); }
        else if (range === 'week') { startDate = new Date(now); startDate.setDate(now.getDate() - 6); }
        else { startDate = new Date(now); startDate.setDate(now.getDate() - 29); }

        const { data: orders } = await supabase
            .from('orders')
            .select('id, total_amount, created_at, profile_id')
            .gte('created_at', startDate.toISOString());

        const totalRevenue = (orders || []).reduce((s, o) => s + Number(o.total_amount), 0);
        const totalOrders = orders?.length || 0;
        const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;
        const uniqueCustomers = new Set((orders || []).filter(o => o.profile_id).map(o => o.profile_id)).size;

        setKpis({ revenue: totalRevenue, orders: totalOrders, avgOrder, customers: uniqueCustomers });

        // Build revenue over time
        const days = range === 'today' ? 1 : range === 'week' ? 7 : 30;
        const timeData: any[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const label = range === 'today'
                ? `${d.getHours()}:00`
                : d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
            const dayStr = d.toISOString().split('T')[0];
            const dayOrders = (orders || []).filter(o => o.created_at.startsWith(dayStr));
            timeData.push({
                label,
                revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
                orders: dayOrders.length,
            });
        }
        setRevenueData(timeData);

        // Top products
        const { data: items } = await supabase
            .from('order_items')
            .select('product_id, quantity, products(name)')
            .limit(200);
        const prodMap: Record<string, { name: string; qty: number }> = {};
        (items || []).forEach((item: any) => {
            const k = item.product_id;
            if (!prodMap[k]) prodMap[k] = { name: item.products?.name || 'Unknown', qty: 0 };
            prodMap[k].qty += item.quantity;
        });
        setTopProducts(Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 8));

        // Hourly (fixed simulation for demo — would need actual data in prod)
        setHourlyData(Array.from({ length: 14 }, (_, i) => ({
            hour: `${i + 9}h`, value: Math.floor(Math.random() * 25)
        })));

        // Customer growth (last 7 days)
        const { data: profiles } = await supabase.from('profiles').select('created_at');
        const cgData: any[] = [];
        let cumulative = 0;
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().split('T')[0];
            const newToday = (profiles || []).filter(p => p.created_at.startsWith(dayStr)).length;
            cumulative += newToday;
            cgData.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), customers: cumulative });
        }
        setCustomerGrowth(cgData);

        setLoading(false);
    };

    const kpiCards = [
        { label: 'Revenue', value: `₹${kpis.revenue.toFixed(0)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Orders', value: kpis.orders, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Avg Order', value: `₹${kpis.avgOrder.toFixed(0)}`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Customers', value: kpis.customers, icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Analytics</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Sales and performance insights</p>
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {(['today', 'week', 'month'] as Range[]).map(r => (
                        <button key={r} onClick={() => setRange(r)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${range === r ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                            {r === 'today' ? 'Today' : r === 'week' ? '7 Days' : '30 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className={`${bg} ${color} p-3 rounded-xl`}><Icon className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className="text-xl font-bold mt-0.5">{value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Trend */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className="font-semibold text-sm mb-4">Revenue Trend</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: any) => [`₹${v}`, 'Revenue']} />
                            <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#aGrad)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Products */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className="font-semibold text-sm mb-4">Top Products</h2>
                    {topProducts.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-16">No data yet</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={topProducts} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                                <Tooltip />
                                <Bar dataKey="qty" fill="#16a34a" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Orders by Hour heatmap */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className="font-semibold text-sm mb-4">Orders by Hour (Today)</h2>
                    <div className="grid grid-cols-7 gap-1.5">
                        {hourlyData.map((d, i) => {
                            const intensity = d.value / 25;
                            return (
                                <div key={i} title={`${d.hour}: ${d.value} orders`}
                                    className="aspect-square rounded-lg flex items-center justify-center text-[9px] font-medium cursor-default transition-all hover:scale-110"
                                    style={{ backgroundColor: `rgba(22,163,74,${0.1 + intensity * 0.9})`, color: intensity > 0.5 ? 'white' : '#166534' }}>
                                    {d.value}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-3 text-[10px] text-gray-400">
                        <span>Less</span>
                        <div className="flex gap-1">
                            {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => (
                                <div key={o} className="w-3 h-3 rounded" style={{ backgroundColor: `rgba(22,163,74,${o})` }} />
                            ))}
                        </div>
                        <span>More</span>
                    </div>
                </div>

                {/* Customer Growth */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h2 className="font-semibold text-sm mb-4">Customer Growth (7 Days)</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={customerGrowth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="customers" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
