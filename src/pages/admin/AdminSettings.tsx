import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAdmin } from '../../context/AdminContext';
import { Save, CheckCircle } from 'lucide-react';

const FIELDS = [
    { key: 'store_name', label: 'Store Name', type: 'text', full: true },
    { key: 'opening_time', label: 'Opening Time', type: 'time' },
    { key: 'closing_time', label: 'Closing Time', type: 'time' },
    { key: 'delivery_charge', label: 'Delivery Charge (₹)', type: 'number' },
    { key: 'min_order_amount', label: 'Minimum Order (₹)', type: 'number' },
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
            data.forEach(s => { const raw = s.value; map[s.key] = typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : String(raw); });
            setSettings(map);
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault(); setSaving(true); setError(''); setSaved(false);
        try {
            await Promise.all(FIELDS.map(f => {
                const val = settings[f.key] ?? '';
                const jsonValue = f.type === 'text' ? JSON.stringify(val) : val;
                return supabase.from('settings').upsert({ key: f.key, value: jsonValue }, { onConflict: 'key' });
            }));
            await logAction('update', 'settings', undefined, 'Updated store settings');
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) { setError(err.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="a-spinner"><div className="a-spinner__dot" /></div>;

    return (
        <div style={{ maxWidth: 680 }}>
            <div className="a-page-header">
                <div>
                    <h1 className="a-page-header__title">Store Settings</h1>
                    <p className="a-page-header__sub">Configure operational parameters</p>
                </div>
            </div>

            <form onSubmit={handleSave}>
                <div className="a-card">
                    <div className="a-card__header">
                        <span className="a-card__title">General Settings</span>
                    </div>
                    <div className="a-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {error && <div className="a-error a-error--red">{error}</div>}
                        {saved && (
                            <div className="a-error a-error--green" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle style={{ width: 15, height: 15 }} />
                                Settings saved successfully
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {FIELDS.map(({ key, label, type, full }) => (
                                <div key={key} style={full ? { gridColumn: '1/-1' } : {}}>
                                    <label className="a-label">{label}</label>
                                    <input type={type} value={settings[key] ?? ''}
                                        onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                                        className="a-input" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--admin-border)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" disabled={saving} className="a-btn a-btn--primary">
                            <Save style={{ width: 14, height: 14 }} />
                            {saving ? 'Saving…' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AdminSettings;
