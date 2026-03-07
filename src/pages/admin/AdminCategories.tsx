import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Plus, Edit2, Trash2, X, Upload, GripVertical } from 'lucide-react';

interface Category {
    id: string; name: string; slug: string; description: string | null;
    image_url: string | null; is_active: boolean; display_order: number;
}

const EMPTY = { name: '', slug: '', description: '', image_url: '', is_active: true };

const AdminCategories: React.FC = () => {
    const { logAction } = useAdmin();
    const [categories, setCategories] = useState<Category[]>([]);
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
            const payload = {
                name: form.name.trim(), slug: form.slug.trim() || slugify(form.name),
                description: form.description.trim() || null, image_url: form.image_url || null,
                is_active: form.is_active,
            };
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

    const moveUp = async (index: number) => {
        if (index === 0) return;
        const updated = [...categories];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
        await Promise.all(updated.map((c, i) => supabase.from('categories').update({ display_order: i }).eq('id', c.id)));
        fetchAll();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Categories</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{categories.length} categories</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium shadow-sm">
                    <Plus className="w-4 h-4" /> Add Category
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8"></th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Slug</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((c, i) => (
                                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                                    <td className="px-4 py-3">
                                        <button onClick={() => moveUp(i)} className="text-gray-300 hover:text-gray-600 cursor-pointer">
                                            <GripVertical className="w-4 h-4" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {c.image_url ? (
                                                <img src={c.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-lg">🍦</div>
                                            )}
                                            <div>
                                                <div className="font-medium">{c.name}</div>
                                                {c.description && <div className="text-xs text-gray-400 truncate max-w-[200px]">{c.description}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.slug}</code>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                                            </button>
                                            <button onClick={() => setDeleteId(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-10 text-gray-400 text-sm">No categories yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="font-bold text-lg">{editingId ? 'Edit Category' : 'Add Category'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Name *</label>
                                <input required value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Slug</label>
                                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Description</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">Image URL</label>
                                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                                    placeholder="https://..."
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
                                    {saving ? 'Saving...' : editingId ? 'Update' : 'Add Category'}
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
                        <h3 className="font-bold text-lg mb-2">Delete Category?</h3>
                        <p className="text-sm text-gray-500 mb-6">Products in this category will become uncategorised.</p>
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

export default AdminCategories;
