import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Plus, Edit2, Trash2, Search, X, Upload } from 'lucide-react';

interface Product {
    id: string; name: string; description: string | null; price: number;
    category_id: string | null; image_url: string | null; is_available: boolean;
    stock_quantity: number | null; is_popular: boolean;
    categories?: { name: string } | null;
}
interface Category { id: string; name: string; }

const EMPTY = {
    name: '', description: '', price: '', category_id: '',
    image_url: '', is_available: true, stock_quantity: '', is_popular: false
};

const AdminMenu: React.FC = () => {
    const { logAction } = useAdmin();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAll();
        supabase.from('categories').select('id, name').order('name').then(({ data }) => setCategories(data || []));
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        const { data } = await supabase.from('products').select('*, categories(name)').order('name');
        setProducts(data || []);
        setLoading(false);
    };

    const openAdd = () => { setEditingId(null); setForm({ ...EMPTY }); setError(''); setShowModal(true); };
    const openEdit = (p: Product) => {
        setEditingId(p.id);
        setForm({ name: p.name, description: p.description || '', price: String(p.price), category_id: p.category_id || '', image_url: p.image_url || '', is_available: p.is_available, stock_quantity: p.stock_quantity != null ? String(p.stock_quantity) : '', is_popular: p.is_popular });
        setError(''); setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError('');
        try {
            const payload = { name: form.name.trim(), description: form.description.trim() || null, price: parseFloat(form.price), category_id: form.category_id || null, image_url: form.image_url || null, is_available: form.is_available, stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : null, is_popular: form.is_popular };
            if (editingId) {
                await supabase.from('products').update(payload).eq('id', editingId);
                await logAction('update', 'products', editingId, `Updated "${payload.name}"`);
            } else {
                const { data: ins } = await supabase.from('products').insert(payload).select().single();
                await logAction('create', 'products', ins?.id, `Added "${payload.name}"`);
            }
            setShowModal(false); fetchAll();
        } catch (err: any) { setError(err.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const p = products.find(x => x.id === deleteId);
        await supabase.from('products').delete().eq('id', deleteId);
        await logAction('delete', 'products', deleteId, `Deleted "${p?.name}"`);
        setDeleteId(null); fetchAll();
    };

    const toggleAvail = async (p: Product) => {
        await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id);
        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, is_available: !x.is_available } : x));
    };

    const filtered = products.filter(p => {
        const q = search.toLowerCase();
        const matchQ = p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
        const matchCat = catFilter ? p.category_id === catFilter : true;
        return matchQ && matchCat;
    });

    const isLow = (p: Product) => p.stock_quantity != null && p.stock_quantity < 5;

    return (
        <div>
            <div className="a-page-header">
                <div>
                    <h1 className="a-page-header__title">Menu Items</h1>
                    <p className="a-page-header__sub">{products.length} items · {products.filter(p => !p.is_available).length} unavailable</p>
                </div>
                <button onClick={openAdd} className="a-btn a-btn--primary">
                    <Plus style={{ width: 15, height: 15 }} /> Add Item
                </button>
            </div>

            {/* Filters */}
            <div className="a-filter-bar">
                <div className="a-filter-bar__search">
                    <Search className="a-filter-bar__search-icon" />
                    <input className="a-filter-bar__search-input" placeholder="Search menu items…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="a-filter-bar__select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {loading ? <div className="a-spinner"><div className="a-spinner__dot" /></div> : (
                <div className="a-item-grid">
                    {filtered.map(p => (
                        <div key={p.id} className={`a-item-card ${!p.is_available ? 'a-item-card--dim' : ''}`}>
                            <div className="a-item-card__img">
                                {p.image_url
                                    ? <img src={p.image_url} alt={p.name} />
                                    : <div className="a-item-card__placeholder">🍦</div>
                                }
                                {p.is_popular && (
                                    <div className="a-item-card__popular">
                                        <span className="a-badge a-badge--orange" style={{ fontSize: 10 }}>⭐ Popular</span>
                                    </div>
                                )}
                                <div className="a-item-card__actions">
                                    <button onClick={() => openEdit(p)} className="a-item-card__action-btn"><Edit2 style={{ width: 12, height: 12, color: 'var(--admin-text-2)' }} /></button>
                                    <button onClick={() => setDeleteId(p.id)} className="a-item-card__action-btn"><Trash2 style={{ width: 12, height: 12, color: '#ef4444' }} /></button>
                                </div>
                            </div>
                            <div className="a-item-card__body">
                                <div className="a-item-card__name">{p.name}</div>
                                <div className="a-item-card__cat">{p.categories?.name || 'Uncategorised'}</div>
                                {p.description && <div style={{ fontSize: 11, color: 'var(--admin-text-3)', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{p.description}</div>}
                                {p.stock_quantity != null && (
                                    <div style={{ marginTop: 8 }}>
                                        <span className={`a-badge ${isLow(p) ? 'a-badge--red' : 'a-badge--green'}`} style={{ fontSize: 10 }}>
                                            {isLow(p) ? '⚠ Low stock' : 'In stock'} · {p.stock_quantity}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="a-item-card__footer">
                                <span className="a-item-card__price">₹{Number(p.price).toFixed(0)}</span>
                                <button onClick={() => toggleAvail(p)} className={`a-btn a-btn--sm ${p.is_available ? 'a-btn--ghost' : 'a-btn--primary'}`} style={{ fontSize: 11 }}>
                                    {p.is_available ? 'Available' : 'Hidden'}
                                </button>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div style={{ gridColumn: '1/-1' }}>
                            <div className="a-empty">
                                <div className="a-empty__icon">🍦</div>
                                <div className="a-empty__title">No items found</div>
                                <div className="a-empty__desc">Try adjusting your search or filters</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="a-modal-overlay">
                    <div className="a-modal a-modal--lg">
                        <div className="a-modal__header">
                            <h2 className="a-modal__title">{editingId ? 'Edit Item' : 'Add Menu Item'}</h2>
                            <button onClick={() => setShowModal(false)} className="a-btn a-btn--ghost a-btn--sm a-btn--icon"><X style={{ width: 14, height: 14 }} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="a-modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {error && <div className="a-error a-error--red">{error}</div>}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <label className="a-label">Name *</label>
                                        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="a-input" placeholder="e.g. Belgian Chocolate Swirl" />
                                    </div>
                                    <div>
                                        <label className="a-label">Price (₹) *</label>
                                        <input required type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="a-input" placeholder="99" />
                                    </div>
                                    <div>
                                        <label className="a-label">Category</label>
                                        <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="a-input" style={{ cursor: 'pointer' }}>
                                            <option value="">None</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <label className="a-label">Description</label>
                                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="a-input" rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                                    </div>
                                    <div style={{ gridColumn: '1/-1' }}>
                                        <label className="a-label">Image URL</label>
                                        <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="a-input" placeholder="https://..." />
                                    </div>
                                    <div>
                                        <label className="a-label">Stock Quantity</label>
                                        <input type="number" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} className="a-input" placeholder="Leave blank for unlimited" />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 20 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                                        <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} style={{ accentColor: '#16a34a' }} />
                                        <span style={{ color: 'var(--admin-text-2)' }}>Available</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
                                        <input type="checkbox" checked={form.is_popular} onChange={e => setForm(f => ({ ...f, is_popular: e.target.checked }))} style={{ accentColor: '#f59e0b' }} />
                                        <span style={{ color: 'var(--admin-text-2)' }}>Popular</span>
                                    </label>
                                </div>
                            </div>
                            <div className="a-modal__footer">
                                <button type="button" onClick={() => setShowModal(false)} className="a-btn a-btn--ghost">Cancel</button>
                                <button type="submit" disabled={saving} className="a-btn a-btn--primary">{saving ? 'Saving…' : editingId ? 'Update' : 'Add Item'}</button>
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
                            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Delete item?</h3>
                            <p style={{ fontSize: 13, color: 'var(--admin-text-2)' }}>This action cannot be undone.</p>
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

export default AdminMenu;
