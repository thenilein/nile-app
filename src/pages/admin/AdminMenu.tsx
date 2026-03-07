import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, X, Upload, Star } from 'lucide-react';

interface Category { id: string; name: string }
interface Product {
    id: string; name: string; description: string | null; price: number;
    image_url: string | null; category_id: string | null; is_available: boolean;
    is_popular: boolean; stock_quantity: number; is_active: boolean;
    categories?: { name: string };
}

const EMPTY_FORM = {
    name: '', description: '', price: '', category_id: '',
    image_url: '', stock_quantity: '100', is_available: true, is_popular: false, is_active: true
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
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        const [{ data: prods }, { data: cats }] = await Promise.all([
            supabase.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
            supabase.from('categories').select('id, name').order('display_order'),
        ]);
        setProducts(prods || []);
        setCategories(cats || []);
        setLoading(false);
    };

    const openAdd = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setError(''); setShowModal(true); };
    const openEdit = (p: Product) => {
        setEditingId(p.id);
        setForm({
            name: p.name, description: p.description || '', price: String(p.price),
            category_id: p.category_id || '', image_url: p.image_url || '',
            stock_quantity: String(p.stock_quantity), is_available: p.is_available,
            is_popular: p.is_popular, is_active: p.is_active,
        });
        setError(''); setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const payload = {
                name: form.name.trim(), description: form.description.trim() || null,
                price: parseFloat(form.price), category_id: form.category_id || null,
                image_url: form.image_url || null, stock_quantity: parseInt(form.stock_quantity) || 0,
                is_available: form.is_available, is_popular: form.is_popular, is_active: form.is_active,
            };
            if (editingId) {
                const old = products.find(p => p.id === editingId);
                await supabase.from('products').update(payload).eq('id', editingId);
                await logAction('update', 'products', editingId, `Updated menu item "${payload.name}"`, old, payload);
            } else {
                const { data: inserted } = await supabase.from('products').insert(payload).select().single();
                await logAction('create', 'products', inserted?.id, `Created menu item "${payload.name}"`, null, payload);
            }
            setShowModal(false);
            fetchAll();
        } catch (err: any) {
            setError(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const item = products.find(p => p.id === deleteId);
        await supabase.from('products').delete().eq('id', deleteId);
        await logAction('delete', 'products', deleteId, `Deleted menu item "${item?.name}"`);
        setDeleteId(null);
        fetchAll();
    };

    const toggleAvailability = async (p: Product) => {
        await supabase.from('products').update({ is_available: !p.is_available }).eq('id', p.id);
        await logAction('update', 'products', p.id, `Toggled availability for "${p.name}" to ${!p.is_available}`);
        fetchAll();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageUploading(true);
        const ext = file.name.split('.').pop();
        const path = `menu/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('menu-images').upload(path, file);
        if (upErr) { setError('Image upload failed: ' + upErr.message); setImageUploading(false); return; }
        const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(path);
        setForm(f => ({ ...f, image_url: publicUrl }));
        setImageUploading(false);
    };

    const filtered = products.filter(p => {
        const q = search.toLowerCase();
        const matchSearch = p.name.toLowerCase().includes(q);
        const matchCat = !catFilter || p.category_id === catFilter;
        return matchSearch && matchCat;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Menu Items</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{products.length} items total</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium shadow-sm">
                    <Plus className="w-4 h-4" /> Add Item
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search items..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(p => (
                        <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${!p.is_available ? 'opacity-60' : ''}`}>
                            <div className="relative h-40 bg-gray-100">
                                {p.image_url ? (
                                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🍦</div>
                                )}
                                {p.is_popular && (
                                    <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Star className="w-2.5 h-2.5" /> Popular
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <button onClick={() => openEdit(p)} className="w-7 h-7 bg-white rounded-lg shadow flex items-center justify-center hover:bg-gray-50">
                                        <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                                    </button>
                                    <button onClick={() => setDeleteId(p.id)} className="w-7 h-7 bg-white rounded-lg shadow flex items-center justify-center hover:bg-red-50">
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm truncate">{p.name}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{p.categories?.name || 'Uncategorised'}</p>
                                    </div>
                                    <span className="text-sm font-bold text-green-700 flex-shrink-0">₹{Number(p.price).toFixed(0)}</span>
                                </div>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                    <span className="text-xs text-gray-500">Stock: <strong>{p.stock_quantity}</strong></span>
                                    <button onClick={() => toggleAvailability(p)} className={`flex items-center gap-1 text-xs font-medium transition-colors ${p.is_available ? 'text-green-600' : 'text-gray-400'}`}>
                                        {p.is_available ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                        {p.is_available ? 'Available' : 'Unavailable'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-3 text-center py-16 text-gray-400">No items found</div>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="font-bold text-lg">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

                            {/* Image */}
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Image</label>
                                {form.image_url && (
                                    <img src={form.image_url} alt="" className="w-full h-40 object-cover rounded-xl mb-2" />
                                )}
                                <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-green-400 transition-colors">
                                    <Upload className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-500">{imageUploading ? 'Uploading...' : 'Upload Image'}</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                </label>
                                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                                    placeholder="Or paste image URL"
                                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
                                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Price (₹) *</label>
                                    <input required type="number" min="0" step="0.01" value={form.price}
                                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Stock Qty</label>
                                    <input type="number" min="0" value={form.stock_quantity}
                                        onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                                    <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                                        <option value="">None</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-6 pt-1">
                                {[
                                    { key: 'is_available', label: 'Available' },
                                    { key: 'is_popular', label: 'Popular' },
                                    { key: 'is_active', label: 'Active' },
                                ].map(({ key, label }) => (
                                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={(form as any)[key]}
                                            onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                                            className="w-4 h-4 accent-green-600 rounded" />
                                        <span className="text-sm text-gray-600">{label}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50">
                                    {saving ? 'Saving...' : editingId ? 'Update Item' : 'Add Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="font-bold text-lg mb-2">Delete Item?</h3>
                        <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
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

export default AdminMenu;
