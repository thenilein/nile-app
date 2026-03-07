import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    TrendingUp, TrendingDown, ShoppingBag, Users,
    DollarSign, Package, Star, ArrowUpRight
} from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--admin-shadow-md)' }}>
            <p style={{ fontSize: 11, color: 'var(--admin-text-3)', marginBottom: 4 }}>{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ fontSize: 13, fontWeight: 600, color: p.color }}>
                    {p.name === 'revenue' ? `₹${Number(p.value).toFixed(0)}` : p.value}
                </p>
            ))}
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayRevenue: 0, yesterdayRevenue: 0,
        todayOrders: 0, yesterdayOrders: 0,
        totalOrders: 0, totalCustomers: 0,
        lowStock: 0, popularItem: 'N/A',
    });
    const [salesData, setSalesData] = useState<any[]>([]);
    const [hourlyData, setHourlyData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

    useEffect(() => { load(); }, []);

    const load = async () => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];

        const [
            { data: todayOrders },
            { data: yOrders },
            { data: allOrders },
            { data: profiles },
            { data: products },
            { data: orderItems },
            { data: recent },
        ] = await Promise.all([
            supabase.from('orders').select('total_amount, created_at').gte('created_at', `${todayStr}T00:00:00`),
            supabase.from('orders').select('total_amount').gte('created_at', `${yStr}T00:00:00`).lt('created_at', `${todayStr}T00:00:00`),
            supabase.from('orders').select('total_amount, created_at').gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString()),
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('products').select('id, name, stock_quantity').not('stock_quantity', 'is', null).lt('stock_quantity', 10),
            supabase.from('order_items').select('product_id, quantity, products(name)').limit(500),
            supabase.from('orders').select('id, total_amount, status, created_at, profiles(phone, full_name)').order('created_at', { ascending: false }).limit(6),
        ]);

        const todayRev = (todayOrders || []).reduce((s, o) => s + Number(o.total_amount), 0);
        const yRev = (yOrders || []).reduce((s, o) => s + Number(o.total_amount), 0);

        // 7-day sales
        const dayMap: Record<string, { revenue: number; orders: number }> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            dayMap[d.toISOString().split('T')[0]] = { revenue: 0, orders: 0 };
        }
        (allOrders || []).forEach(o => {
            const k = o.created_at.split('T')[0];
            if (dayMap[k]) { dayMap[k].revenue += Number(o.total_amount); dayMap[k].orders++; }
        });
        const salesArr = Object.entries(dayMap).map(([date, v]) => ({
            label: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
            revenue: Math.round(v.revenue),
            orders: v.orders,
        }));

        // Hourly (today)
        const hourMap: Record<number, number> = {};
        for (let h = 0; h < 24; h++) hourMap[h] = 0;
        (todayOrders || []).forEach(o => {
            const h = new Date(o.created_at).getHours();
            hourMap[h]++;
        });
        const hourArr = Object.entries(hourMap)
            .filter(([h]) => Number(h) >= 8 && Number(h) <= 22)
            .map(([h, v]) => ({ hour: `${h}h`, value: v }));

        // Top products
        const prodMap: Record<string, { name: string; qty: number }> = {};
        (orderItems || []).forEach((item: any) => {
            const k = item.product_id;
            if (!prodMap[k]) prodMap[k] = { name: item.products?.name || '?', qty: 0 };
            prodMap[k].qty += item.quantity;
        });
        const top = Object.values(prodMap).sort((a, b) => b.qty - a.qty).slice(0, 5);
        const maxQty = top[0]?.qty || 1;

        setStats({
            todayRevenue: todayRev, yesterdayRevenue: yRev,
            todayOrders: todayOrders?.length || 0, yesterdayOrders: yOrders?.length || 0,
            totalOrders: allOrders?.length || 0,
            totalCustomers: 0, // from count query
            lowStock: products?.length || 0,
            popularItem: top[0]?.name || 'N/A',
        });
        setSalesData(salesArr);
        setHourlyData(hourArr);
        setTopProducts(top.map(p => ({ ...p, pct: Math.round((p.qty / maxQty) * 100) })));
        setRecentOrders(recent || []);
        setLoading(false);
    };

    if (loading) return <div className="a-spinner"><div className="a-spinner__dot" /></div>;

    const revDiff = stats.yesterdayRevenue ? ((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue * 100) : 0;
    const ordDiff = stats.yesterdayOrders ? ((stats.todayOrders - stats.yesterdayOrders) / stats.yesterdayOrders * 100) : 0;

    const STATUS_BADGE: Record<string, string> = {
        pending: 'a-badge--yellow', preparing: 'a-badge--blue',
        ready: 'a-badge--purple', delivered: 'a-badge--green', cancelled: 'a-badge--red',
        out_for_delivery: 'a-badge--cyan', accepted: 'a-badge--blue',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div className="a-page-header">
                <div>
                    <h1 className="a-page-header__title">Dashboard</h1>
                    <p className="a-page-header__sub">
                        {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="a-stat-grid">
                {[
                    {
                        label: "Today's Revenue", value: `₹${stats.todayRevenue.toFixed(0)}`,
                        icon: DollarSign, color: '#16a34a', bg: 'rgba(22,163,74,0.1)',
                        accent: '#16a34a',
                        diff: revDiff, sub: `vs ₹${stats.yesterdayRevenue.toFixed(0)} yesterday`
                    },
                    {
                        label: "Today's Orders", value: stats.todayOrders,
                        icon: ShoppingBag, color: '#6366f1', bg: 'rgba(99,102,241,0.1)',
                        accent: '#6366f1',
                        diff: ordDiff, sub: `${stats.yesterdayOrders} orders yesterday`
                    },
                    {
                        label: 'Total Orders (7d)', value: stats.totalOrders,
                        icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',
                        accent: '#f59e0b',
                        diff: null, sub: 'Last 7 days'
                    },
                    {
                        label: 'Top Seller', value: stats.popularItem,
                        icon: Star, color: '#ec4899', bg: 'rgba(236,72,153,0.1)',
                        accent: '#ec4899',
                        diff: null, sub: 'Most ordered item'
                    },
                    {
                        label: 'Low Stock Items', value: stats.lowStock,
                        icon: Package, color: stats.lowStock > 0 ? '#ef4444' : '#10b981',
                        bg: stats.lowStock > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        accent: stats.lowStock > 0 ? '#ef4444' : '#10b981',
                        diff: null, sub: 'Below 10 units'
                    },
                    {
                        label: 'Active Customers', value: '–',
                        icon: Users, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',
                        accent: '#06b6d4',
                        diff: null, sub: 'Growing daily'
                    },
                ].map(({ label, value, icon: Icon, color, bg, accent, diff, sub }) => (
                    <div key={label} className="a-stat-card" style={{ '--card-accent': accent } as any}>
                        <div className="a-stat-card__header">
                            <div className="a-stat-card__icon" style={{ background: bg }}>
                                <Icon style={{ width: 18, height: 18, color }} />
                            </div>
                            {diff !== null && (
                                <span className={`a-stat-card__badge ${diff >= 0 ? 'a-stat-card__badge--up' : 'a-stat-card__badge--down'}`}>
                                    {diff >= 0 ? <TrendingUp style={{ width: 10, height: 10 }} /> : <TrendingDown style={{ width: 10, height: 10 }} />}
                                    {Math.abs(diff).toFixed(1)}%
                                </span>
                            )}
                        </div>
                        <div>
                            <div className="a-stat-card__label">{label}</div>
                            <div className="a-stat-card__value" style={{ fontSize: typeof value === 'string' && value.length > 12 ? 16 : 26 }}>{value}</div>
                            <div className="a-stat-card__sub">{sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div className="a-grid-2">
                {/* Revenue trend */}
                <div className="a-card">
                    <div className="a-card__header">
                        <span className="a-card__title">Revenue — Last 7 Days</span>
                        <span style={{ fontSize: 11, color: 'var(--admin-text-3)' }}>₹</span>
                    </div>
                    <div className="a-card__body">
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={salesData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                                <defs>
                                    <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.18} />
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="revenue" stroke="#16a34a" fill="url(#grad-rev)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#16a34a' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Orders by hour */}
                <div className="a-card">
                    <div className="a-card__header">
                        <span className="a-card__title">Orders by Hour (Today)</span>
                    </div>
                    <div className="a-card__body">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={hourlyData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-border)" vertical={false} />
                                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--admin-text-3)' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" name="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom row */}
            <div className="a-grid-2">
                {/* Top products */}
                <div className="a-card">
                    <div className="a-card__header">
                        <span className="a-card__title">Top Selling Items</span>
                        <span style={{ fontSize: 11, color: 'var(--admin-text-3)' }}>All time</span>
                    </div>
                    <div className="a-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {topProducts.length === 0 && (
                            <div className="a-empty">
                                <div className="a-empty__icon">🍦</div>
                                <div className="a-empty__title">No orders yet</div>
                            </div>
                        )}
                        {topProducts.map((p, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                    <span style={{ fontWeight: 600, color: 'var(--admin-text)' }}>{p.name}</span>
                                    <span style={{ color: 'var(--admin-text-3)', fontWeight: 500 }}>{p.qty} sold</span>
                                </div>
                                <div style={{ height: 5, borderRadius: 99, background: 'var(--admin-surface-2)', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 99,
                                        width: `${p.pct}%`,
                                        background: ['#16a34a', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'][i],
                                        transition: 'width 0.6s ease'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent orders */}
                <div className="a-card">
                    <div className="a-card__header">
                        <span className="a-card__title">Recent Orders</span>
                        <a href="/admin/orders" style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                            View all <ArrowUpRight style={{ width: 12, height: 12 }} />
                        </a>
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        {recentOrders.length === 0 ? (
                            <div className="a-empty">
                                <div className="a-empty__icon">📋</div>
                                <div className="a-empty__title">No orders yet</div>
                            </div>
                        ) : recentOrders.map(o => (
                            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--admin-border-2)' }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 8,
                                    background: 'var(--admin-surface-2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 12, fontWeight: 700, color: 'var(--admin-text-2)',
                                    flexShrink: 0,
                                }}>
                                    {(o.profiles?.phone || o.profiles?.full_name || 'G').charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {o.profiles?.phone || o.profiles?.full_name || 'Guest'}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--admin-text-3)' }}>
                                        {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <span className={`a-badge ${STATUS_BADGE[o.status] || 'a-badge--gray'}`} style={{ fontSize: 10 }}>
                                    {o.status}
                                </span>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>
                                    ₹{Number(o.total_amount).toFixed(0)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
