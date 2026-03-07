import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Plus, Edit2, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';

interface Promotion {
    id: string; code: string; description: string | null;
    discount_type: 'flat' | 'percent'; discount_value: number;
    min_order: number; max_uses: number | null; used_count: number;
    expiry_date: string | null; is_active: boolean; created_at: string;
}

const EMPTY: {
    code: string; description: string; discount_type: 'flat' | 'percent';
    discount_value: string; min_order: string; max_uses: string; expiry_date: string; is_active: boolean;
} = {
    code: '', description: '', discount_type: 'percent',
    discount_value: '10', min_order: '0', max_uses: '', expiry_date: '', is_active: true
};

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
        setForm({
            code: p.code, description: p.description || '', discount_type: p.discount_type,
            discount_value: String(p.discount_value), min_order: String(p.min_order),
            max_uses: p.max_uses ? String(p.max_uses) : '', expiry_date: p.expiry_date || '', is_active: p.is_active
        });
        setError(''); setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            const payload = {
                code: form.code.toUpperCase().trim(), description: form.description || null,
                discount_type: form.discount_type, discount_value: parseFloat(form.discount_value),
                min_order: parseFloat(form.min_order) || 0,
                max_uses: form.max_uses ? parseInt(form.max_uses) : null,
                expiry_date: form.expiry_date || null, is_active: form.is_active,
            };
            if (editingId) {
                await supabase.from('promotions').update(payload).eq('id', editingId);
                await logAction('update', 'promotions', editingId, `Updated promo "${payload.code}"`);
            } else {
                const { data: ins } = await supabase.from('promotions').insert(payload).select().single();
                await logAction('create', 'promotions', ins?.id, `Created promo "${payload.code}"`);
            }
            setShowModal(false); fetchAll();
        } catch (err: any) { setError(err.message || 'Failed to save'); }
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Promotions</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{promos.filter(p => p.is_active).length} active promo codes</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium shadow-sm">
                    <Plus className="w-4 h-4" /> New Promo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-3 flex items-center justify-center h-32">
                        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : promos.map(p => (
                    <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-5 space-y-3 ${!p.is_active || isExpired(p.expiry_date) ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="font-mono font-bold text-lg tracking-widest">{p.code}</div>
                                {p.description && <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-500" /></button>
                                <button onClick={() => setDeleteId(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                                {p.discount_type === 'percent' ? `${p.discount_value}% off` : `₹${p.discount_value} off`}
                            </span>
                            {p.min_order > 0 && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Min ₹{p.min_order}</span>}
                            {isExpired(p.expiry_date) && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">Expired</span>}
                        </div>

                        <div className="flex items-center justify-between border-t pt-3">
                            <div className="text-xs text-gray-500">
                                Used: <strong>{p.used_count}</strong>{p.max_uses ? ` / ${p.max_uses}` : ''}
                                {p.expiry_date && <> · Expires {new Date(p.expiry_date).toLocaleDateString()}</>}
                            </div>
                            <button onClick={() => toggleActive(p)} className={`flex items-center gap-1 text-xs font-medium ${p.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                                {p.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                {p.is_active ? 'Active' : 'Inactive'}
                            </button>
                        </div>
                    </div>
                ))}
                {!loading && promos.length === 0 && (
                    <div className="col-span-3 text-center py-16 text-gray-400">No promotions yet</div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="font-bold text-lg">{editingId ? 'Edit Promo' : 'New Promo Code'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Code *</label>
                                <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                    placeholder="SUMMER20"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Type</label>
                                    <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as any }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
                                        <option value="percent">Percent (%)</option>
                                        <option value="flat">Flat (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Value *</label>
                                    <input required type="number" min="0" value={form.discount_value}
                                        onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Min Order (₹)</label>
                                    <input type="number" min="0" value={form.min_order}
                                        onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Max Uses</label>
                                    <input type="number" min="0" value={form.max_uses} placeholder="Unlimited"
                                        onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Expiry Date</label>
                                <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="w-4 h-4 accent-green-600" />
                                <span className="text-sm text-gray-600">Active</span>
                            </label>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border text-sm rounded-xl hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 disabled:opacity-50">
                                    {saving ? 'Saving...' : editingId ? 'Update' : 'Create Promo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {deleteId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="font-bold text-lg mb-2">Delete Promo?</h3>
                        <p className="text-sm text-gray-500 mb-6">This promo code will be permanently deleted.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 border text-sm rounded-xl hover:bg-gray-50">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm rounded-xl hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPromotions;
