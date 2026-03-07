import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Search, Eye, Ban, CheckCircle, X } from 'lucide-react';

interface Customer {
    id: string; phone: string | null; full_name: string | null;
    is_blocked: boolean; created_at: string; role: string;
    order_count?: number; total_spent?: number; last_order?: string;
}
interface Order { id: string; total_amount: number; status: string; created_at: string; }

const STATUS_BADGE: Record<string, string> = {
    pending: 'a-badge--yellow', delivered: 'a-badge--green', cancelled: 'a-badge--red', preparing: 'a-badge--blue',
};

const AdminUsers: React.FC = () => {
    const { logAction } = useAdmin();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Customer | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    useEffect(() => { fetchCustomers(); }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false });
        if (!profiles) { setLoading(false); return; }
        const enriched = await Promise.all(profiles.map(async p => {
            const { data: ords } = await supabase.from('orders').select('total_amount, created_at').eq('profile_id', p.id);
            const totalSpent = (ords || []).reduce((s, o) => s + Number(o.total_amount), 0);
            const lastOrder = ords?.length ? ords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : null;
            return { ...p, order_count: ords?.length || 0, total_spent: totalSpent, last_order: lastOrder };
        }));
        setCustomers(enriched);
        setLoading(false);
    };

    const openCustomer = async (c: Customer) => {
        setSelected(c); setLoadingOrders(true);
        const { data } = await supabase.from('orders').select('id, total_amount, status, created_at').eq('profile_id', c.id).order('created_at', { ascending: false });
        setOrders(data || []); setLoadingOrders(false);
    };

    const toggleBlock = async (c: Customer) => {
        const nb = !c.is_blocked;
        await supabase.from('profiles').update({ is_blocked: nb }).eq('id', c.id);
        await logAction(nb ? 'block' : 'unblock', 'profiles', c.id, `${nb ? 'Blocked' : 'Unblocked'} ${c.phone || c.full_name}`);
        setCustomers(prev => prev.map(p => p.id === c.id ? { ...p, is_blocked: nb } : p));
        if (selected?.id === c.id) setSelected(prev => prev ? { ...prev, is_blocked: nb } : prev);
    };

    const filtered = customers.filter(c => {
        const q = search.toLowerCase();
        return (c.phone || '').includes(q) || (c.full_name || '').toLowerCase().includes(q);
    });

    return (
        <div>
            <div className="a-page-header">
                <div>
                    <h1 className="a-page-header__title">Customers</h1>
                    <p className="a-page-header__sub">{customers.length} registered customers</p>
                </div>
            </div>

            <div className="a-filter-bar">
                <div className="a-filter-bar__search">
                    <Search className="a-filter-bar__search-icon" />
                    <input className="a-filter-bar__search-input" placeholder="Search by phone or name…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="a-table-wrap">
                <div style={{ overflowX: 'auto' }}>
                    <table className="a-table">
                        <thead>
                            <tr><th>Customer</th><th>Orders</th><th>Total Spent</th><th>Last Order</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6}><div className="a-spinner"><div className="a-spinner__dot" /></div></td></tr>
                            ) : filtered.map(c => (
                                <tr key={c.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                                {(c.full_name || c.phone || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.full_name || '—'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--admin-text-3)' }}>{c.phone || 'No phone'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{c.order_count}</td>
                                    <td style={{ fontWeight: 700, color: '#16a34a' }}>₹{(c.total_spent || 0).toFixed(0)}</td>
                                    <td style={{ fontSize: 12, color: 'var(--admin-text-3)' }}>{c.last_order ? new Date(c.last_order).toLocaleDateString() : '—'}</td>
                                    <td><span className={`a-badge ${c.is_blocked ? 'a-badge--red' : 'a-badge--green'}`}>{c.is_blocked ? 'Blocked' : 'Active'}</span></td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                            <button onClick={() => openCustomer(c)} className="a-btn a-btn--ghost a-btn--sm a-btn--icon"><Eye style={{ width: 13, height: 13 }} /></button>
                                            <button onClick={() => toggleBlock(c)} className={`a-btn a-btn--sm a-btn--icon ${c.is_blocked ? 'a-btn--ghost' : 'a-btn--danger'}`}>
                                                {c.is_blocked ? <CheckCircle style={{ width: 13, height: 13, color: '#10b981' }} /> : <Ban style={{ width: 13, height: 13 }} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={6}>
                                    <div className="a-empty"><div className="a-empty__icon">👥</div><div className="a-empty__title">No customers found</div></div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Customer detail panel */}
            {selected && (
                <div className="a-modal-overlay" style={{ alignItems: 'flex-end' }}>
                    <div className="a-modal a-modal--lg" style={{ borderRadius: '16px 16px 0 0', maxHeight: '85vh' }}>
                        <div className="a-modal__header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                    {(selected.full_name || selected.phone || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="a-modal__title">{selected.full_name || selected.phone || 'Customer'}</div>
                                    <div style={{ fontSize: 12, color: 'var(--admin-text-3)' }}>{orders.length} orders · ₹{(selected.total_spent || 0).toFixed(0)} total</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => toggleBlock(selected)} className={`a-btn a-btn--sm ${selected.is_blocked ? 'a-btn--ghost' : 'a-btn--danger'}`}>
                                    {selected.is_blocked ? 'Unblock' : 'Block'}
                                </button>
                                <button onClick={() => setSelected(null)} className="a-btn a-btn--ghost a-btn--sm a-btn--icon"><X style={{ width: 14, height: 14 }} /></button>
                            </div>
                        </div>
                        <div className="a-modal__body">
                            <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Order History</h3>
                            {loadingOrders ? <div className="a-spinner"><div className="a-spinner__dot" /></div> : orders.length === 0 ? (
                                <div className="a-empty"><div className="a-empty__icon">📋</div><div className="a-empty__title">No orders</div></div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {orders.map(o => (
                                        <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--admin-surface-2)', borderRadius: 9 }}>
                                            <code style={{ fontSize: 11, color: 'var(--admin-text-3)' }}>#{o.id.slice(0, 8)}</code>
                                            <span style={{ flex: 1, fontSize: 11, color: 'var(--admin-text-3)' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                                            <span className={`a-badge ${STATUS_BADGE[o.status] || 'a-badge--gray'}`} style={{ fontSize: 10 }}>{o.status}</span>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>₹{Number(o.total_amount).toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
