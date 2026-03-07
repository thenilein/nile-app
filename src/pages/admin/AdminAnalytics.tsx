import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react';

type Range = 'today' | 'week' | 'month';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--admin-shadow-md)', fontSize: 12 }}>
            <p style={{ color: 'var(--admin-text-3)', marginBottom: 4 }}>{label}</p>
            {payload.map((p: any, i: number) => <p key={i} style={{ fontWeight: 600, color: p.color }}>
                {p.name === 'revenue' ? `₹${Number(p.value).toFixed(0)}` : p.value}
            </p>)}
        </div>
    );
};

const AdminAnalytics: React.FC = () => {
    const [range, setRange] = useState<Range>('week');
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState({ revenue: 0, orders: 0, avgOrder: 0, customers: 0 });
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [customerGrowth, setCustomerGrowth] = useState<any[]>([]);
    const [hourlyData, setHourlyData] = useState<any[]>([]);

    useEffect(() => { fetchAnalytics(); }, [range]);

    const fetchAnalytics = async () => {
        setLoading(true);
        const now = new Date();
        let startDate = new Date(now);
        if (range === 'today') startDate.setHours(0, 0, 0, 0);
        else if (range === 'week') startDate.setDate(now.getDate() - 6);
        else startDate.setDate(now.getDate() - 29);

        const { data: orders } = await supabase.from('orders').select('id, total_amount, created_at, profile_id').gte('created_at', startDate.toISOString());

        const totalRevenue = (orders || []).reduce((s, o) => s + Number(o.total_amount), 0);
        const totalOrders = orders?.length || 0;
        const uniqueCustomers = new Set((orders || []).filter(o => o.profile_id).map(o => o.profile_id)).size;
        setKpis({ revenue: totalRevenue, orders: totalOrders, avgOrder: totalOrders ? totalRevenue / totalOrders : 0, customers: uniqueCustomers });

        const days = range === 'today' ? 1 : range === 'week' ? 7 : 30;
        const timeData: any[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dayStr = d.toISOString().split('T')[0];
            const dayOrders = (orders || []).filter(o => o.created_at.startsWith(dayStr));
            timeData.push({
                label: range === 'today' ? `${d.toLocaleDateString('en', { weekday: 'short' })}` : d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
                orders: dayOrders.length,
            });
        }
        setRevenueData(timeData);

        // Top products
        const { data: items } = await supabase.from('order_items').select('product_id, quantity, products(name)').limit(300);
        const pm: Record<string, { name: string; qty: number }> = {};
        (items || []).forEach((item: any) => {
            if (!pm[item.product_id]) pm[item.product_id] = { name: item.products?.name || '?', qty: 0 };
            pm[item.product_id].qty += item.quantity;
        });
        setTopProducts(Object.values(pm).sort((a, b) => b.qty - a.qty).slice(0, 8));

        // Hourly
        const hm: Record<number, number> = {};
        for (let h = 8; h < 23; h++) hm[h] = 0;
        (orders || []).forEach(o => { const h = new Date(o.created_at).getHours(); if (hm[h] !== undefined) hm[h]++; });
        setHourlyData(Object.entries(hm).map(([h, v]) => ({ hour: `${h}h`, value: v })));

        // Customer growth
        const { data: profiles } = await supabase.from('profiles').select('created_at');
        const cg: any[] = [];
        let cum = 0;
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            cum += (profiles || []).filter(p => p.created_at.startsWith(ds)).length;
            cg.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), customers: cum });
        }
        setCustomerGrowth(cg);
        setLoading(false);
    };

    const kpiCards = [
        { label: 'Revenue', value: `₹${kpis.revenue.toFixed(0)}`, icon: DollarSign, color: '#16a34a', bg: 'rgba(22,163,74,0.1)', accent: '#16a34a' },
        { label: 'Orders', value: kpis.orders, icon: ShoppingBag, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', accent: '#6366f1' },
        { label: 'Avg Order', value: `₹${kpis.avgOrder.toFixed(0)}`, icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', accent: '#f59e0b' },
        { label: 'Customers', value: kpis.customers, icon: Users, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', accent: '#06b6d4' },
    ];

    if (loading) return <div className="a-spinner"><div className="a-spinner__dot" /></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="a-page-header">
                <div>
                    <h1 className="a-page-header__title">Analytics</h1>
                    <p className="a-page-header__sub">Sales and performance insights</p>
                </div>
                <div style={{ display: 'flex', gap: 4, background: 'var(--admin-surface-2)', border: '1px solid var(--admin-border)', borderRadius: 10, padding: 4 }}>
                    {(['today', 'week', 'month'] as Range[]).map(r => (
                        <button key={r} onClick={() => setRange(r)}
                            className={`a-tab ${range === r ? 'a-tab--active' : ''}`}>
                            {r === 'today' ? 'Today' : r === 'week' ? '7 Days' : '30 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }}>
                {kpiCards.map(({ label, value, icon: Icon, color, bg, accent }) => (
                    <div key={label} className="a-stat-card" style={{ '--card-accent': accent } as any}>
                        <div className="a-stat-card__header">
                            <div className="a-stat-card__icon" style={{ background: bg }}>
                                <Icon style={{ width: 18, height: 18, color }} />
                            </div>
                        </div>
                        <div>
                            <div className="a-stat-card__label">{label}</div>
                            <div className="a-stat-card__value">{value}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="a-grid-2">
                <div className="a-card">
                    <div className="a-card__header"><span className="a-card__title">Revenue Trend</span></div>
                    <div className="a-card__body">
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={revenueData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                                <defs>
                                    <linearGradient id="aGrad2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="revenue" stroke="#16a34a" fill="url(#aGrad2)" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="a-card">
                    <div className="a-card__header"><span className="a-card__title">Top Products</span></div>
                    <div className="a-card__body">
                        {topProducts.length === 0 ? <div className="a-empty"><div className="a-empty__icon">📊</div><div className="a-empty__title">No data yet</div></div> : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--admin-text-2)' }} width={120} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="qty" fill="#16a34a" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="a-card">
                    <div className="a-card__header"><span className="a-card__title">Customer Growth (7 Days)</span></div>
                    <div className="a-card__body">
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={customerGrowth} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="customers" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="a-card">
                    <div className="a-card__header"><span className="a-card__title">Orders by Hour</span></div>
                    <div className="a-card__body">
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={hourlyData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
