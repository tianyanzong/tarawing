'use client';

import { useState } from 'react';
import type {
  EmailTemplate,
  EmailTemplateKind,
  FreeformTemplate,
  PdfTemplate,
  PdfTemplateKind,
  SiteSettings,
  TemplateStatus,
} from '@/lib/types';

type TemplateSection = 'event' | 'freeform';

const EMAIL_KIND_LABEL: Record<EmailTemplateKind, string> = {
  email_verification: 'Email verification',
  password_reset: 'Password recovery',
  report_ready: 'Report ready',
};

const PDF_KIND_LABEL: Record<PdfTemplateKind, string> = {
  detail: 'Detailed report',
  deep_insights: 'Deep Insights report',
};

function newId(prefix: string) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${suffix}`;
}

function templateNow() {
  return new Date().toISOString();
}

function enabledLabels<T extends { kind: string; status: TemplateStatus }>(
  templates: T[],
  labels: Record<string, string>,
) {
  return [...new Set(
    templates.filter((template) => template.status === 'enabled').map((template) => labels[template.kind]),
  )];
}

export default function SettingsTemplatesPanel({
  settings,
  onChange,
}: {
  settings: SiteSettings;
  onChange: (settings: SiteSettings) => void;
}) {
  const [templateSection, setTemplateSection] = useState<TemplateSection>('event');

  function updateEmailTemplate(index: number, patch: Partial<EmailTemplate>) {
    const now = templateNow();
    const current = settings.emailTemplates[index];
    const effectivePatch = patch.kind && current.status === 'enabled'
      ? { ...patch, status: 'disabled' as const }
      : patch;
    let emailTemplates = settings.emailTemplates.map((template, currentIndex) => (
      currentIndex === index
        ? { ...template, ...effectivePatch, updatedAt: now }
        : template
    ));
    if (effectivePatch.status === 'enabled') {
      const kind = effectivePatch.kind || current.kind;
      emailTemplates = emailTemplates.map((template, currentIndex) => (
        currentIndex !== index && template.kind === kind && template.status === 'enabled'
          ? { ...template, status: 'disabled', updatedAt: now }
          : template
      ));
    }
    onChange({ ...settings, emailTemplates });
  }

  function addEmailTemplate() {
    const createdAt = templateNow();
    onChange({
      ...settings,
      emailTemplates: [{
        id: newId('eml'),
        name: 'New email template',
        kind: 'email_verification',
        status: 'disabled',
        subject: 'Verify your {{site_name}} email',
        body: 'Verify your email within {{expires_minutes}} minutes:\n{{action_url}}',
        createdAt,
        updatedAt: createdAt,
      }, ...settings.emailTemplates],
    });
  }

  function updatePdfTemplate(index: number, patch: Partial<PdfTemplate>) {
    const now = templateNow();
    const current = settings.pdfTemplates[index];
    const effectivePatch = patch.kind && current.status === 'enabled'
      ? { ...patch, status: 'disabled' as const }
      : patch;
    let pdfTemplates = settings.pdfTemplates.map((template, currentIndex) => (
      currentIndex === index
        ? { ...template, ...effectivePatch, updatedAt: now }
        : template
    ));
    if (effectivePatch.status === 'enabled') {
      const kind = effectivePatch.kind || current.kind;
      pdfTemplates = pdfTemplates.map((template, currentIndex) => (
        currentIndex !== index && template.kind === kind && template.status === 'enabled'
          ? { ...template, status: 'disabled', updatedAt: now }
          : template
      ));
    }
    onChange({ ...settings, pdfTemplates });
  }

  function addPdfTemplate() {
    const createdAt = templateNow();
    onChange({
      ...settings,
      pdfTemplates: [{
        id: newId('pdf'),
        name: 'New PDF template',
        kind: 'detail',
        status: 'disabled',
        content: [
          '{{title}}',
          'Type: {{type}}',
          'Generated: {{generated_at}}',
          'Question: {{question}}',
          '',
          '{{report_body}}',
          '',
          '{{footer}}',
        ].join('\n'),
        createdAt,
        updatedAt: createdAt,
      }, ...settings.pdfTemplates],
    });
  }

  function updateFreeformTemplate(index: number, patch: Partial<FreeformTemplate>) {
    const freeformTemplates = settings.freeformTemplates.map((template, currentIndex) => (
      currentIndex === index
        ? { ...template, ...patch, updatedAt: templateNow() }
        : template
    ));
    onChange({ ...settings, freeformTemplates });
  }

  function addFreeformTemplate() {
    const createdAt = templateNow();
    onChange({
      ...settings,
      freeformTemplates: [{
        id: newId('free'),
        name: 'New free template',
        subject: 'A message from {{site_name}}',
        body: 'Hello {{name}},\n\n',
        createdAt,
        updatedAt: createdAt,
      }, ...settings.freeformTemplates],
    });
  }

  const enabledEmailKinds = enabledLabels(settings.emailTemplates, EMAIL_KIND_LABEL);
  const enabledPdfKinds = enabledLabels(settings.pdfTemplates, PDF_KIND_LABEL);

  return (
    <div className="panel settings-panel">
      <div className="settings-tabs template-subtabs" role="tablist" aria-label="Template sections">
        <button
          className={`tab-btn ${templateSection === 'event' ? 'is-active' : ''}`}
          onClick={() => setTemplateSection('event')}
        >
          Event templates
        </button>
        <button
          className={`tab-btn ${templateSection === 'freeform' ? 'is-active' : ''}`}
          onClick={() => setTemplateSection('freeform')}
        >
          Free templates
        </button>
      </div>

      {templateSection === 'event' ? (
        <>
          <div className="settings-section-heading">
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>Email templates</h2>
              <p className="form-note">
                Only one template per email event can be enabled. Enabling a template disables the previous active one.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={addEmailTemplate}>Add email template</button>
          </div>
          <p className="form-note template-help">
            Placeholders: {'{{site_name}}'}, {'{{email}}'}, {'{{action_url}}'}, {'{{expires_minutes}}'},
            {' '}{'{{reading_type}}'}, {'{{question}}'}, {'{{report_label}}'}, {'{{workspace_url}}'}
          </p>
          {enabledEmailKinds.length === 0 && <p className="form-note">Using built-in defaults for all system emails.</p>}

          <div className="settings-list">
            {settings.emailTemplates.map((template, index) => (
              <div className="settings-list-item" key={template.id}>
                <div className="settings-item-heading">
                  <strong>{template.name || `Email template ${index + 1}`}</strong>
                  <div className="settings-item-actions">
                    <span className={`tag ${template.status === 'enabled' ? 'tag--gold' : ''}`}>{template.status}</span>
                    <button
                      className="btn btn-ghost btn-compact"
                      disabled={template.status === 'enabled'}
                      title={template.status === 'enabled' ? 'Enable another template for this event before deleting this one.' : undefined}
                      onClick={() => onChange({
                        ...settings,
                        emailTemplates: settings.emailTemplates.filter((_, currentIndex) => currentIndex !== index),
                      })}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="settings-grid">
                  <div className="form-field">
                    <label htmlFor={`${template.id}-name`}>Template name</label>
                    <input
                      id={`${template.id}-name`}
                      value={template.name}
                      onChange={(event) => updateEmailTemplate(index, { name: event.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`${template.id}-kind`}>Email type</label>
                    <select
                      id={`${template.id}-kind`}
                      value={template.kind}
                      onChange={(event) => updateEmailTemplate(index, { kind: event.target.value as EmailTemplateKind })}
                    >
                      {Object.entries(EMAIL_KIND_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor={`${template.id}-status`}>Status</label>
                    <select
                      id={`${template.id}-status`}
                      value={template.status}
                      onChange={(event) => updateEmailTemplate(index, { status: event.target.value as TemplateStatus })}
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                  <div className="form-field settings-grid-wide">
                    <label htmlFor={`${template.id}-subject`}>Subject</label>
                    <input
                      id={`${template.id}-subject`}
                      value={template.subject}
                      onChange={(event) => updateEmailTemplate(index, { subject: event.target.value })}
                    />
                  </div>
                  <div className="form-field settings-grid-wide">
                    <label htmlFor={`${template.id}-body`}>Message</label>
                    <textarea
                      id={`${template.id}-body`}
                      rows={8}
                      value={template.body}
                      onChange={(event) => updateEmailTemplate(index, { body: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
            {settings.emailTemplates.length === 0 && (
              <p className="form-note">No custom email templates configured.</p>
            )}
          </div>

          <div className="settings-section-heading template-section-heading">
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>PDF report templates</h2>
              <p className="form-note">
                Only one template per report tier can be enabled. Otherwise, the code default is used.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={addPdfTemplate}>Add PDF template</button>
          </div>
          <p className="form-note template-help">
            Placeholders: {'{{title}}'}, {'{{type}}'}, {'{{generated_at}}'}, {'{{question}}'},
            {' '}{'{{category}}'}, {'{{report_body}}'}, {'{{footer}}'}
          </p>
          {enabledPdfKinds.length === 0 && <p className="form-note">Using built-in defaults for both PDF report tiers.</p>}

          <div className="settings-list">
            {settings.pdfTemplates.map((template, index) => (
              <div className="settings-list-item" key={template.id}>
                <div className="settings-item-heading">
                  <strong>{template.name || `PDF template ${index + 1}`}</strong>
                  <div className="settings-item-actions">
                    <span className={`tag ${template.status === 'enabled' ? 'tag--gold' : ''}`}>{template.status}</span>
                    <button
                      className="btn btn-ghost btn-compact"
                      disabled={template.status === 'enabled'}
                      title={template.status === 'enabled' ? 'Enable another template for this report tier before deleting this one.' : undefined}
                      onClick={() => onChange({
                        ...settings,
                        pdfTemplates: settings.pdfTemplates.filter((_, currentIndex) => currentIndex !== index),
                      })}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="settings-grid">
                  <div className="form-field">
                    <label htmlFor={`${template.id}-name`}>Template name</label>
                    <input
                      id={`${template.id}-name`}
                      value={template.name}
                      onChange={(event) => updatePdfTemplate(index, { name: event.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor={`${template.id}-kind`}>Report tier</label>
                    <select
                      id={`${template.id}-kind`}
                      value={template.kind}
                      onChange={(event) => updatePdfTemplate(index, { kind: event.target.value as PdfTemplateKind })}
                    >
                      {Object.entries(PDF_KIND_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor={`${template.id}-status`}>Status</label>
                    <select
                      id={`${template.id}-status`}
                      value={template.status}
                      onChange={(event) => updatePdfTemplate(index, { status: event.target.value as TemplateStatus })}
                    >
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                  <div className="form-field settings-grid-wide">
                    <label htmlFor={`${template.id}-content`}>Template content</label>
                    <textarea
                      id={`${template.id}-content`}
                      rows={12}
                      value={template.content}
                      onChange={(event) => updatePdfTemplate(index, { content: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
            {settings.pdfTemplates.length === 0 && (
              <p className="form-note">No custom PDF templates configured.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="settings-section-heading">
            <div>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>Free templates</h2>
              <p className="form-note">
                Reusable messages for contacting individual users. Free templates are not tied to a system event.
              </p>
            </div>
            <button className="btn btn-ghost" onClick={addFreeformTemplate}>Add free template</button>
          </div>
          <p className="form-note template-help">
            Placeholders: {'{{site_name}}'}, {'{{name}}'}, {'{{email}}'}
          </p>

          <div className="settings-list">
            {settings.freeformTemplates.map((template, index) => (
              <div className="settings-list-item" key={template.id}>
                <div className="settings-item-heading">
                  <strong>{template.name || `Free template ${index + 1}`}</strong>
                  <button
                    className="btn btn-ghost btn-compact"
                    onClick={() => onChange({
                      ...settings,
                      freeformTemplates: settings.freeformTemplates.filter((_, currentIndex) => currentIndex !== index),
                    })}
                  >
                    Delete
                  </button>
                </div>
                <div className="settings-grid">
                  <div className="form-field settings-grid-wide">
                    <label htmlFor={`${template.id}-free-name`}>Template name</label>
                    <input
                      id={`${template.id}-free-name`}
                      value={template.name}
                      onChange={(event) => updateFreeformTemplate(index, { name: event.target.value })}
                    />
                  </div>
                  <div className="form-field settings-grid-wide">
                    <label htmlFor={`${template.id}-free-subject`}>Subject</label>
                    <input
                      id={`${template.id}-free-subject`}
                      value={template.subject}
                      onChange={(event) => updateFreeformTemplate(index, { subject: event.target.value })}
                    />
                  </div>
                  <div className="form-field settings-grid-wide">
                    <label htmlFor={`${template.id}-free-body`}>Message</label>
                    <textarea
                      id={`${template.id}-free-body`}
                      rows={8}
                      value={template.body}
                      onChange={(event) => updateFreeformTemplate(index, { body: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
            {settings.freeformTemplates.length === 0 && (
              <p className="form-note">No free templates configured.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
