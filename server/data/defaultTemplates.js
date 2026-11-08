'use strict';

const TEMPLATE_SEED_VERSION = 1;

const DEFAULT_EMAIL_TEMPLATES = {
  email_verification: {
    subject: 'Verify your {{site_name}} email',
    body: [
      'Please verify the email address for your {{site_name}} account.',
      '',
      'Account: {{email}}',
      '',
      'Verify within {{expires_minutes}} minutes:',
      '{{action_url}}',
      '',
      'If you did not create this account, you can ignore this email.',
    ].join('\n'),
  },
  password_reset: {
    subject: 'Reset your {{site_name}} password',
    body: [
      'We received a request to reset your {{site_name}} password.',
      '',
      'Account: {{email}}',
      '',
      'Reset it within {{expires_minutes}} minutes:',
      '{{action_url}}',
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  },
  report_ready: {
    subject: 'Your {{site_name}} {{report_label}} is ready',
    body: [
      'Your {{report_label}} for {{reading_type}} is ready.',
      '',
      'Question: {{question}}',
      '',
      'Open your workspace to read and download it:',
      '{{workspace_url}}',
    ].join('\n'),
  },
};

const DEFAULT_PDF_TEMPLATE_CONTENT = [
  '{{title}}',
  'Type: {{type}}',
  'Generated: {{generated_at}}',
  'Question: {{question}}',
  '',
  '{{report_body}}',
  '',
  '{{footer}}',
].join('\n');

const SYSTEM_EMAIL_TEMPLATE_SEEDS = [
  {
    id: 'eml_system_email_verification',
    name: 'Email verification',
    kind: 'email_verification',
    ...DEFAULT_EMAIL_TEMPLATES.email_verification,
  },
  {
    id: 'eml_system_password_reset',
    name: 'Password recovery',
    kind: 'password_reset',
    ...DEFAULT_EMAIL_TEMPLATES.password_reset,
  },
  {
    id: 'eml_system_report_ready',
    name: 'Report ready',
    kind: 'report_ready',
    ...DEFAULT_EMAIL_TEMPLATES.report_ready,
  },
];

const SYSTEM_PDF_TEMPLATE_SEEDS = [
  {
    id: 'pdf_system_detailed_report',
    name: 'Detailed report',
    kind: 'detail',
    content: DEFAULT_PDF_TEMPLATE_CONTENT,
  },
  {
    id: 'pdf_system_deep_insights',
    name: 'Deep Insights report',
    kind: 'deep_insights',
    content: DEFAULT_PDF_TEMPLATE_CONTENT,
  },
];

function seededEmailTemplates(timestamp) {
  return SYSTEM_EMAIL_TEMPLATE_SEEDS.map((template) => ({
    ...template,
    status: 'enabled',
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

function seededPdfTemplates(timestamp) {
  return SYSTEM_PDF_TEMPLATE_SEEDS.map((template) => ({
    ...template,
    status: 'enabled',
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

module.exports = {
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_PDF_TEMPLATE_CONTENT,
  SYSTEM_EMAIL_TEMPLATE_SEEDS,
  SYSTEM_PDF_TEMPLATE_SEEDS,
  TEMPLATE_SEED_VERSION,
  seededEmailTemplates,
  seededPdfTemplates,
};
