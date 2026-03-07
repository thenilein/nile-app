import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, RefreshCw } from 'lucide-react';

interface LogEntry {
    id: string; action: string; table_name: string; record_id: string | null;
    description: string | null; created_at: string;
    profiles: { phone: string | null; full_name: string | null } | null;
}

const ACTION_BADGE: Record<string, string> = {
    create: 'a-badge--green', update: 'a-badge--blue', delete: 'a-badge--red',
    status_change: 'a-badge--purple', block: 'a-badge--orange', unblock: 'a-badge--cyan',
};

const AdminLogs: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [tableFilter, setTableFilter] = useState('');
    const [page, setPage] = useState(0);
    const PAGE = 25;

    useEffect(() => { fetchLogs(); }, [page, actionFilter, tableFilter]);

    const fetchLogs = async () => {
        setLoading(true);
        let q = supabase.from('admin_logs').select('*, profiles(phone, full_name)').order('created_at', { ascending: false }).range(page * PAGE, (page + 1) * PAGE - 1);
        if (actionFilter) q = q.eq('action', actionFilter);
        if (tableFilter) q = q.eq('table_name', tableFilter);
        const { data } = await q;
        setLogs(data || []);
        setLoading(false);
    };

    const filtered = logs.filter(l => {
        const q = search.toLowerCase();
        return (l.description || '').toLowerCase().includes(q) || l.table_name.includes(q) || l.action.includes(q) || (l.profiles?.phone || '').includes(q);
    });

    return (
        <div>
            <div className="a-page-header">
                <div>
                    <h1 className="a-page-header__title">Audit Logs</h1>
                    <p className="a-page-header__sub">Every admin action is recorded here</p>
                </div>
                <button onClick={() => { setPage(0); fetchLogs(); }} className="a-btn a-btn--ghost">
                    <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
                </button>
            </div>

            <div className="a-filter-bar">
                <div className="a-filter-bar__search">
                    <Search className="a-filter-bar__search-icon" />
                    <input className="a-filter-bar__search-input" placeholder="Search logs…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="a-filter-bar__select" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}>
                    <option value="">All Actions</option>
                    {['create', 'update', 'delete', 'status_change', 'block', 'unblock'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select className="a-filter-bar__select" value={tableFilter} onChange={e => { setTableFilter(e.target.value); setPage(0); }}>
                    <option value="">All Tables</option>
                    {['products', 'categories', 'orders', 'promotions', 'profiles', 'settings'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="a-table-wrap">
                <div style={{ overflowX: 'auto' }}>
                    <table className="a-table">
                        <thead>
                            <tr><th>Timestamp</th><th>Admin</th><th>Action</th><th>Table</th><th>Description</th></tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5}><div className="a-spinner"><div className="a-spinner__dot" /></div></td></tr>
                            ) : filtered.map(l => (
                                <tr key={l.id}>
                                    <td style={{ fontSize: 11, color: 'var(--admin-text-3)', whiteSpace: 'nowrap' }}>
                                        {new Date(l.created_at).toLocaleDateString()} {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ fontSize: 12, fontWeight: 500 }}>{l.profiles?.phone || l.profiles?.full_name || 'System'}</td>
                                    <td><span className={`a-badge ${ACTION_BADGE[l.action] || 'a-badge--gray'}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>{l.action}</span></td>
                                    <td><code style={{ fontSize: 11, background: 'var(--admin-surface-2)', padding: '2px 7px', borderRadius: 5 }}>{l.table_name}</code></td>
                                    <td style={{ fontSize: 12, color: 'var(--admin-text-2)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {l.description || `${l.action} on ${l.table_name}`}
                                    </td>
                                </tr>
                            ))}
                            {!loading && filtered.length === 0 && (
                                <tr><td colSpan={5}>
                                    <div className="a-empty"><div className="a-empty__icon">📋</div><div className="a-empty__title">No log entries</div></div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="a-pagination">
                    <span className="a-pagination__info">Page {page + 1}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="a-btn a-btn--ghost a-btn--sm">← Prev</button>
                        <button disabled={logs.length < PAGE} onClick={() => setPage(p => p + 1)} className="a-btn a-btn--ghost a-btn--sm">Next →</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogs;
