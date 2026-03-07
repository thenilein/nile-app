import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';

interface Promotion {
    id: string; code: string; description: string | null;
    discount_type: 'flat' | 'percent'; discount_value: number;
    min_order: number; max_uses: number | null; used_count: number;
    expiry_date: string | null; is_active: boolean; created_at: string;
}
const EMPTY: {
    code: string; description: string; discount_type: 'flat' | 'percent';
    discount_value: string; min_order: string; max_uses: string; expiry_date: string; is_active: boolean;
} = { code: '', description: '', discount_type: 'percent', discount_value: '10', min_order: '0', max_uses: '', expiry_date: '', is_active: true };

const AdminPromotions: React.FC = () => {
    const { logAction } = useAdmin();
    const [promos, setPromos] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
        setPromos(data || []);
        setLoading(false);
    };

    const openAdd = () => { setEditingId(null); setForm({ ...EMPTY }); setError(''); setShowModal(true); };
    const openEdit = (p: Promotion) => {
        setEditingId(p.id);
        setForm({ code: p.code, description: p.description || '', discount_type: p.discount_type, discount_value: String(p.discount_value), min_order: String(p.min_order), max_uses: p.max_uses ? String(p.max_uses) : '', expiry_date: p.expiry_date || '', is_active: p.is_active });
        setError(''); setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            const payload = { code: form.code.toUpperCase().trim(), description: form.description || null, discount_type: form.discount_type, discount_value: parseFloat(form.discount_value), min_order: parseFloat(form.min_order) || 0, max_uses: form.max_uses ? parseInt(form.max_uses) : null, expiry_date: form.expiry_date || null, is_active: form.is_active };
            if (editingId) {
                await supabase.from('promotions').update(payload).eq('id', editingId);
                await logAction('update', 'promotions', editingId, `Updated promo "${payload.code}"`);
            } else {
                const { data: ins } = await supabase.from('promotions').insert(payload).select().single();
                await logAction('create', 'promotions', ins?.id, `Created promo "${payload.code}"`);
            }
            setShowModal(false); fetchAll();
        } catch (err: any) { setError(err.message || 'Failed'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const p = promos.find(x => x.id === deleteId);
        await supabase.from('promotions').delete().eq('id', deleteId);
        await logAction('delete', 'promotions', deleteId, `Deleted promo "${p?.code}"`);
        setDeleteId(null); fetchAll();
    };

    const toggleActive = async (p: Promotion) => {
        await supabase.from('promotions').update({ is_active: !p.is_active }).eq('id', p.id);
        setPromos(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
    };

    const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;

    const ACCENT_COLORS = ['#16a34a', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

    return (
        <div>
            <div className="a-page-header">
                <div>
                    <h1 className="a-page-header__title">Promotions</h1>
                    <p className="a-page-header__sub">{promos.filter(p => p.is_active).length} active promo codes</p>
                </div>
                <button onClick={openAdd} className="a-btn a-btn--primary">
                    <Plus style={{ width: 15, height: 15 }} /> New Promo
                </button>
            </div>

            {loading ? <div className="a-spinner"><div className="a-spinner__dot" /></div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {promos.map((p, i) => {
                        const color = ACCENT_COLORS[i % ACCENT_COLORS.length];
                        const expired = isExpired(p.expiry_date);
                        return (
                            <div key={p.id} style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 14, overflow: 'hidden', boxShadow: 'var(--admin-shadow)', opacity: !p.is_active || expired ? 0.6 : 1, transition: 'all 0.2s' }}>
                                {/* Color stripe */}
                                <div style={{ height: 4, background: color }} />
                                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <div>
                                            <code style={{ fontSize: 20, fontWeight: 800, letterSpacing: 2, color: 'var(--admin-text)' }}>{p.code}</code>
                                            {p.description && <p style={{ fontSize: 12, color: 'var(--admin-text-3)', margin: '4px 0 0' }}>{p.description}</p>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={() => openEdit(p)} className="a-btn a-btn--ghost a-btn--sm a-btn--icon"><Edit2 style={{ width: 12, height: 12 }} /></button>
                                            <button onClick={() => setDeleteId(p.id)} className="a-btn a-btn--danger a-btn--sm a-btn--icon"><Trash2 style={{ width: 12, height: 12 }} /></button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: color + '18', color }}>
                                            {p.discount_type === 'percent' ? `${p.discount_value}% off` : `₹${p.discount_value} off`}
                                        </span>
                                        {p.min_order > 0 && <span className="a-badge a-badge--gray" style={{ fontSize: 11 }}>Min ₹{p.min_order}</span>}
                                        {expired && <span className="a-badge a-badge--red" style={{ fontSize: 11 }}>Expired</span>}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--admin-border-2)', paddingTop: 12 }}>
                                        <span style={{ fontSize: 12, color: 'var(--admin-text-3)' }}>
                                            Used: <strong style={{ color: 'var(--admin-text-2)' }}>{p.used_count}</strong>{p.max_uses ? `/${p.max_uses}` : ''}
                                            {p.expiry_date && ` · ${new Date(p.expiry_date).toLocaleDateString()}`}
                                        </span>
                                        <button onClick={() => toggleActive(p)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: p.is_active ? '#16a34a' : 'var(--admin-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                            {p.is_active ? <ToggleRight style={{ width: 16, height: 16 }} /> : <ToggleLeft style={{ width: 16, height: 16 }} />}
                                            {p.is_active ? 'Active' : 'Off'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {promos.length === 0 && (
                        <div style={{ gridColumn: '1/-1' }}>
                            <div className="a-empty"><div className="a-empty__icon">🎟</div><div className="a-empty__title">No promotions yet</div><div className="a-empty__desc">Create your first promo code</div></div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="a-modal-overlay">
                    <div className="a-modal">
                        <div className="a-modal__header">
                            <h2 className="a-modal__title">{editingId ? 'Edit Promo' : 'New Promo Code'}</h2>
                            <button onClick={() => setShowModal(false)} className="a-btn a-btn--ghost a-btn--sm a-btn--icon"><X style={{ width: 14, height: 14 }} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="a-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {error && <div className="a-error a-error--red">{error}</div>}
                                <div>
                                    <label className="a-label">Code *</label>
                                    <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="a-input" placeholder="SUMMER20" style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2 }} />
                                </div>
                                <div>
                                    <label className="a-label">Description</label>
                                    <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="a-input" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label className="a-label">Type</label>
                                        <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as any }))} className="a-input" style={{ cursor: 'pointer' }}>
                                            <option value="percent">Percent (%)</option>
                                            <option value="flat">Flat (₹)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="a-label">Value *</label>
                                        <input required type="number" min="0" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} className="a-input" />
                                    </div>
                                    <div>
                                        <label className="a-label">Min Order (₹)</label>
                                        <input type="number" min="0" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} className="a-input" />
                                    </div>
                                    <div>
                                        <label className="a-label">Max Uses</label>
                                        <input type="number" min="0" value={form.max_uses} placeholder="Unlimited" onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} className="a-input" />
                                    </div>
                                </div>
                                <div>
                                    <label className="a-label">Expiry Date</label>
                                    <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="a-input" />
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: '#16a34a' }} />
                                    <span style={{ color: 'var(--admin-text-2)' }}>Active</span>
                                </label>
                            </div>
                            <div className="a-modal__footer">
                                <button type="button" onClick={() => setShowModal(false)} className="a-btn a-btn--ghost">Cancel</button>
                                <button type="submit" disabled={saving} className="a-btn a-btn--primary">{saving ? 'Saving…' : editingId ? 'Update' : 'Create Promo'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="a-modal-overlay">
                    <div className="a-modal" style={{ maxWidth: 360 }}>
                        <div className="a-modal__body" style={{ textAlign: 'center', padding: 32 }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🎟</div>
                            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Delete promo?</h3>
                            <p style={{ fontSize: 13, color: 'var(--admin-text-2)' }}>This promo code will be permanently deleted.</p>
                        </div>
                        <div className="a-modal__footer" style={{ justifyContent: 'center' }}>
                            <button onClick={() => setDeleteId(null)} className="a-btn a-btn--ghost">Cancel</button>
                            <button onClick={handleDelete} className="a-btn a-btn--danger">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPromotions;
