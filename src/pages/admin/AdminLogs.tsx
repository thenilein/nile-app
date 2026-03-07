import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, RefreshCw } from 'lucide-react';

interface LogEntry {
    id: string; action: string; table_name: string; record_id: string | null;
    description: string | null; created_at: string;
    profiles: { phone: string | null; full_name: string | null } | null;
}

const ACTION_COLORS: Record<string, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
    status_change: 'bg-purple-100 text-purple-700',
    block: 'bg-orange-100 text-orange-700',
    unblock: 'bg-cyan-100 text-cyan-700',
};

const AdminLogs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [tableFilter, setTableFilter] = useState('');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 25;

    useEffect(() => { fetchLogs(); }, [page, actionFilter, tableFilter]);

    const fetchLogs = async () => {
        setLoading(true);
        let query = supabase
            .from('admin_logs')
            .select('*, profiles(phone, full_name)')
            .order('created_at', { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (actionFilter) query = query.eq('action', actionFilter);
        if (tableFilter) query = query.eq('table_name', tableFilter);

        const { data } = await query;
        setLogs(data || []);
        setLoading(false);
    };

    const filtered = logs.filter(l => {
        const q = search.toLowerCase();
        return (
            (l.description || '').toLowerCase().includes(q) ||
            l.table_name.includes(q) ||
            l.action.includes(q) ||
            (l.profiles?.phone || '').includes(q)
        );
    });

    const allActions = ['create', 'update', 'delete', 'status_change', 'block', 'unblock'];
    const allTables = ['products', 'categories', 'orders', 'promotions', 'profiles', 'settings'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Audit Logs</h1>
                    <p className="text-sm text-gray-500 mt-0.5">All admin actions are recorded here</p>
                </div>
                <button onClick={() => { setPage(0); fetchLogs(); }} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search logs..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">All Actions</option>
                    {allActions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={tableFilter} onChange={e => { setTableFilter(e.target.value); setPage(0); }}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">All Tables</option>
                    {allTables.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                {['Timestamp', 'Admin', 'Action', 'Table', 'Description'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="text-center py-12">
                                    <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td></tr>
                            ) : filtered.map(l => (
                                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 last:border-0 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(l.created_at).toLocaleDateString()} {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium">
                                        {l.profiles?.phone || l.profiles?.full_name || 'System'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${ACTION_COLORS[l.action] || 'bg-gray-100 text-gray-600'}`}>
                                            {l.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{l.table_name}</code>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                                        {l.description || `${l.action} on ${l.table_name}`}
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No log entries found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
                    <span className="text-xs text-gray-500">Page {page + 1}</span>
                    <button disabled={logs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
                </div>
            </div>
        </div>
    );
};

export default AdminLogs;
