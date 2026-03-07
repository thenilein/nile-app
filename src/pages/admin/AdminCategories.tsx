import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';

interface Category {
    id: string; name: string; slug: string; description: string | null;
    image_url: string | null; is_active: boolean; display_order: number;
}
const ICONS = ['🍦', '🍧', '🍨', '🧁', '🍰', '🎂', '🍫', '🍬', '🧊', '🥤'];
const EMPTY = { name: '', slug: '', description: '', image_url: '', is_active: true };

const AdminCategories: React.FC = () => {
    const { logAction } = useAdmin();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => { fetchAll(); }, []);
    const fetchAll = async () => {
        setLoading(true);
        const { data } = await supabase.from('categories').select('*').order('display_order');
        setCategories(data || []);
        setLoading(false);
    };

    const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const openAdd = () => { setEditingId(null); setForm({ ...EMPTY }); setError(''); setShowModal(true); };
    const openEdit = (c: Category) => {
        setEditingId(c.id);
        setForm({ name: c.name, slug: c.slug, description: c.description || '', image_url: c.image_url || '', is_active: c.is_active });
        setError(''); setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            const payload = { name: form.name.trim(), slug: form.slug.trim() || slugify(form.name), description: form.description.trim() || null, image_url: form.image_url || null, is_active: form.is_active };
            if (editingId) {
                await supabase.from('categories').update(payload).eq('id', editingId);
                await logAction('update', 'categories', editingId, `Updated category "${payload.name}"`);
            } else {
                const { data: ins } = await supabase.from('categories').insert({ ...payload, display_order: categories.length }).select().single();
                await logAction('create', 'categories', ins?.id, `Created category "${payload.name}"`);
            }
            setShowModal(false); fetchAll();
        } catch (err: any) { setError(err.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const cat = categories.find(c => c.id === deleteId);
        await supabase.from('categories').delete().eq('id', deleteId);
        await logAction('delete', 'categories', deleteId, `Deleted category "${cat?.name}"`);
        setDeleteId(null); fetchAll();
    };

    const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    const getEmoji = (name: string) => {
        if (name.toLowerCase().includes('cone')) return '🍦';
        if (name.toLowerCase().includes('scoop')) return '🍧';
        if (name.toLowerCase().includes('sundae')) return '🍨';
        if (name.toLowerCase().includes('shake')) return '🥤';
        return ICONS[Math.abs(name.charCodeAt(0)) % ICONS.length];
    };

    return (
        <div>
            <div className="a-page-header">
                <div>
                    <h1 className="a-page-header__title">Categories</h1>
                    <p className="a-page-header__sub">{categories.length} categories total</p>
                </div>
                <button onClick={openAdd} className="a-btn a-btn--primary">
                    <Plus style={{ width: 15, height: 15 }} /> Add Category
                </button>
            </div>

            {/* Search */}
            <div className="a-filter-bar">
                <div className="a-filter-bar__search">
                    <Search className="a-filter-bar__search-icon" />
                    <input className="a-filter-bar__search-input" placeholder="Search categories…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {loading ? <div className="a-spinner"><div className="a-spinner__dot" /></div> : (
                <div className="a-table-wrap">
                    <table className="a-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Slug</th>
                                <th>Status</th>
                                <th>Order</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(c => (
                                <tr key={c.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--admin-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, border: '1px solid var(--admin-border)' }}>
                                                {c.image_url ? <img src={c.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 9 }} /> : getEmoji(c.name)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                                                {c.description && <div style={{ fontSize: 11, color: 'var(--admin-text-3)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td><code style={{ fontSize: 11, background: 'var(--admin-surface-2)', padding: '2px 7px', borderRadius: 5, color: 'var(--admin-text-2)' }}>{c.slug}</code></td>
                                    <td><span className={`a-badge ${c.is_active ? 'a-badge--green' : 'a-badge--red'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td style={{ color: 'var(--admin-text-3)', fontSize: 12 }}>#{c.display_order + 1}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                            <button onClick={() => openEdit(c)} className="a-btn a-btn--ghost a-btn--sm a-btn--icon"><Edit2 style={{ width: 13, height: 13 }} /></button>
                                            <button onClick={() => setDeleteId(c.id)} className="a-btn a-btn--danger a-btn--sm a-btn--icon"><Trash2 style={{ width: 13, height: 13 }} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={5}>
                                    <div className="a-empty">
                                        <div className="a-empty__icon">🗂</div>
                                        <div className="a-empty__title">No categories yet</div>
                                        <div className="a-empty__desc">Add your first category to organise the menu</div>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="a-modal-overlay">
                    <div className="a-modal">
                        <div className="a-modal__header">
                            <h2 className="a-modal__title">{editingId ? 'Edit Category' : 'Add Category'}</h2>
                            <button onClick={() => setShowModal(false)} className="a-btn a-btn--ghost a-btn--sm a-btn--icon"><X style={{ width: 14, height: 14 }} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="a-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {error && <div className="a-error a-error--red">{error}</div>}
                                <div>
                                    <label className="a-label">Name *</label>
                                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} className="a-input" placeholder="e.g. Classic Scoops" />
                                </div>
                                <div>
                                    <label className="a-label">Slug</label>
                                    <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="a-input" />
                                </div>
                                <div>
                                    <label className="a-label">Description</label>
                                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="a-input" rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                                </div>
                                <div>
                                    <label className="a-label">Image URL</label>
                                    <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="a-input" placeholder="https://..." />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" id="cat-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: '#16a34a' }} />
                                    <label htmlFor="cat-active" style={{ fontSize: 13, color: 'var(--admin-text-2)', cursor: 'pointer' }}>Active</label>
                                </div>
                            </div>
                            <div className="a-modal__footer">
                                <button type="button" onClick={() => setShowModal(false)} className="a-btn a-btn--ghost">Cancel</button>
                                <button type="submit" disabled={saving} className="a-btn a-btn--primary">{saving ? 'Saving…' : editingId ? 'Update' : 'Add Category'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleteId && (
                <div className="a-modal-overlay">
                    <div className="a-modal" style={{ maxWidth: 360 }}>
                        <div className="a-modal__body" style={{ textAlign: 'center', padding: 32 }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑</div>
                            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Delete category?</h3>
                            <p style={{ fontSize: 13, color: 'var(--admin-text-2)' }}>Products in this category will become uncategorised.</p>
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

export default AdminCategories;
