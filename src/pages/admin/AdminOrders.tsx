import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Search, ChevronDown, Eye, X, Download } from 'lucide-react';

const STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    accepted: 'bg-blue-100 text-blue-700',
    preparing: 'bg-purple-100 text-purple-700',
    ready: 'bg-indigo-100 text-indigo-700',
    out_for_delivery: 'bg-cyan-100 text-cyan-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
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
    const PAGE_SIZE = 15;

    useEffect(() => { fetchOrders(); }, [statusFilter, page]);

    const fetchOrders = async () => {
        setLoading(true);
        let query = supabase.from('orders')
            .select('*, profiles(phone, full_name)')
            .order('created_at', { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (statusFilter) query = query.eq('status', statusFilter);
        const { data } = await query;
        setOrders(data || []);
        setLoading(false);
    };

    const openOrder = async (o: Order) => {
        setSelectedOrder(o); setLoadingItems(true);
        const { data } = await supabase.from('order_items')
            .select('*, products(name)').eq('order_id', o.id);
        setOrderItems(data || []);
        setLoadingItems(false);
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        const old = orders.find(o => o.id === orderId);
        await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        await logAction('status_change', 'orders', orderId, `Changed order status from "${old?.status}" to "${newStatus}"`);
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : prev);
    };

    const exportCSV = () => {
        const rows = [
            ['Order ID', 'Customer', 'Total', 'Status', 'Payment', 'Type', 'Date'],
            ...orders.map(o => [
                o.id.slice(0, 8),
                o.profiles?.phone || o.profiles?.full_name || 'Guest',
                o.total_amount,
                o.status,
                o.payment_status,
                o.order_type,
                new Date(o.created_at).toLocaleString(),
            ])
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'orders.csv'; a.click();
    };

    const filtered = orders.filter(o => {
        const q = search.toLowerCase();
        return (
            o.id.toLowerCase().includes(q) ||
            (o.profiles?.phone || '').toLowerCase().includes(q) ||
            (o.profiles?.full_name || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Orders</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Manage and update order statuses</p>
                </div>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {['', ...STATUSES].map(s => (
                    <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {s ? s.replace('_', ' ') : 'All'}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by order ID or customer..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                {['Order ID', 'Customer', 'Total', 'Status', 'Payment', 'Type', 'Time', ''].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-12">
                                    <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td></tr>
                            ) : filtered.map(o => (
                                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">#{o.id.slice(0, 8)}</td>
                                    <td className="px-4 py-3 font-medium">{o.profiles?.phone || o.profiles?.full_name || 'Guest'}</td>
                                    <td className="px-4 py-3 font-semibold">₹{Number(o.total_amount).toFixed(0)}</td>
                                    <td className="px-4 py-3">
                                        <div className="relative inline-block">
                                            <select value={o.status}
                                                onChange={e => updateStatus(o.id, e.target.value)}
                                                className={`appearance-none pr-5 pl-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-1 top-1 w-3 h-3 pointer-events-none" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {o.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{o.order_type}</td>
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(o.created_at).toLocaleDateString()} {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => openOrder(o)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No orders found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                    <span className="text-xs text-gray-500">Page {page + 1}</span>
                    <button disabled={orders.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
            </div>

            {/* Order Detail Panel */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
                            <div>
                                <h2 className="font-bold text-lg">Order #{selectedOrder.id.slice(0, 8)}</h2>
                                <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedOrder.status]}`}>
                                    {selectedOrder.status}
                                </span>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-500">Customer</span><div className="font-medium mt-1">{selectedOrder.profiles?.phone || selectedOrder.profiles?.full_name || 'Guest'}</div></div>
                                <div><span className="text-gray-500">Total</span><div className="font-bold mt-1 text-green-700">₹{Number(selectedOrder.total_amount).toFixed(2)}</div></div>
                                <div><span className="text-gray-500">Payment</span><div className="font-medium mt-1 capitalize">{selectedOrder.payment_method} · {selectedOrder.payment_status}</div></div>
                                <div><span className="text-gray-500">Type</span><div className="font-medium mt-1 capitalize">{selectedOrder.order_type}</div></div>
                                <div className="col-span-2"><span className="text-gray-500">Date</span><div className="font-medium mt-1">{new Date(selectedOrder.created_at).toLocaleString()}</div></div>
                                {selectedOrder.notes && <div className="col-span-2"><span className="text-gray-500">Notes</span><div className="font-medium mt-1">{selectedOrder.notes}</div></div>}
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-sm mb-3">Items</h3>
                                {loadingItems ? (
                                    <div className="text-center py-4 text-gray-400 text-sm">Loading items...</div>
                                ) : (
                                    <div className="space-y-2">
                                        {orderItems.map(item => (
                                            <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center justify-center">{item.quantity}</span>
                                                    <span>{item.products?.name || 'Unknown'}</span>
                                                </div>
                                                <span className="font-medium">₹{(item.price_at_purchase * item.quantity).toFixed(0)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-medium text-gray-600 block mb-2">Update Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {STATUSES.map(s => (
                                        <button key={s} onClick={() => updateStatus(selectedOrder.id, s)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedOrder.status === s ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                            {s.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
