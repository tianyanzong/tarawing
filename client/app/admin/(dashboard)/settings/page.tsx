'use client';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { AiAdapter, AiEndpoint, PaymentMethod, SiteSettings, SmtpSettings } from '@/lib/types';

const CATEGORY_LABEL: Record<string, string> = { tarot: 'Tarot', astrology: 'Astrology', spreads: 'Spreads' };
const ADAPTER_LABEL: Record<AiAdapter, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  openai_compatible: 'OpenAI-compatible',
};
const DEFAULT_BASE_URL: Record<AiAdapter, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  openai_compatible: '',
};

type SettingsTab = 'general' | 'pricing' | 'ai' | 'payments' | 'smtp';

function dollars(cents: number) { return (cents / 100).toFixed(2); }
function toCents(dollarStr: string) { return Math.round(Number(dollarStr || '0') * 100); }
function newId(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${suffix}`;
}
function moveItem<T extends { order: number }>(items: T[], index: number, delta: number) {
  const next = [...items];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((item, order) => ({ ...item, order }));
}
function readQrImage(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return Promise.reject(new Error('Choose a PNG, JPEG, or WebP image.'));
  }
  if (file.size > 1024 * 1024) {
    return Promise.reject(new Error('QR images must be 1 MiB or smaller.'));
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [tab, setTab] = useState<SettingsTab>('general');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    api.get<SiteSettings>('/api/admin/settings', true)
      .then(setSettings)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load settings.'));
  }, []);

  async function save() {
    if (!settings) return false;
    setError(null);
    try {
      const result = await api.put<{ settings: SiteSettings }>('/api/admin/settings', settings, true);
      setSettings(result.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save settings.');
      return false;
    }
  }

  function setTierPrice(category: 'tarot' | 'astrology' | 'spreads', tier: 'detail' | 'deepInsights', dollarStr: string) {
    if (!settings) return;
    setSettings({
      ...settings,
      pricing: { ...settings.pricing, [category]: { ...settings.pricing[category], [tier]: toCents(dollarStr) } },
    });
  }

  function setEndpoint(index: number, patch: Partial<AiEndpoint>) {
    if (!settings) return;
    const endpoints = settings.aiMechanism.endpoints.map((endpoint, i) => (
      i === index ? { ...endpoint, ...patch } : endpoint
    ));
    setSettings({ ...settings, aiMechanism: { ...settings.aiMechanism, endpoints } });
  }

  function addEndpoint() {
    if (!settings) return;
    const endpoint: AiEndpoint = {
      id: newId('aip'),
      name: 'New AI provider',
      adapter: 'openai',
      model: '',
      baseUrl: DEFAULT_BASE_URL.openai,
      enabled: true,
      order: settings.aiMechanism.endpoints.length,
      apiKey: '',
      hasApiKey: false,
    };
    setSettings({
      ...settings,
      aiMechanism: {
        ...settings.aiMechanism,
        endpoints: [...settings.aiMechanism.endpoints, endpoint],
      },
    });
  }

  function moveEndpoint(index: number, delta: number) {
    if (!settings) return;
    setSettings({
      ...settings,
      aiMechanism: {
        ...settings.aiMechanism,
        endpoints: moveItem(settings.aiMechanism.endpoints, index, delta),
      },
    });
  }

  function setPaymentMethod(index: number, patch: Partial<PaymentMethod>) {
    if (!settings) return;
    const paymentMethods = settings.paymentMethods.map((method, i) => (
      i === index ? { ...method, ...patch } : method
    ));
    setSettings({ ...settings, paymentMethods });
  }

  function setSmtp(patch: Partial<SmtpSettings>) {
    if (!settings) return;
    setSettings({ ...settings, smtp: { ...settings.smtp, ...patch } });
  }

  function addPaymentMethod() {
    if (!settings) return;
    setSettings({
      ...settings,
      paymentMethods: [...settings.paymentMethods, {
        id: newId('pm'),
        name: 'New payment method',
        enabled: false,
        qrImage: '',
        order: settings.paymentMethods.length,
      }],
    });
  }

  function movePaymentMethod(index: number, delta: number) {
    if (!settings) return;
    setSettings({ ...settings, paymentMethods: moveItem(settings.paymentMethods, index, delta) });
  }

  async function chooseQrImage(index: number, file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setPaymentMethod(index, { qrImage: await readQrImage(file) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the QR image.');
    }
  }

  async function sendSmtpTest() {
    setTestError(null);
    setTestMessage(null);
    const savedSuccessfully = await save();
    if (!savedSuccessfully) return;
    setTestingSmtp(true);
    try {
      await api.post('/api/admin/settings/smtp/test', { to: testRecipient }, true);
      setTestMessage('SMTP test email sent.');
    } catch (e) {
      setTestError(e instanceof ApiError ? e.message : 'Could not send the test email.');
    } finally {
      setTestingSmtp(false);
    }
  }

  if (!settings) return <p className="form-note">Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>Site settings</h1>
      {error && <p className="form-error">{error}</p>}

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        <button className={`tab-btn ${tab === 'general' ? 'is-active' : ''}`} onClick={() => setTab('general')}>General</button>
        <button className={`tab-btn ${tab === 'pricing' ? 'is-active' : ''}`} onClick={() => setTab('pricing')}>Report pricing</button>
        <button className={`tab-btn ${tab === 'ai' ? 'is-active' : ''}`} onClick={() => setTab('ai')}>AI mechanism</button>
        <button className={`tab-btn ${tab === 'payments' ? 'is-active' : ''}`} onClick={() => setTab('payments')}>Payment methods</button>
        <button className={`tab-btn ${tab === 'smtp' ? 'is-active' : ''}`} onClick={() => setTab('smtp')}>SMTP</button>
      </div>

      {tab === 'general' && (
        <div className="panel settings-panel">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>General</h2>
          <div className="form-field"><label>Site name</label><input value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} /></div>
          <div className="form-field"><label>Tagline</label><input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></div>
          <div className="form-field"><label>Support email</label><input value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} /></div>
          <div className="form-field">
            <label><input type="checkbox" checked={settings.donationEnabled} onChange={(e) => setSettings({ ...settings, donationEnabled: e.target.checked })} style={{ marginRight: 8 }} />Show donation prompt</label>
          </div>
          <div className="form-field"><label>Donation message</label><textarea rows={3} value={settings.donationMessage} onChange={(e) => setSettings({ ...settings, donationMessage: e.target.value })} /></div>
          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Require email verification before login
            </label>
            <p className="form-note">Default is off. SMTP must be enabled and complete before this can be turned on.</p>
          </div>
        </div>
      )}

      {tab === 'pricing' && (
        <div className="panel settings-panel">
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Report pricing</h2>
          <p className="form-note" style={{ marginBottom: 16 }}>Per-category price (USD) for each paid report tier.</p>
          <table className="data-table">
            <thead><tr><th>Category</th><th>Detailed Report</th><th>Deep Insights Report</th></tr></thead>
            <tbody>
              {(['tarot', 'astrology', 'spreads'] as const).map((cat) => (
                <tr key={cat}>
                  <td>{CATEGORY_LABEL[cat]}</td>
                  <td>
                    <span style={{ marginRight: 4 }}>$</span>
                    <input type="number" step="0.01" min="0" style={{ width: 90 }} value={dollars(settings.pricing[cat].detail)} onChange={(e) => setTierPrice(cat, 'detail', e.target.value)} />
                  </td>
                  <td>
                    <span style={{ marginRight: 4 }}>$</span>
                    <input type="number" step="0.01" min="0" style={{ width: 90 }} value={dollars(settings.pricing[cat].deepInsights)} onChange={(e) => setTierPrice(cat, 'deepInsights', e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'ai' && (
        <div className="panel settings-panel">
          <div className="settings-section-heading">
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>AI mechanism</h2>
              <p className="form-note">Providers are tried in this order until one returns a usable report.</p>
            </div>
            <button className="btn btn-ghost" onClick={addEndpoint}>Add provider</button>
          </div>

          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={settings.aiMechanism.autoGenerateOnPayment}
                onChange={(e) => setSettings({
                  ...settings,
                  aiMechanism: { ...settings.aiMechanism, autoGenerateOnPayment: e.target.checked },
                })}
                style={{ marginRight: 8 }}
              />
              Auto-generate after an admin verifies Deep Insights payment
            </label>
          </div>

          <div className="settings-list">
            {settings.aiMechanism.endpoints.map((endpoint, index) => (
              <div className="settings-list-item" key={endpoint.id}>
                <div className="settings-item-heading">
                  <strong>{endpoint.name || `Provider ${index + 1}`}</strong>
                  <div className="settings-item-actions">
                    <button className="btn btn-ghost btn-compact" onClick={() => moveEndpoint(index, -1)} disabled={index === 0} aria-label={`Move ${endpoint.name} up`}>Up</button>
                    <button className="btn btn-ghost btn-compact" onClick={() => moveEndpoint(index, 1)} disabled={index === settings.aiMechanism.endpoints.length - 1} aria-label={`Move ${endpoint.name} down`}>Down</button>
                    <button
                      className="btn btn-ghost btn-compact"
                      onClick={() => setSettings({
                        ...settings,
                        aiMechanism: {
                          ...settings.aiMechanism,
                          endpoints: settings.aiMechanism.endpoints.filter((_, i) => i !== index),
                        },
                      })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="settings-grid">
                  <div className="form-field">
                    <label htmlFor={`${endpoint.id}-name`}>Provider name</label>
                    <input id={`${endpoint.id}-name`} value={endpoint.name} onChange={(e) => setEndpoint(index, { name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`${endpoint.id}-adapter`}>API format</label>
                    <select
                      id={`${endpoint.id}-adapter`}
                      value={endpoint.adapter}
                      onChange={(e) => {
                        const adapter = e.target.value as AiAdapter;
                        setEndpoint(index, {
                          adapter,
                          baseUrl: endpoint.baseUrl || DEFAULT_BASE_URL[adapter],
                        });
                      }}
                    >
                      {(Object.keys(ADAPTER_LABEL) as AiAdapter[]).map((adapter) => (
                        <option key={adapter} value={adapter}>{ADAPTER_LABEL[adapter]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor={`${endpoint.id}-model`}>Model</label>
                    <input id={`${endpoint.id}-model`} value={endpoint.model} onChange={(e) => setEndpoint(index, { model: e.target.value })} placeholder="Model identifier" />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`${endpoint.id}-base-url`}>Base URL</label>
                    <input
                      id={`${endpoint.id}-base-url`}
                      value={endpoint.baseUrl}
                      onChange={(e) => setEndpoint(index, { baseUrl: e.target.value })}
                      placeholder={DEFAULT_BASE_URL[endpoint.adapter] || 'https://provider.example.com/v1'}
                    />
                  </div>
                  <div className="form-field settings-grid-wide">
                    <label htmlFor={`${endpoint.id}-key`}>API key replacement for {endpoint.name || 'provider'}</label>
                    <input
                      id={`${endpoint.id}-key`}
                      type="password"
                      autoComplete="new-password"
                      value={endpoint.apiKey || ''}
                      onChange={(e) => setEndpoint(index, { apiKey: e.target.value })}
                      placeholder={endpoint.hasApiKey ? 'Configured - enter a new key to replace it' : 'Enter API key'}
                    />
                  </div>
                </div>
                <label className="settings-check">
                  <input type="checkbox" checked={endpoint.enabled} onChange={(e) => setEndpoint(index, { enabled: e.target.checked })} />
                  Enabled
                </label>
              </div>
            ))}
            {settings.aiMechanism.endpoints.length === 0 && (
              <p className="form-note">No AI providers configured. Deep Insights will wait for manual admin work.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="panel settings-panel">
          <div className="settings-section-heading">
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>Payment methods</h2>
              <p className="form-note">Only enabled methods with a QR image appear in the customer payment dialog.</p>
            </div>
            <button className="btn btn-ghost" onClick={addPaymentMethod}>Add payment method</button>
          </div>

          <div className="settings-list">
            {settings.paymentMethods.map((method, index) => (
              <div className="settings-list-item payment-method-item" key={method.id}>
                <div className="payment-method-editor">
                  <div className="form-field">
                    <label htmlFor={`${method.id}-name`}>Payment method name</label>
                    <input id={`${method.id}-name`} value={method.name} onChange={(e) => setPaymentMethod(index, { name: e.target.value })} />
                  </div>
                  <label className="settings-check">
                    <input type="checkbox" checked={method.enabled} onChange={(e) => setPaymentMethod(index, { enabled: e.target.checked })} />
                    Enabled
                  </label>
                  <div className="form-field">
                    <label htmlFor={`${method.id}-qr`}>QR image for {method.name}</label>
                    <input id={`${method.id}-qr`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => chooseQrImage(index, e.target.files?.[0])} />
                  </div>
                  <div className="settings-item-actions">
                    <button className="btn btn-ghost btn-compact" onClick={() => movePaymentMethod(index, -1)} disabled={index === 0} aria-label={`Move ${method.name} up`}>Up</button>
                    <button className="btn btn-ghost btn-compact" onClick={() => movePaymentMethod(index, 1)} disabled={index === settings.paymentMethods.length - 1} aria-label={`Move ${method.name} down`}>Down</button>
                    <button
                      className="btn btn-ghost btn-compact"
                      onClick={() => setSettings({
                        ...settings,
                        paymentMethods: settings.paymentMethods.filter((_, i) => i !== index),
                      })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {method.qrImage
                  ? <img className="qr-preview" src={method.qrImage} alt={`${method.name} QR code`} />
                  : <div className="qr-preview qr-preview--empty">No QR image</div>}
              </div>
            ))}
            {settings.paymentMethods.length === 0 && (
              <p className="form-note">No payment methods configured.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'smtp' && (
        <div className="panel settings-panel">
          <div className="settings-section-heading">
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>SMTP email</h2>
              <p className="form-note">Used for password recovery, verification links, and system notifications.</p>
            </div>
          </div>

          <div className="form-field">
            <label>
              <input
                type="checkbox"
                checked={settings.smtp.enabled}
                onChange={(e) => setSmtp({ enabled: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Enable SMTP email
            </label>
          </div>

          <div className="settings-grid">
            <div className="form-field">
              <label htmlFor="smtp-host">SMTP host</label>
              <input id="smtp-host" value={settings.smtp.host} onChange={(e) => setSmtp({ host: e.target.value })} placeholder="smtp.example.com" />
            </div>
            <div className="form-field">
              <label htmlFor="smtp-port">SMTP port</label>
              <input id="smtp-port" type="number" min={1} max={65535} value={settings.smtp.port} onChange={(e) => setSmtp({ port: Number(e.target.value) })} />
            </div>
            <div className="form-field">
              <label htmlFor="smtp-username">SMTP username</label>
              <input id="smtp-username" value={settings.smtp.username} onChange={(e) => setSmtp({ username: e.target.value })} autoComplete="username" />
            </div>
            <div className="form-field">
              <label htmlFor="smtp-password">SMTP password</label>
              <input
                id="smtp-password"
                type="password"
                autoComplete="new-password"
                value={settings.smtp.password || ''}
                onChange={(e) => setSmtp({ password: e.target.value })}
                placeholder={settings.smtp.hasPassword ? 'Configured - enter a new password to replace it' : 'Enter SMTP password'}
              />
            </div>
            <div className="form-field">
              <label htmlFor="smtp-from-name">From name</label>
              <input id="smtp-from-name" value={settings.smtp.fromName} onChange={(e) => setSmtp({ fromName: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="smtp-from-email">From email</label>
              <input id="smtp-from-email" type="email" value={settings.smtp.fromEmail} onChange={(e) => setSmtp({ fromEmail: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="smtp-reply-to">Reply-to email</label>
              <input id="smtp-reply-to" type="email" value={settings.smtp.replyTo} onChange={(e) => setSmtp({ replyTo: e.target.value })} />
            </div>
            <div className="form-field">
              <label htmlFor="smtp-public-url">Public site URL</label>
              <input id="smtp-public-url" type="url" value={settings.smtp.publicSiteUrl} onChange={(e) => setSmtp({ publicSiteUrl: e.target.value })} />
            </div>
          </div>

          <label className="settings-check">
            <input type="checkbox" checked={settings.smtp.secure} onChange={(e) => setSmtp({ secure: e.target.checked })} />
            Use implicit TLS (usually port 465)
          </label>

          <div className="smtp-test-block">
            <h3 style={{ fontSize: 16, marginBottom: 10 }}>Send a test email</h3>
            <p className="form-note" style={{ marginBottom: 12 }}>Settings are saved before the test is sent.</p>
            <div className="smtp-test-row">
              <div className="form-field">
                <label htmlFor="smtp-test-recipient">Test recipient</label>
                <input id="smtp-test-recipient" type="email" value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={sendSmtpTest} disabled={testingSmtp || !testRecipient}>
                {testingSmtp ? 'Sending...' : 'Send test email'}
              </button>
            </div>
            {testMessage && <p className="form-success">{testMessage}</p>}
            {testError && <p className="form-error">{testError}</p>}
          </div>
        </div>
      )}

      <div className="settings-save-row">
        <button className="btn btn-primary" onClick={save}>Save settings</button>
        {saved && <span className="form-note">Saved.</span>}
      </div>
    </div>
  );
}
