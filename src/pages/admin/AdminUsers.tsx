import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Search, Eye, Ban, CheckCircle, X } from 'lucide-react';

interface Customer {
    id: string; phone: string | null; full_name: string | null;
    is_blocked: boolean; created_at: string; role: string;
    order_count?: number; total_spent?: number; last_order?: string;
}

interface Order {
    id: string; total_amount: number; status: string; created_at: string;
}

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
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .neq('role', 'admin')
            .order('created_at', { ascending: false });

        if (!profiles) { setLoading(false); return; }

        // Enrich with order counts
        const enriched = await Promise.all(profiles.map(async (p) => {
            const { data: ords } = await supabase
                .from('orders').select('total_amount, created_at')
                .eq('profile_id', p.id);
            const totalSpent = (ords || []).reduce((s, o) => s + Number(o.total_amount), 0);
            const lastOrder = ords?.length ? ords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : null;
            return { ...p, order_count: ords?.length || 0, total_spent: totalSpent, last_order: lastOrder };
        }));

        setCustomers(enriched);
        setLoading(false);
    };

    const openCustomer = async (c: Customer) => {
        setSelected(c); setLoadingOrders(true);
        const { data } = await supabase.from('orders')
            .select('id, total_amount, status, created_at')
            .eq('profile_id', c.id)
            .order('created_at', { ascending: false });
        setOrders(data || []);
        setLoadingOrders(false);
    };

    const toggleBlock = async (c: Customer) => {
        const newBlocked = !c.is_blocked;
        await supabase.from('profiles').update({ is_blocked: newBlocked }).eq('id', c.id);
        await logAction(newBlocked ? 'block' : 'unblock', 'profiles', c.id, `${newBlocked ? 'Blocked' : 'Unblocked'} customer ${c.phone || c.full_name}`);
        setCustomers(prev => prev.map(p => p.id === c.id ? { ...p, is_blocked: newBlocked } : p));
        if (selected?.id === c.id) setSelected(prev => prev ? { ...prev, is_blocked: newBlocked } : prev);
    };

    const filtered = customers.filter(c => {
        const q = search.toLowerCase();
        return (c.phone || '').includes(q) || (c.full_name || '').toLowerCase().includes(q);
    });

    const STATUS_COLORS: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-700', delivered: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700', preparing: 'bg-purple-100 text-purple-700',
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Customers</h1>
                <p className="text-sm text-gray-500 mt-0.5">{customers.length} registered customers</p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by phone or name..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                {['Customer', 'Orders', 'Total Spent', 'Last Order', 'Status', ''].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12">
                                    <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td></tr>
                            ) : filtered.map(c => (
                                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">
                                                {(c.full_name || c.phone || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium">{c.full_name || '—'}</div>
                                                <div className="text-xs text-gray-400">{c.phone || 'No phone'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{c.order_count}</td>
                                    <td className="px-4 py-3 font-medium text-green-700">₹{(c.total_spent || 0).toFixed(0)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        {c.last_order ? new Date(c.last_order).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {c.is_blocked ? 'Blocked' : 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openCustomer(c)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Eye className="w-3.5 h-3.5 text-gray-500" /></button>
                                            <button onClick={() => toggleBlock(c)} className={`p-1.5 rounded-lg ${c.is_blocked ? 'hover:bg-green-50' : 'hover:bg-red-50'}`}>
                                                {c.is_blocked ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Ban className="w-3.5 h-3.5 text-red-400" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No customers found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order history panel */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                            <div>
                                <h2 className="font-bold text-lg">{selected.full_name || selected.phone || 'Customer'}</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{orders.length} orders · ₹{(selected.total_spent || 0).toFixed(0)} total</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleBlock(selected)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selected.is_blocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                                    {selected.is_blocked ? 'Unblock' : 'Block'}
                                </button>
                                <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="p-6">
                            <h3 className="font-semibold text-sm mb-3">Order History</h3>
                            {loadingOrders ? (
                                <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
                            ) : orders.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm">No orders</div>
                            ) : (
                                <div className="space-y-2">
                                    {orders.map(o => (
                                        <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                                            <div>
                                                <div className="font-mono text-xs text-gray-500">#{o.id.slice(0, 8)}</div>
                                                <div className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                                                <span className="text-sm font-semibold">₹{Number(o.total_amount).toFixed(0)}</span>
                                            </div>
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
