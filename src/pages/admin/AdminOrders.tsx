import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Search, Download, Eye, X, ChevronDown } from 'lucide-react';

const STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
const STATUS_BADGE: Record<string, string> = {
    pending: 'a-badge--yellow', accepted: 'a-badge--blue',
    preparing: 'a-badge--blue', ready: 'a-badge--purple',
    out_for_delivery: 'a-badge--cyan', delivered: 'a-badge--green',
    cancelled: 'a-badge--red',
};

interface Order {
    id: string; total_amount: number; status: string; payment_status: string;
    payment_method: string; order_type: string; created_at: string; notes: string | null;
    profiles: { phone: string | null; full_name: string | null } | null;
}
interface OrderItem {
    id: string; quantity: number; price_at_purchase: number;
    products: { name: string } | null;
}

const AdminOrders: React.FC = () => {
    const { logAction } = useAdmin();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [page, setPage] = useState(0);
    const PAGE = 15;

    useEffect(() => { fetchOrders(); }, [statusFilter, page]);

    const fetchOrders = async () => {
        setLoading(true);
        let q = supabase.from('orders').select('*, profiles(phone, full_name)').order('created_at', { ascending: false }).range(page * PAGE, (page + 1) * PAGE - 1);
        if (statusFilter) q = q.eq('status', statusFilter);
        const { data } = await q;
        setOrders(data || []);
        setLoading(false);
    };

    const openOrder = async (o: Order) => {
        setSelectedOrder(o); setLoadingItems(true);
        const { data } = await supabase.from('order_items').select('*, products(name)').eq('order_id', o.id);
        setOrderItems(data || []); setLoadingItems(false);
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        const old = orders.find(o => o.id === orderId);
        await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        await logAction('status_change', 'orders', orderId, `Status: "${old?.status}" → "${newStatus}"`);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : prev);
    };

    const exportCSV = () => {
        const rows = [['ID', 'Customer', 'Total', 'Status', 'Type', 'Date'], ...orders.map(o => [o.id.slice(0, 8), o.profiles?.phone || 'Guest', o.total_amount, o.status, o.order_type, new Date(o.created_at).toLocaleString()])];
        const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'orders.csv'; a.click();
    };

    const filtered = orders.filter(o => {
        const q = search.toLowerCase();
        return o.id.toLowerCase().includes(q) || (o.profiles?.phone || '').includes(q) || (o.profiles?.full_name || '').toLowerCase().includes(q);
    });

    return (
        <div>
            <div className="a-page-header">
                <div>
                    <h1 className="a-page-header__title">Orders</h1>
                    <p className="a-page-header__sub">Manage and update order statuses</p>
                </div>
                <button onClick={exportCSV} className="a-btn a-btn--ghost">
                    <Download style={{ width: 14, height: 14 }} /> Export CSV
                </button>
            </div>

            {/* Status tabs */}
            <div className="a-tabs">
                {['', ...STATUSES].map(s => (
                    <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
                        className={`a-tab ${statusFilter === s ? 'a-tab--active' : ''}`}>
                        {s ? s.replace('_', ' ') : 'All'}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="a-filter-bar">
                <div className="a-filter-bar__search">
                    <Search className="a-filter-bar__search-icon" />
                    <input className="a-filter-bar__search-input" placeholder="Search by order ID or customer…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="a-table-wrap">
                <div style={{ overflowX: 'auto' }}>
                    <table className="a-table">
                        <thead>
                            <tr>
                                <th>Order</th><th>Customer</th><th>Total</th>
                                <th>Status</th><th>Payment</th><th>Type</th><th>Time</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8}><div className="a-spinner"><div className="a-spinner__dot" /></div></td></tr>
                            ) : filtered.map(o => (
                                <tr key={o.id}>
                                    <td><code style={{ fontSize: 11, color: 'var(--admin-text-3)' }}>#{o.id.slice(0, 8)}</code></td>
                                    <td style={{ fontWeight: 600, fontSize: 13 }}>{o.profiles?.phone || o.profiles?.full_name || 'Guest'}</td>
                                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{Number(o.total_amount).toFixed(0)}</td>
                                    <td>
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                                                className={`a-badge ${STATUS_BADGE[o.status] || 'a-badge--gray'}`}
                                                style={{ appearance: 'none', paddingRight: 20, border: 'none', cursor: 'pointer', background: 'transparent', fontFamily: 'inherit', fontWeight: 600 }}>
                                                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                                            </select>
                                            <ChevronDown style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, pointerEvents: 'none', opacity: 0.5 }} />
                                        </div>
                                    </td>
                                    <td><span className={`a-badge ${o.payment_status === 'paid' ? 'a-badge--green' : 'a-badge--yellow'}`}>{o.payment_status}</span></td>
                                    <td style={{ fontSize: 12, color: 'var(--admin-text-2)', textTransform: 'capitalize' }}>{o.order_type}</td>
                                    <td style={{ fontSize: 11, color: 'var(--admin-text-3)', whiteSpace: 'nowrap' }}>
                                        {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td>
                                        <button onClick={() => openOrder(o)} className="a-btn a-btn--ghost a-btn--sm a-btn--icon"><Eye style={{ width: 13, height: 13 }} /></button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={8}>
                                    <div className="a-empty">
                                        <div className="a-empty__icon">🛍</div>
                                        <div className="a-empty__title">No orders found</div>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="a-pagination">
                    <span className="a-pagination__info">Page {page + 1}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="a-btn a-btn--ghost a-btn--sm">← Prev</button>
                        <button disabled={orders.length < PAGE} onClick={() => setPage(p => p + 1)} className="a-btn a-btn--ghost a-btn--sm">Next →</button>
                    </div>
                </div>
            </div>

            {/* Order detail panel */}
            {selectedOrder && (
                <div className="a-modal-overlay" style={{ alignItems: 'flex-end' }}>
                    <div className="a-modal a-modal--lg" style={{ maxHeight: '90vh', marginBottom: 0, borderRadius: '16px 16px 0 0' }}>
                        <div className="a-modal__header">
                            <div>
                                <h2 className="a-modal__title">Order #{selectedOrder.id.slice(0, 8)}</h2>
                                <span className={`a-badge ${STATUS_BADGE[selectedOrder.status] || 'a-badge--gray'}`} style={{ marginTop: 4, display: 'inline-flex' }}>{selectedOrder.status}</span>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="a-btn a-btn--ghost a-btn--sm a-btn--icon"><X style={{ width: 14, height: 14 }} /></button>
                        </div>
                        <div className="a-modal__body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                {[
                                    ['Customer', selectedOrder.profiles?.phone || selectedOrder.profiles?.full_name || 'Guest'],
                                    ['Total', `₹${Number(selectedOrder.total_amount).toFixed(2)}`],
                                    ['Payment', `${selectedOrder.payment_method} · ${selectedOrder.payment_status}`],
                                    ['Type', selectedOrder.order_type],
                                    ['Date', new Date(selectedOrder.created_at).toLocaleString()],
                                    selectedOrder.notes ? ['Notes', selectedOrder.notes] : null,
                                ].filter(Boolean).map(([k, v]: any) => (
                                    <div key={k} style={{ padding: '12px 14px', background: 'var(--admin-surface-2)', borderRadius: 10, border: '1px solid var(--admin-border)' }}>
                                        <div style={{ fontSize: 11, color: 'var(--admin-text-3)', marginBottom: 4 }}>{k}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="a-divider" />
                            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Items</h3>
                            {loadingItems ? <div className="a-spinner"><div className="a-spinner__dot" /></div> : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {orderItems.map(item => (
                                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--admin-surface-2)', borderRadius: 9 }}>
                                            <div style={{ width: 26, height: 26, background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{item.quantity}</div>
                                            <span style={{ flex: 1, fontSize: 13 }}>{item.products?.name || 'Unknown'}</span>
                                            <span style={{ fontWeight: 700, fontSize: 13 }}>₹{(item.price_at_purchase * item.quantity).toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="a-divider" />
                            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Update Status</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {STATUSES.map(s => (
                                    <button key={s} onClick={() => updateStatus(selectedOrder.id, s)}
                                        className={`a-btn a-btn--sm ${selectedOrder.status === s ? 'a-btn--primary' : 'a-btn--ghost'}`}
                                        style={{ textTransform: 'capitalize', fontSize: 12 }}>
                                        {s.replace(/_/g, ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
