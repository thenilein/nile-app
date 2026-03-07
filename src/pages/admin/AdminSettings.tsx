import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Save, CheckCircle } from 'lucide-react';

interface Setting { key: string; value: any; description: string | null }

const SETTING_FIELDS = [
    { key: 'store_name', label: 'Store Name', type: 'text' },
    { key: 'opening_time', label: 'Opening Time', type: 'time' },
    { key: 'closing_time', label: 'Closing Time', type: 'time' },
    { key: 'delivery_charge', label: 'Delivery Charge (₹)', type: 'number' },
    { key: 'min_order_amount', label: 'Minimum Order Amount (₹)', type: 'number' },
    { key: 'tax_percentage', label: 'Tax Percentage (%)', type: 'number' },
    { key: 'delivery_radius_km', label: 'Delivery Radius (km)', type: 'number' },
    { key: 'currency_symbol', label: 'Currency Symbol', type: 'text' },
];

const AdminSettings: React.FC = () => {
    const { logAction } = useAdmin();
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data } = await supabase.from('settings').select('key, value');
        if (data) {
            const map: Record<string, string> = {};
            data.forEach(s => {
                const raw = s.value;
                map[s.key] = typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : String(raw);
            });
            setSettings(map);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(''); setSaved(false);
        try {
            const updates = SETTING_FIELDS.map(f => {
                const val = settings[f.key] ?? '';
                const jsonValue = f.type === 'text' ? JSON.stringify(val) : val;
                return supabase.from('settings').upsert({ key: f.key, value: jsonValue }, { onConflict: 'key' });
            });
            await Promise.all(updates);
            await logAction('update', 'settings', undefined, 'Updated store settings');
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">Store Settings</h1>
                <p className="text-sm text-gray-500 mt-0.5">Configure your store's operational settings</p>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-6 space-y-5">
                    {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                    {saved && (
                        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Settings saved successfully
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {SETTING_FIELDS.map(({ key, label, type }) => (
                            <div key={key} className={key === 'store_name' ? 'md:col-span-2' : ''}>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">{label}</label>
                                <input
                                    type={type}
                                    value={settings[key] ?? ''}
                                    onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm">
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminSettings;
