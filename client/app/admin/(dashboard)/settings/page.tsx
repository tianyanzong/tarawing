'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface TierPricing { detail: number; deepInsights: number; } // cents
interface SiteSettings {
  siteName: string;
  tagline: string;
  donationEnabled: boolean;
  donationMessage: string;
  supportEmail: string;
  pricing: { tarot: TierPricing; astrology: TierPricing; spreads: TierPricing };
  aiMechanism: { autoGenerateOnPayment: boolean };
}

const CATEGORY_LABEL: Record<string, string> = { tarot: 'Tarot', astrology: 'Astrology', spreads: 'Spreads' };

function dollars(cents: number) { return (cents / 100).toFixed(2); }
function toCents(dollarStr: string) { return Math.round(Number(dollarStr || '0') * 100); }

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<SiteSettings>('/api/admin/settings', true).then(setSettings).catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load settings.'));
  }, []);

  async function save() {
    if (!settings) return;
    setError(null);
    try {
      await api.put('/api/admin/settings', settings, true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save settings.');
    }
  }

  function setTierPrice(category: 'tarot' | 'astrology' | 'spreads', tier: 'detail' | 'deepInsights', dollarStr: string) {
    if (!settings) return;
    setSettings({
      ...settings,
      pricing: { ...settings.pricing, [category]: { ...settings.pricing[category], [tier]: toCents(dollarStr) } },
    });
  }

  if (!settings) return <p className="form-note">Loading…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Site settings</h1>
      {error && <p className="form-error">{error}</p>}

      <div className="panel" style={{ maxWidth: 520, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>General</h2>
        <div className="form-field"><label>Site name</label><input value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} /></div>
        <div className="form-field"><label>Tagline</label><input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></div>
        <div className="form-field"><label>Support email</label><input value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} /></div>
        <div className="form-field">
          <label><input type="checkbox" checked={settings.donationEnabled} onChange={(e) => setSettings({ ...settings, donationEnabled: e.target.checked })} style={{ marginRight: 8 }} />Show donation prompt</label>
        </div>
        <div className="form-field"><label>Donation message</label><textarea rows={3} value={settings.donationMessage} onChange={(e) => setSettings({ ...settings, donationMessage: e.target.value })} /></div>
      </div>

      <div className="panel" style={{ maxWidth: 520, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>Report pricing</h2>
        <p className="form-note" style={{ marginBottom: 16 }}>Per-category price (USD) for each paid report tier.</p>
        <table className="data-table" style={{ marginBottom: 4 }}>
          <thead><tr><th>Category</th><th>Detailed Report</th><th>Deep Insights Report</th></tr></thead>
          <tbody>
            {(['tarot', 'astrology', 'spreads'] as const).map((cat) => (
              <tr key={cat}>
                <td>{CATEGORY_LABEL[cat]}</td>
                <td>
                  <span style={{ marginRight: 4 }}>$</span>
                  <input
                    type="number" step="0.01" min="0" style={{ width: 90 }}
                    value={dollars(settings.pricing[cat].detail)}
                    onChange={(e) => setTierPrice(cat, 'detail', e.target.value)}
                  />
                </td>
                <td>
                  <span style={{ marginRight: 4 }}>$</span>
                  <input
                    type="number" step="0.01" min="0" style={{ width: 90 }}
                    value={dollars(settings.pricing[cat].deepInsights)}
                    onChange={(e) => setTierPrice(cat, 'deepInsights', e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel" style={{ maxWidth: 520, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 6 }}>AI mechanism</h2>
        <p className="form-note" style={{ marginBottom: 16 }}>
          Controls what happens the moment a Deep Insights order is paid.
        </p>
        <div className="form-field">
          <label>
            <input
              type="checkbox"
              checked={settings.aiMechanism.autoGenerateOnPayment}
              onChange={(e) => setSettings({ ...settings, aiMechanism: { autoGenerateOnPayment: e.target.checked } })}
              style={{ marginRight: 8 }}
            />
            Auto-generate the Deep Insights report via AI as soon as payment completes
          </label>
        </div>
        <p className="form-note">
          {settings.aiMechanism.autoGenerateOnPayment
            ? 'Currently on: customers get their AI report immediately after paying.'
            : 'Currently off: paid orders land in the Deep Insights Queue for an admin to generate or write manually.'}
        </p>
      </div>

      <button className="btn btn-primary" onClick={save}>Save settings</button>
      {saved && <span className="form-note" style={{ marginLeft: 12 }}>Saved.</span>}
    </div>
  );
}
